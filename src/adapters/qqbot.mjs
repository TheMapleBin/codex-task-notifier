import { formatEventForDelivery } from "../event.mjs";
import { createQQBotConfigStore } from "../qqbot-config.mjs";
import { createQQBotGateway } from "../qqbot-gateway.mjs";
import { createQQBotGatewayStatusStore } from "../qqbot-gateway-status.mjs";

const TOKEN_ENDPOINT = "https://bots.qq.com/app/getAppAccessToken";
const API_BASE_URL = "https://api.sgroup.qq.com";
const TOKEN_REFRESH_SKEW_MS = 60_000;

function required(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`QQ Bot requires ${name}.`);
  }
  return value.trim();
}

function failure(code, { retryable = true, retryAfterMs = null } = {}) {
  const error = new Error(code);
  error.code = code;
  error.retryable = retryable;
  if (Number.isInteger(retryAfterMs)) error.retryAfterMs = retryAfterMs;
  return error;
}

function retryAfterMs(response) {
  const raw = response?.headers?.get?.("retry-after");
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.min(3_600_000, Math.max(1_000, Math.round(seconds * 1_000)));
}

function statusFailure(operation, response) {
  const status = Number(response?.status);
  const prefix = `QQBOT_${operation}_`;
  if (status === 429) return failure(`${prefix}RATE_LIMITED`, { retryAfterMs: retryAfterMs(response) });
  if (status === 401 || status === 403) return failure(`${prefix}AUTH_FAILED`, { retryable: false });
  if (status >= 500 && status <= 599) return failure(`${prefix}UPSTREAM_UNAVAILABLE`);
  if (status >= 400 && status <= 499) return failure(`${prefix}REJECTED`, { retryable: false });
  return failure(`${prefix}PROTOCOL_ERROR`);
}

