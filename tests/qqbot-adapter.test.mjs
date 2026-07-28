import assert from "node:assert/strict";
import test from "node:test";

import { createQQBotAdapter } from "../src/adapters/qqbot.mjs";

function config(overrides = {}) {
  return {
    qqbot: {
      appId: "test-app-id",
      appSecret: "test-app-secret",
      openId: "test-open-id",
      timeoutMs: 1_000,
      ...overrides
    }
  };
}

function response(value, { ok = true, status = 200, retryAfter = null } = {}) {
  return {
    ok,
    status,
    headers: { get: (name) => name.toLowerCase() === "retry-after" ? retryAfter : null },
    json: async () => value
  };
}

const event = {
  source: "session-watcher",
  kind: "turn_finished",
  workspace: "demo",
  taskName: "test task",
  surface: "desktop",
  turnId: "turn-test",
  finalOutput: "safe output"
};

test("direct QQ Bot adapter obtains a token and sends a proactive C2C text message", async () => {
  const requests = [];
  const adapter = createQQBotAdapter(config(), { fetchImpl: async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("/app/getAppAccessToken")) return response({ access_token: "test-access-token", expires_in: 7200 });
    return response({ id: "qq-message-1" });
  }});
  assert.deepEqual(await adapter.send(event), { transport: "qqbot-direct", exitCode: 0, messageId: "qq-message-1" });
  assert.equal(requests.length, 2);
  const tokenUrl = new URL(requests[0].url);
  assert.equal(tokenUrl.origin, "https://bots.qq.com");
  assert.equal(tokenUrl.pathname, "/app/getAppAccessToken");
  assert.deepEqual(JSON.parse(requests[0].options.body), { appId: "test-app-id", clientSecret: "test-app-secret" });
  const messageUrl = new URL(requests[1].url);
  assert.equal(messageUrl.origin, "https://api.sgroup.qq.com");
  assert.equal(messageUrl.pathname, "/v2/users/test-open-id/messages");
  assert.equal(requests[1].options.headers.authorization, "QQBot test-access-token");
  const body = JSON.parse(requests[1].options.body);
  assert.equal(body.msg_type, 0);
  assert.match(body.content, /safe output/);
  assert.equal(Object.hasOwn(body, "msg_id"), false);
});

test("direct QQ Bot adapter requires an API message-ID receipt", async () => {
  const adapter = createQQBotAdapter(config(), { fetchImpl: async (url) => {
    if (String(url).includes("/app/getAppAccessToken")) return response({ access_token: "token", expires_in: 7200 });
    return response({ timestamp: "2026-07-28T23:30:00+08:00" });
  }});
  await assert.rejects(
    () => adapter.send(event),
    (error) => error.code === "QQBOT_SEND_PROTOCOL_ERROR" && error.retryable === true
  );
});

test("direct QQ Bot adapter caches access tokens", async () => {
  let tokenRequests = 0;
  const adapter = createQQBotAdapter(config(), { fetchImpl: async (url) => {
    if (String(url).includes("/app/getAppAccessToken")) {
      tokenRequests += 1;
      return response({ access_token: "cached-token", expires_in: 7200 });
    }
    return response({ id: "qq-message" });
  }});
  await adapter.send(event);
  await adapter.send({ ...event, turnId: "turn-test-2" });
  assert.equal(tokenRequests, 1);
});

test("direct QQ Bot adapter refreshes an invalid access token once", async () => {
  let tokenRequests = 0;
  let sendRequests = 0;
  const adapter = createQQBotAdapter(config(), { fetchImpl: async (url) => {
    if (String(url).includes("/app/getAppAccessToken")) {
      tokenRequests += 1;
      return response({ access_token: `token-${tokenRequests}`, expires_in: 7200 });
    }
    sendRequests += 1;
    return sendRequests === 1
      ? response({ code: 401, message: "sensitive upstream response" }, { ok: false, status: 401 })
      : response({ id: "qq-message-2" });
  }});
  await adapter.send(event);
  assert.equal(tokenRequests, 2);
  assert.equal(sendRequests, 2);
});

test("direct QQ Bot adapter sanitizes rejected credentials and upstream details", async () => {
  const adapter = createQQBotAdapter(config(), { fetchImpl: async () => response({ message: "test-app-secret and sensitive upstream response" }, { ok: false, status: 401 }) });
  await assert.rejects(
    () => adapter.send(event),
    (error) => error.code === "QQBOT_TOKEN_AUTH_FAILED" && error.retryable === false && !/secret|sensitive/i.test(error.message)
  );
});

test("direct QQ Bot adapter marks HTTP 429 as retryable and honors Retry-After", async () => {
  const adapter = createQQBotAdapter(config(), { fetchImpl: async (url) => {
    if (String(url).includes("/app/getAppAccessToken")) return response({ access_token: "token", expires_in: 7200 });
    return response({ message: "sensitive upstream response" }, { ok: false, status: 429, retryAfter: "3" });
  }});
  await assert.rejects(
    () => adapter.send(event),
    (error) => error.code === "QQBOT_SEND_RATE_LIMITED" && error.retryable === true && error.retryAfterMs === 3_000 && !/sensitive/i.test(error.message)
  );
});

test("direct QQ Bot adapter reports a sanitized timeout", async () => {
  const adapter = createQQBotAdapter(config({ timeoutMs: 10 }), { fetchImpl: async (_url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("secret timeout detail");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  }) });
  await assert.rejects(() => adapter.send(event), (error) => error.code === "QQBOT_TOKEN_TIMEOUT" && !/secret/.test(error.message));
});

test("direct QQ Bot adapter loads DPAPI-protected credentials once during start", async () => {
  let reads = 0;
  const adapter = createQQBotAdapter({ qqbot: { configPath: "C:\\secure\\qqbot.dpapi.json", timeoutMs: 1_000 } }, {
    credentialStore: { read: async () => {
      reads += 1;
      return { appId: "stored-app", appSecret: "stored-secret", openId: "stored-user" };
    } },
    fetchImpl: async (url, options) => {
      if (String(url).includes("/app/getAppAccessToken")) return response({ access_token: "stored-token", expires_in: 7200 });
      assert.equal(new URL(String(url)).pathname, "/v2/users/stored-user/messages");
      assert.equal(options.headers.authorization, "QQBot stored-token");
      return response({ id: "qq-message-3" });
    }
  });
  await adapter.start();
  await adapter.send(event);
  assert.equal(reads, 1);
});
