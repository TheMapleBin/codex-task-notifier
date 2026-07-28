import { formatEventForDelivery } from "../event.mjs";
import { createQQBotConfigStore } from "../qqbot-config.mjs";

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
  credentialStore = null
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("QQ Bot delivery requires fetch support.");
  const configured = config.qqbot || {};
  const timeoutMs = Number.isInteger(configured.timeoutMs) ? configured.timeoutMs : 45_000;
  let settings = null;
  let settingsPromise = null;
  let accessToken = null;
  let expiresAt = 0;
  let tokenPromise = null;

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

  return Object.freeze({
    name: "qqbot-direct",
    async start() {
      await getSettings();
    },
    async send(event) {
      let token = await getAccessToken();
      let payload;
      try {
        payload = await sendWithToken(token, event);
      } catch (error) {
        if (error?.code !== "QQBOT_SEND_AUTH_FAILED") throw error;
        token = await getAccessToken({ force: true });
        payload = await sendWithToken(token, event);
      }
      const messageId = typeof payload?.id === "string" && payload.id ? payload.id : null;
      if (!messageId) throw failure("QQBOT_SEND_PROTOCOL_ERROR");
      return { transport: "qqbot-direct", exitCode: 0, messageId };
    }
  });
}