function businessFailure(operation, payload) {
  const code = payload?.code ?? payload?.err_code;
  if (code == null || code === 0 || code === "0") return null;
  const numeric = Number(code);
  if (numeric === 429) return failure(`QQBOT_${operation}_RATE_LIMITED`);
  if (numeric === 401 || numeric === 403) return failure(`QQBOT_${operation}_AUTH_FAILED`, { retryable: false });
  if (numeric === 40034105) return failure(`QQBOT_${operation}_ACTIVE_MESSAGING_DENIED`, { retryable: false });
  if (numeric === 40054013) return failure(`QQBOT_${operation}_USER_REJECTED`, { retryable: false });
  if (numeric === 40054016) return failure(`QQBOT_${operation}_BOT_OFFLINE`);
  return failure(`QQBOT_${operation}_REJECTED`, { retryable: false });
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
        throw failure(`QQBOT_${operation}_TIMEOUT`);
      }
      throw failure(`QQBOT_${operation}_CONNECTION_FAILED`);
    }
    if (!response?.ok) throw statusFailure(operation, response);
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw failure(`QQBOT_${operation}_PROTOCOL_ERROR`);
    }
    if (!payload || typeof payload !== "object") throw failure(`QQBOT_${operation}_PROTOCOL_ERROR`);
    const businessError = businessFailure(operation, payload);
    if (businessError) throw businessError;
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export function createQQBotAdapter(config, {
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  credentialStore = null,
  WebSocketImpl = globalThis.WebSocket,
  gatewayFactory = createQQBotGateway,
  gatewayStatusStore = null
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("QQ Bot delivery requires fetch support.");
  const configured = config.qqbot || {};
  const timeoutMs = Number.isInteger(configured.timeoutMs) ? configured.timeoutMs : 45_000;
  let settings = null;
  let settingsPromise = null;
  let accessToken = null;
  let expiresAt = 0;
  let tokenPromise = null;
  let gateway = null;
  let gatewayRun = null;
  let gatewayStart = null;
  let gatewayStatus = null;
  let resolvedGatewayStatusStore = gatewayStatusStore;

  function normalizeSettings(value) {
    return Object.freeze({
      appId: required(value?.appId, "AppID"),
      appSecret: required(value?.appSecret, "AppSecret"),
      openId: required(value?.openId, "recipient OpenID")
    });
  }

  async function getSettings() {
    if (settings) return settings;
    if (!settingsPromise) {
      settingsPromise = (async () => {
        if (configured.appId || configured.appSecret || configured.openId) {
          return normalizeSettings(configured);
        }
        const store = credentialStore || createQQBotConfigStore({
          configPath: configured.configPath,
          powershell: configured.powershell
        });
        return normalizeSettings(await store.read());
      })();
    }
    settings = await settingsPromise;
    return settings;
  }

  async function getAccessToken({ force = false } = {}) {
    if (!force && accessToken && now() < expiresAt - TOKEN_REFRESH_SKEW_MS) return accessToken;
    if (!force && tokenPromise) return tokenPromise;
    if (force) {
      accessToken = null;
      expiresAt = 0;
    }
    const pending = (async () => {
      const active = await getSettings();
      const payload = await requestJson(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appId: active.appId, clientSecret: active.appSecret })
      }, { fetchImpl, timeoutMs, operation: "TOKEN" });
      if (typeof payload.access_token !== "string" || !payload.access_token) {
        throw failure("QQBOT_TOKEN_PROTOCOL_ERROR");
      }
      accessToken = payload.access_token;
      expiresAt = now() + Math.max(60, Number(payload.expires_in) || 7_200) * 1_000;
      return accessToken;
    })();
    tokenPromise = pending;
    try {
      return await pending;
    } finally {
      if (tokenPromise === pending) tokenPromise = null;
    }
  }

  async function sendWithToken(token, event) {
    const active = await getSettings();
    const endpoint = `${API_BASE_URL}/v2/users/${encodeURIComponent(active.openId)}/messages`;
    return requestJson(endpoint, {
      method: "POST",
      headers: {
        authorization: `QQBot ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ content: formatEventForDelivery(event), msg_type: 0 })
    }, { fetchImpl, timeoutMs, operation: "SEND" });
  }

  async function recordGatewayStatus(status) {
    gatewayStatus = status;
    if (status.state !== "online") gatewayStart = null;
    if (!resolvedGatewayStatusStore && configured.gatewayStatusPath) {
      resolvedGatewayStatusStore = createQQBotGatewayStatusStore({ statusPath: configured.gatewayStatusPath });
    }
    if (resolvedGatewayStatusStore) await resolvedGatewayStatusStore.write(status);
  }

  function ensureGatewayStarted() {
    if (!gateway) {
      gateway = gatewayFactory({
        credentials: async () => {
          const active = await getSettings();
          return { appId: active.appId, appSecret: active.appSecret };
        },
        fetchImpl,
        WebSocketImpl,
        onStatus: recordGatewayStatus,
        requestTimeoutMs: timeoutMs,
        connectTimeoutMs: configured.gatewayReadyTimeoutMs
      });
    }
    if (!gatewayRun) {
      gatewayRun = gateway.run();
      // A blocked Gateway is surfaced by waitUntilOnline() and persisted as a
      // sanitized status; do not let an unobserved background promise escape.
      gatewayRun.catch(() => {});
    }
  }

  async function ensureGatewayOnline() {
    ensureGatewayStarted();
    if (gateway.state !== "online" || !gatewayStart) {
      gatewayStart = gateway.waitUntilOnline({ timeoutMs: configured.gatewayReadyTimeoutMs });
    }
    await gatewayStart;
    if (gateway.activeMessaging === "rejected") {
      throw failure("QQBOT_SEND_ACTIVE_MESSAGING_REJECTED", { retryable: false });
    }
  }

  return Object.freeze({
    name: "qqbot-direct",
    async start() {
      await getSettings();
      // The session watcher must stay able to capture and persist terminal
      // events during a temporary QQ outage. Sending itself waits for READY
      // and is retried by the durable outbox.
      ensureGatewayStarted();
    },
    async send(event) {
      await ensureGatewayOnline();
      let token = await getAccessToken();
      let payload;
      try {
        payload = await sendWithToken(token, event);
      } catch (error) {
        if (error?.code === "QQBOT_SEND_ACTIVE_MESSAGING_DENIED" || error?.code === "QQBOT_SEND_USER_REJECTED") {
          await gateway?.setActiveMessaging("rejected");
          throw error;
        }
        if (error?.code !== "QQBOT_SEND_AUTH_FAILED") throw error;
        token = await getAccessToken({ force: true });
        try {
          payload = await sendWithToken(token, event);
        } catch (retryError) {
          if (retryError?.code === "QQBOT_SEND_ACTIVE_MESSAGING_DENIED" || retryError?.code === "QQBOT_SEND_USER_REJECTED") {
            await gateway?.setActiveMessaging("rejected");
          }
          throw retryError;
        }
      }
      const messageId = typeof payload?.id === "string" && payload.id ? payload.id : null;
      if (!messageId) throw failure("QQBOT_SEND_PROTOCOL_ERROR");
      await gateway?.setActiveMessaging("allowed");
      return { transport: "qqbot-direct", exitCode: 0, messageId };
    },
    async close() {
      gateway?.stop();
      try {
        await gatewayRun;
      } finally {
        gateway = null;
        gatewayRun = null;
        gatewayStart = null;
        gatewayStatus = null;
        resolvedGatewayStatusStore = gatewayStatusStore;
      }
    },
    get gatewayStatus() {
      return gatewayStatus;
    }
  });
}
