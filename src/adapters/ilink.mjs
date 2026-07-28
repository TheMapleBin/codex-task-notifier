import crypto from "node:crypto";

import { formatEventForDelivery } from "../event.mjs";

const CHANNEL_VERSION = "1.0.2";

function validateBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || (url.hostname !== "weixin.qq.com" && !url.hostname.endsWith(".weixin.qq.com"))) {
    throw new Error("iLink base URL must use an approved Weixin HTTPS host.");
  }
  return url.origin;
}

function headers(botToken, wechatUin) {
  return {
    "content-type": "application/json",
    authorizationtype: "ilink_bot_token",
    authorization: `Bearer ${botToken}`,
    "x-wechat-uin": wechatUin
  };
}

async function requestJson(url, body, { botToken, wechatUin, timeoutMs, fetchImpl, signal }) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  timer.unref?.();
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: headers(botToken, wechatUin),
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`iLink HTTP ${response.status}.`);
    try {
      return await response.json();
    } catch {
      throw new Error("iLink returned an invalid response.");
    }
  } catch (error) {
    if (controller.signal.aborted) throw new Error("iLink request timed out or stopped.");
    if (/^iLink /.test(String(error?.message))) throw error;
    throw new Error("iLink request failed.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function initialContext(settings) {
  if (!settings.toUserId || !settings.contextToken) return null;
  return { toUserId: settings.toUserId, contextToken: settings.contextToken };
}

export function createIlinkAdapter(config, { fetchImpl = globalThis.fetch, randomBytes = crypto.randomBytes } = {}) {
  const settings = config.ilink;
  if (!settings?.botToken || !settings?.baseUrl) {
    throw new Error("iLink delivery requires DPAPI-protected bot token and base URL configuration.");
  }
  if (typeof fetchImpl !== "function") throw new Error("iLink delivery requires fetch support.");

  const baseUrl = validateBaseUrl(settings.baseUrl);
  const wechatUin = Buffer.from(String(randomBytes(4).readUInt32BE(0))).toString("base64");
  let context = initialContext(settings);
  let cursor = "";
  let pollPromise = null;
  let stopController = null;

  async function pollOnce(signal) {
    const result = await requestJson(`${baseUrl}/ilink/bot/getupdates`, {
      get_updates_buf: cursor,
      base_info: { channel_version: CHANNEL_VERSION }
    }, { botToken: settings.botToken, wechatUin, timeoutMs: settings.pollTimeoutMs, fetchImpl, signal });

    if (result?.ret === -14 || result?.errcode === -14) throw new Error("iLink authentication expired.");
    if (typeof result?.get_updates_buf === "string" && result.get_updates_buf) cursor = result.get_updates_buf;
    for (const message of Array.isArray(result?.msgs) ? result.msgs : []) {
      if (message?.message_type !== 1) continue;
      if (typeof message.from_user_id !== "string" || !message.from_user_id) continue;
      if (typeof message.context_token !== "string" || !message.context_token) continue;
      context = { toUserId: message.from_user_id, contextToken: message.context_token };
    }
  }

  async function pollLoop(signal) {
    while (!signal.aborted) {
      try {
        await pollOnce(signal);
      } catch (error) {
        if (signal.aborted) return;
        process.stderr.write(`[codex-notify] ${String(error.message || error)}\n`);
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, settings.retryMs);
          timer.unref?.();
          signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
        });
      }
    }
  }

  return Object.freeze({
    name: "weixin-ilink",
    async start() {
      if (!settings.pollEnabled) return;
      if (pollPromise) return;
      stopController = new AbortController();
      pollPromise = pollLoop(stopController.signal);
    },
    async close() {
      stopController?.abort();
      await pollPromise;
      pollPromise = null;
      stopController = null;
    },
    async send(event) {
      if (!context) throw new Error("iLink has no active WeChat conversation; send the bot one message first.");
      const active = context;
      const result = await requestJson(`${baseUrl}/ilink/bot/sendmessage`, {
        msg: {
          from_user_id: "",
          to_user_id: active.toUserId,
          client_id: `codex-notify-${crypto.randomUUID()}`,
          message_type: 2,
          message_state: 2,
          context_token: active.contextToken,
          item_list: [{ type: 1, text_item: { text: formatEventForDelivery(event) } }]
        },
        base_info: { channel_version: CHANNEL_VERSION }
      }, { botToken: settings.botToken, wechatUin, timeoutMs: settings.sendTimeoutMs, fetchImpl });

      const responseCode = Number.isInteger(result?.ret)
        ? result.ret
        : Number.isInteger(result?.errcode) ? result.errcode : null;
      if (responseCode === -2) {
        context = null;
        throw new Error("iLink conversation context expired; send the bot one message to refresh it.");
      }
      if (responseCode === -14) throw new Error("iLink authentication expired.");
      if (responseCode != null && responseCode !== 0) throw new Error(`iLink send failed with code ${responseCode}.`);
      return { transport: "weixin-ilink", exitCode: 0 };
    }
  });
}
