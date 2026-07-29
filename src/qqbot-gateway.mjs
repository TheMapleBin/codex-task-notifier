const TOKEN_ENDPOINT = "https://bots.qq.com/app/getAppAccessToken";
const GATEWAY_ENDPOINT = "https://api.sgroup.qq.com/gateway";

// The official "GROUP_AND_C2C_EVENT" intent.  This is deliberately the only
// intent we request: the notifier never needs guild, group, or message bodies.
export const GROUP_AND_C2C_INTENT = 1 << 25;

function failure(code, { retryable = true } = {}) {
  const error = new Error(code);
  error.code = code;
  error.retryable = retryable;
  return error;
}

function required(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw failure("QQBOT_GATEWAY_CONFIG_INVALID", { retryable: false });
  }
  return value.trim();
}

function safeCode(error, fallback = "QQBOT_GATEWAY_FAILED") {
  return typeof error?.code === "string" && /^QQBOT_GATEWAY_[A-Z0-9_]{1,64}$/.test(error.code)
    ? error.code
    : fallback;
}

function responseFailure(operation, response) {
  const status = Number(response?.status);
  const prefix = `QQBOT_GATEWAY_${operation}_`;
  if (status === 401 || status === 403) return failure(`${prefix}AUTH_FAILED`, { retryable: false });
  if (status === 429) return failure(`${prefix}RATE_LIMITED`);
  if (status >= 500 && status <= 599) return failure(`${prefix}UPSTREAM_UNAVAILABLE`);
  if (status >= 400 && status <= 499) return failure(`${prefix}REJECTED`, { retryable: false });
  return failure(`${prefix}PROTOCOL_ERROR`);
}

