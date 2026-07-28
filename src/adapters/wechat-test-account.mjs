import { formatEventForDelivery } from "../event.mjs";
import { createWechatTestAccountConfigStore } from "../wechat-test-account-config.mjs";

const TOKEN_ENDPOINT = "https://api.weixin.qq.com/cgi-bin/token";
const SEND_ENDPOINT = "https://api.weixin.qq.com/cgi-bin/message/template/send";
const TOKEN_REFRESH_SKEW_MS = 60_000;

function required(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`WeChat test account requires ${name}.`);
  }
  return value.trim();
}

function failureCode(payload, status) {
  if (Number.isInteger(payload?.errcode) && payload.errcode !== 0) return `WECHAT_ERR_${payload.errcode}`;
  if (Number.isInteger(status)) return `HTTP_${status}`;
  return "PROTOCOL_ERROR";
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
        throw new Error(`wechat_test_account_${operation}_timeout`);
      }
      throw new Error(`wechat_test_account_${operation}_connection_failed`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`wechat_test_account_${operation}_failed:PROTOCOL_ERROR`);
    }
    if (!response.ok || (Number.isInteger(payload?.errcode) && payload.errcode !== 0)) {
      throw new Error(`wechat_test_account_${operation}_failed:${failureCode(payload, response.status)}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export function createWechatTestAccountAdapter(config, {
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  credentialStore = null
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("WeChat test account delivery requires fetch support.");
  const configured = config.wechatTestAccount || {};
  const timeoutMs = Number.isInteger(configured.timeoutMs) ? configured.timeoutMs : 30_000;
  let settings = null;
  let settingsPromise = null;
  let accessToken = null;
  let expiresAt = 0;

  function normalizeSettings(value) {
    return Object.freeze({
      appId: required(value?.appId, "AppID"),
      appSecret: required(value?.appSecret, "AppSecret"),
      openId: required(value?.openId, "recipient OpenID"),
      templateId: required(value?.templateId, "template ID")
    });
  }

  async function getSettings() {
    if (settings) return settings;
    if (!settingsPromise) {
      settingsPromise = (async () => {
        if (configured.appId || configured.appSecret || configured.openId || configured.templateId) {
          return normalizeSettings(configured);
        }
        const store = credentialStore || createWechatTestAccountConfigStore({
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
    const active = await getSettings();
    const url = new URL(TOKEN_ENDPOINT);
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", active.appId);
    url.searchParams.set("secret", active.appSecret);
    const payload = await requestJson(url, { method: "GET" }, { fetchImpl, timeoutMs, operation: "token" });
    if (typeof payload.access_token !== "string" || !payload.access_token) {
      throw new Error("wechat_test_account_token_failed:PROTOCOL_ERROR");
    }
    accessToken = payload.access_token;
    expiresAt = now() + Math.max(60, Number(payload.expires_in) || 7_200) * 1_000;
    return accessToken;
  }

  async function sendWithToken(token, event) {
    const active = await getSettings();
    const url = new URL(SEND_ENDPOINT);
    url.searchParams.set("access_token", token);
    return requestJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        touser: active.openId,
        template_id: active.templateId,
        data: { content: { value: formatEventForDelivery(event) } }
      })
    }, { fetchImpl, timeoutMs, operation: "send" });
  }

  return Object.freeze({
    name: "wechat-test-account",
    async start() {
      await getSettings();
    },
    async send(event) {
      let token = await getAccessToken();
      try {
        await sendWithToken(token, event);
      } catch (error) {
        if (!/WECHAT_ERR_(40001|40014|42001)$/.test(String(error.message || error))) throw error;
        accessToken = null;
        expiresAt = 0;
        token = await getAccessToken({ force: true });
        await sendWithToken(token, event);
      }
      return { transport: "wechat-test-account", exitCode: 0 };
    }
  });
}
