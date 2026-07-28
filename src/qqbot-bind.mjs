const TOKEN_ENDPOINT = "https://bots.qq.com/app/getAppAccessToken";
const GATEWAY_ENDPOINT = "https://api.sgroup.qq.com/gateway";
const GROUP_AND_C2C_INTENT = 1 << 25;

function failure(code, { retryable = true } = {}) {
  const error = new Error(code);
  error.code = code;
  error.retryable = retryable;
  return error;
}

function required(value, name) {
  if (typeof value !== "string" || !value.trim()) throw failure(`QQBOT_BIND_${name}_REQUIRED`, { retryable: false });
  return value.trim();
}

function responseFailure(operation, response) {
  const status = Number(response?.status);
  const prefix = `QQBOT_BIND_${operation}_`;
  if (status === 401 || status === 403) return failure(`${prefix}AUTH_FAILED`, { retryable: false });
  if (status === 429) return failure(`${prefix}RATE_LIMITED`);
  if (status >= 500 && status <= 599) return failure(`${prefix}UPSTREAM_UNAVAILABLE`);
  if (status >= 400 && status <= 499) return failure(`${prefix}REJECTED`, { retryable: false });
  return failure(`${prefix}PROTOCOL_ERROR`);
}

function closeFailure(code) {
  if (code === 4004) return failure("QQBOT_BIND_AUTH_FAILED", { retryable: false });
  if (code === 4008) return failure("QQBOT_BIND_RATE_LIMITED");
  if (code === 4914 || code === 4915) return failure("QQBOT_BIND_INTENT_NOT_ENABLED", { retryable: false });
  return failure("QQBOT_BIND_CONNECTION_CLOSED");
}

async function requestJson(url, options, { fetchImpl, timeoutMs, operation }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    let response;
    try {
      response = await fetchImpl(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError") throw failure(`QQBOT_BIND_${operation}_TIMEOUT`);
      throw failure(`QQBOT_BIND_${operation}_CONNECTION_FAILED`);
    }
    if (!response?.ok) throw responseFailure(operation, response);
    try {
      const payload = await response.json();
      if (!payload || typeof payload !== "object") throw new Error("invalid");
      return payload;
    } catch {
      throw failure(`QQBOT_BIND_${operation}_PROTOCOL_ERROR`);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function socketMessageText(data) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  if (typeof data?.text === "function") return data.text();
  return "";
}

export async function bindQQBot({ appId, appSecret }, {
  fetchImpl = globalThis.fetch,
  WebSocketImpl = globalThis.WebSocket,
  timeoutMs = 300_000,
  requestTimeoutMs = 30_000,
  onReady = () => {}
} = {}) {
  if (typeof fetchImpl !== "function") throw failure("QQBOT_BIND_FETCH_UNAVAILABLE");
  if (typeof WebSocketImpl !== "function") throw failure("QQBOT_BIND_WEBSOCKET_UNAVAILABLE");
  const activeAppId = required(appId, "APP_ID");
  const activeAppSecret = required(appSecret, "APP_SECRET");
  const tokenPayload = await requestJson(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appId: activeAppId, clientSecret: activeAppSecret })
  }, { fetchImpl, timeoutMs: requestTimeoutMs, operation: "TOKEN" });
  if (typeof tokenPayload.access_token !== "string" || !tokenPayload.access_token) {
    throw failure("QQBOT_BIND_TOKEN_PROTOCOL_ERROR");
  }
  const accessToken = tokenPayload.access_token;
  const gatewayPayload = await requestJson(GATEWAY_ENDPOINT, {
    method: "GET",
    headers: { authorization: `QQBot ${accessToken}` }
  }, { fetchImpl, timeoutMs: requestTimeoutMs, operation: "GATEWAY" });
  if (typeof gatewayPayload.url !== "string" || !gatewayPayload.url.startsWith("wss://")) {
    throw failure("QQBOT_BIND_GATEWAY_PROTOCOL_ERROR");
  }

  return new Promise((resolve, reject) => {
    let socket = null;
    let settled = false;
    let heartbeat = null;
    let timeout = null;
    let lastSequence = null;

    const finish = (error, openId = null) => {
      if (settled) return;
      settled = true;
      if (heartbeat) clearInterval(heartbeat);
      if (timeout) clearTimeout(timeout);
      try { socket?.close?.(); } catch { /* best effort only */ }
      if (error) reject(error);
      else resolve(openId);
    };

    const startHeartbeat = (intervalMs) => {
      const interval = Math.min(120_000, Math.max(1_000, Number(intervalMs) || 0));
      if (!interval) return;
      heartbeat = setInterval(() => {
        if (socket?.readyState === WebSocketImpl.OPEN) {
          try { socket.send(JSON.stringify({ op: 1, d: lastSequence })); } catch { finish(failure("QQBOT_BIND_CONNECTION_FAILED")); }
        }
      }, interval);
      heartbeat.unref?.();
    };

    timeout = setTimeout(() => finish(failure("QQBOT_BIND_TIMEOUT")), timeoutMs);
    timeout.unref?.();
    try {
      socket = new WebSocketImpl(gatewayPayload.url);
      socket.addEventListener("message", async ({ data }) => {
        if (settled) return;
        try {
          const text = await socketMessageText(data);
          const payload = JSON.parse(text);
          if (Number.isInteger(payload?.s)) lastSequence = payload.s;
          if (payload?.op === 10) {
            socket.send(JSON.stringify({
              op: 2,
              d: { token: `QQBot ${accessToken}`, intents: GROUP_AND_C2C_INTENT, shard: [0, 1] }
            }));
            startHeartbeat(payload?.d?.heartbeat_interval);
            try { onReady(); } catch { /* status output must not break binding */ }
            return;
          }
          if (payload?.op === 0 && payload?.t === "C2C_MESSAGE_CREATE") {
            const openId = payload?.d?.author?.user_openid;
            if (typeof openId !== "string" || !openId || openId.length > 8_192) {
              finish(failure("QQBOT_BIND_TARGET_INVALID", { retryable: false }));
              return;
            }
            finish(null, openId);
          }
        } catch {
          finish(failure("QQBOT_BIND_PROTOCOL_ERROR"));
        }
      });
      socket.addEventListener("error", () => finish(failure("QQBOT_BIND_CONNECTION_FAILED")));
      socket.addEventListener("close", ({ code } = {}) => finish(closeFailure(code)));
    } catch {
      finish(failure("QQBOT_BIND_CONNECTION_FAILED"));
    }
  });
}