function closeFailure(code) {
  if (code === 4004) return failure("QQBOT_GATEWAY_AUTH_FAILED", { retryable: false });
  if (code === 4008) return failure("QQBOT_GATEWAY_RATE_LIMITED");
  if (code === 4914 || code === 4915) return failure("QQBOT_GATEWAY_INTENT_NOT_ENABLED", { retryable: false });
  return failure("QQBOT_GATEWAY_CONNECTION_CLOSED");
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
      if (controller.signal.aborted || error?.name === "AbortError") {
        throw failure(`QQBOT_GATEWAY_${operation}_TIMEOUT`);
      }
      throw failure(`QQBOT_GATEWAY_${operation}_CONNECTION_FAILED`);
    }
    if (!response?.ok) throw responseFailure(operation, response);
    try {
      const payload = await response.json();
      if (!payload || typeof payload !== "object") throw new Error("invalid");
      return payload;
    } catch {
      throw failure(`QQBOT_GATEWAY_${operation}_PROTOCOL_ERROR`);
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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export function createQQBotGateway({
  credentials,
  fetchImpl = globalThis.fetch,
  WebSocketImpl = globalThis.WebSocket,
  onStatus = async () => {},
  now = () => Date.now(),
  sleepImpl = sleep,
  requestTimeoutMs = 30_000,
  connectTimeoutMs = 30_000,
  reconnectBaseMs = 1_000,
  reconnectMaxMs = 60_000
} = {}) {
  if (typeof credentials !== "function") throw new Error("QQ Bot Gateway credentials provider is required.");
  if (typeof fetchImpl !== "function") throw new Error("QQ Bot Gateway requires fetch support.");
  if (typeof WebSocketImpl !== "function") throw new Error("QQ Bot Gateway requires WebSocket support.");

  let stopped = false;
  let runPromise = null;
  let socket = null;
  let finishConnection = null;
  let stopBackoff = null;
  let sequence = null;
  let activeMessaging = "unknown";
  let state = "stopped";
  let lastCode = null;
  const onlineWaiters = new Set();

  function resolveOnlineWaiters(error = null) {
    for (const waiter of onlineWaiters) {
      clearTimeout(waiter.timer);
      if (error) waiter.reject(error);
      else waiter.resolve();
    }
    onlineWaiters.clear();
  }

  async function report(nextState, code = null) {
    state = nextState;
    lastCode = code && /^QQBOT_GATEWAY_[A-Z0-9_]{1,64}$/.test(code) ? code : null;
    if (state === "online") resolveOnlineWaiters();
    if (state === "blocked") {
      resolveOnlineWaiters(failure(lastCode || "QQBOT_GATEWAY_BLOCKED", { retryable: false }));
    }
    const status = Object.freeze({
      schemaVersion: 1,
      state,
      activeMessaging,
      updatedAt: new Date(now()).toISOString(),
      code: lastCode
    });
    try {
      await onStatus(status);
    } catch {
      // Status persistence is diagnostic only. It must never take the bot offline.
    }
  }

  async function currentCredentials() {
    let configured;
    try {
      configured = await credentials();
    } catch {
      throw failure("QQBOT_GATEWAY_CONFIG_INVALID", { retryable: false });
    }
    return Object.freeze({
      appId: required(configured?.appId),
      appSecret: required(configured?.appSecret)
    });
  }

  async function gatewayConnection() {
    const configured = await currentCredentials();
    const tokenPayload = await requestJson(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appId: configured.appId, clientSecret: configured.appSecret })
    }, { fetchImpl, timeoutMs: requestTimeoutMs, operation: "TOKEN" });
    if (typeof tokenPayload.access_token !== "string" || !tokenPayload.access_token) {
      throw failure("QQBOT_GATEWAY_TOKEN_PROTOCOL_ERROR");
    }
    const accessToken = tokenPayload.access_token;
    const gatewayPayload = await requestJson(GATEWAY_ENDPOINT, {
      method: "GET",
      headers: { authorization: `QQBot ${accessToken}` }
    }, { fetchImpl, timeoutMs: requestTimeoutMs, operation: "GATEWAY" });
    if (typeof gatewayPayload.url !== "string" || !gatewayPayload.url.startsWith("wss://")) {
      throw failure("QQBOT_GATEWAY_URL_PROTOCOL_ERROR");
    }
    if (stopped) return;

    return new Promise((resolve, reject) => {
      let settled = false;
      let identified = false;
      let ready = false;
      let heartbeat = null;
      let handshakeTimeout = null;
      const openState = WebSocketImpl.OPEN ?? 1;

      const cleanup = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (handshakeTimeout) clearTimeout(handshakeTimeout);
        heartbeat = null;
        handshakeTimeout = null;
        finishConnection = null;
        socket = null;
      };
      const finish = (error = null) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve();
      };
      const fail = (error) => {
        try { socket?.close?.(); } catch { /* best effort only */ }
        finish(error);
      };
      const startHeartbeat = (intervalMs) => {
        const interval = Math.min(120_000, Math.max(1_000, Number(intervalMs) || 0));
        if (!interval) {
          fail(failure("QQBOT_GATEWAY_HEARTBEAT_PROTOCOL_ERROR"));
          return;
        }
        heartbeat = setInterval(() => {
          if (socket?.readyState !== openState) {
            fail(failure("QQBOT_GATEWAY_CONNECTION_CLOSED"));
            return;
          }
          try {
            socket.send(JSON.stringify({ op: 1, d: sequence }));
          } catch {
            fail(failure("QQBOT_GATEWAY_CONNECTION_FAILED"));
          }
        }, interval);
      };

      try {
        socket = new WebSocketImpl(gatewayPayload.url);
        finishConnection = finish;
        handshakeTimeout = setTimeout(() => fail(failure("QQBOT_GATEWAY_READY_TIMEOUT")), connectTimeoutMs);
        socket.addEventListener("message", async ({ data }) => {
          if (settled) return;
          let payload;
          try {
            payload = JSON.parse(await socketMessageText(data));
          } catch {
            fail(failure("QQBOT_GATEWAY_PROTOCOL_ERROR"));
            return;
          }
          if (!payload || typeof payload !== "object") {
            fail(failure("QQBOT_GATEWAY_PROTOCOL_ERROR"));
            return;
          }
          if (Number.isInteger(payload.s)) sequence = payload.s;
          if (payload.op === 10) {
            if (identified) {
              fail(failure("QQBOT_GATEWAY_PROTOCOL_ERROR"));
              return;
            }
            identified = true;
            try {
              socket.send(JSON.stringify({
                op: 2,
                d: { token: `QQBot ${accessToken}`, intents: GROUP_AND_C2C_INTENT, shard: [0, 1] }
              }));
            } catch {
              fail(failure("QQBOT_GATEWAY_CONNECTION_FAILED"));
              return;
            }
            startHeartbeat(payload?.d?.heartbeat_interval);
            return;
          }
          if (payload.op === 7 || payload.op === 9) {
            fail(failure("QQBOT_GATEWAY_RECONNECT_REQUESTED"));
            return;
          }
          if (payload.op !== 0) return;
          if (payload.t === "READY") {
            if (!identified || ready) {
              fail(failure("QQBOT_GATEWAY_PROTOCOL_ERROR"));
              return;
            }
            ready = true;
            clearTimeout(handshakeTimeout);
            handshakeTimeout = null;
            await report("online");
            return;
          }
          if (!ready) return;
          if (payload.t === "C2C_MSG_RECEIVE") {
            activeMessaging = "allowed";
            await report("online");
          } else if (payload.t === "C2C_MSG_REJECT") {
            activeMessaging = "rejected";
            await report("online");
          }
        });
        socket.addEventListener("error", () => fail(failure("QQBOT_GATEWAY_CONNECTION_FAILED")));
        socket.addEventListener("close", ({ code } = {}) => finish(stopped ? null : closeFailure(code)));
      } catch {
        finish(failure("QQBOT_GATEWAY_CONNECTION_FAILED"));
      }
    });
  }

  async function waitBackoff(milliseconds) {
    const wake = deferred();
    stopBackoff = wake.resolve;
    try {
      await Promise.race([sleepImpl(milliseconds), wake.promise]);
    } finally {
      if (stopBackoff === wake.resolve) stopBackoff = null;
    }
  }

  async function run() {
    if (runPromise) return runPromise;
    stopped = false;
    runPromise = (async () => {
      let attempts = 0;
      await report("starting");
      while (!stopped) {
        try {
          await report("connecting");
          await gatewayConnection();
          attempts = 0;
        } catch (error) {
          if (stopped) break;
          const code = safeCode(error);
          if (error?.retryable === false) {
            await report("blocked", code);
            return Object.freeze({ state: "blocked", code });
          }
          attempts += 1;
          await report("backoff", code);
          const delay = Math.min(reconnectMaxMs, reconnectBaseMs * (2 ** Math.min(attempts - 1, 16)));
          await waitBackoff(delay);
        }
      }
      resolveOnlineWaiters(failure("QQBOT_GATEWAY_STOPPED"));
      await report("stopped");
      return Object.freeze({ state: "stopped", code: null });
    })();
    try {
      return await runPromise;
    } finally {
      runPromise = null;
    }
  }

  function waitUntilOnline({ timeoutMs = connectTimeoutMs } = {}) {
    if (state === "online") return Promise.resolve();
    if (state === "blocked") return Promise.reject(failure(lastCode || "QQBOT_GATEWAY_BLOCKED", { retryable: false }));
    if (!runPromise || stopped) return Promise.reject(failure("QQBOT_GATEWAY_NOT_RUNNING"));
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        onlineWaiters.delete(waiter);
        reject(failure("QQBOT_GATEWAY_READY_TIMEOUT"));
      }, timeoutMs);
      waiter.timer.unref?.();
      onlineWaiters.add(waiter);
    });
  }

  async function setActiveMessaging(value) {
    if (value !== "allowed" && value !== "rejected") throw new Error("QQ Bot active-message state is invalid.");
    activeMessaging = value;
    await report(state, lastCode);
  }

  function stop() {
    stopped = true;
    stopBackoff?.();
    try { socket?.close?.(); } catch { /* best effort only */ }
    finishConnection?.();
    resolveOnlineWaiters(failure("QQBOT_GATEWAY_STOPPED"));
  }

  return Object.freeze({
    run,
    stop,
    waitUntilOnline,
    setActiveMessaging,
    get state() { return state; },
    get activeMessaging() { return activeMessaging; }
  });
}
