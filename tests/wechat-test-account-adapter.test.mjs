import assert from "node:assert/strict";
import test from "node:test";

import { createWechatTestAccountAdapter } from "../src/adapters/wechat-test-account.mjs";

function config(overrides = {}) {
  return {
    wechatTestAccount: {
      appId: "test-app-id",
      appSecret: "test-app-secret",
      openId: "test-open-id",
      templateId: "test-template-id",
      timeoutMs: 1_000,
      ...overrides
    }
  };
}

function response(value, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => value };
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

test("WeChat test-account adapter obtains a token and sends the expected template payload", async () => {
  const requests = [];
  const adapter = createWechatTestAccountAdapter(config(), { fetchImpl: async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("/cgi-bin/token")) return response({ access_token: "test-access-token", expires_in: 7200 });
    return response({ errcode: 0, errmsg: "ok", msgid: 1 });
  }});
  assert.deepEqual(await adapter.send(event), { transport: "wechat-test-account", exitCode: 0 });
  assert.equal(requests.length, 2);
  const tokenUrl = new URL(requests[0].url);
  assert.equal(tokenUrl.hostname, "api.weixin.qq.com");
  assert.equal(tokenUrl.searchParams.get("grant_type"), "client_credential");
  assert.equal(tokenUrl.searchParams.get("appid"), "test-app-id");
  assert.equal(tokenUrl.searchParams.get("secret"), "test-app-secret");
  const sendUrl = new URL(requests[1].url);
  assert.equal(sendUrl.searchParams.get("access_token"), "test-access-token");
  const body = JSON.parse(requests[1].options.body);
  assert.equal(body.touser, "test-open-id");
  assert.equal(body.template_id, "test-template-id");
  assert.match(body.data.content.value, /safe output/);
  assert.doesNotMatch(body.data.content.value, /[\r\n]/);
  assert.match(body.data.content.value, /\[Codex\] \| /);
});

test("WeChat test-account adapter caches access tokens", async () => {
  let tokenRequests = 0;
  const adapter = createWechatTestAccountAdapter(config(), { fetchImpl: async (url) => {
    if (String(url).includes("/cgi-bin/token")) {
      tokenRequests += 1;
      return response({ access_token: "cached-token", expires_in: 7200 });
    }
    return response({ errcode: 0 });
  }});
  await adapter.send(event);
  await adapter.send({ ...event, turnId: "turn-test-2" });
  assert.equal(tokenRequests, 1);
});

test("WeChat test-account adapter refreshes an invalid access token once", async () => {
  let tokenRequests = 0;
  let sendRequests = 0;
  const adapter = createWechatTestAccountAdapter(config(), { fetchImpl: async (url) => {
    if (String(url).includes("/cgi-bin/token")) {
      tokenRequests += 1;
      return response({ access_token: `token-${tokenRequests}`, expires_in: 7200 });
    }
    sendRequests += 1;
    return response(sendRequests === 1 ? { errcode: 40001 } : { errcode: 0 });
  }});
  await adapter.send(event);
  assert.equal(tokenRequests, 2);
  assert.equal(sendRequests, 2);
});

test("WeChat test-account adapter sanitizes upstream errors", async () => {
  const adapter = createWechatTestAccountAdapter(config(), { fetchImpl: async (url) => {
    if (String(url).includes("/cgi-bin/token")) return response({ access_token: "token", expires_in: 7200 });
    return response({ errcode: 40003, errmsg: "sensitive upstream response" });
  }});
  await assert.rejects(
    () => adapter.send(event),
    (error) => /WECHAT_ERR_40003/.test(error.message) && !/sensitive upstream response/.test(error.message)
  );
});

test("WeChat test-account adapter reports a sanitized timeout", async () => {
  const adapter = createWechatTestAccountAdapter(config({ timeoutMs: 10 }), { fetchImpl: async (_url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("secret timeout detail");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  }) });
  await assert.rejects(
    () => adapter.send(event),
    (error) => error.message === "wechat_test_account_token_timeout"
  );
});

test("WeChat test-account adapter loads protected credentials during start", async () => {
  let reads = 0;
  const adapter = createWechatTestAccountAdapter({
    wechatTestAccount: { configPath: "C:\\secure\\test.dpapi.json", timeoutMs: 1_000 }
  }, {
    credentialStore: { read: async () => {
      reads += 1;
      return { appId: "stored-app", appSecret: "stored-secret", openId: "stored-user", templateId: "stored-template" };
    } },
    fetchImpl: async (url, options) => {
      if (String(url).includes("/cgi-bin/token")) return response({ access_token: "stored-token", expires_in: 7200 });
      const body = JSON.parse(options.body);
      assert.equal(body.touser, "stored-user");
      assert.equal(body.template_id, "stored-template");
      return response({ errcode: 0 });
    }
  });
  await adapter.start();
  await adapter.send(event);
  assert.equal(reads, 1);
});
