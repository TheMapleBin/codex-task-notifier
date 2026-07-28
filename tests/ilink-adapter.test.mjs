import assert from "node:assert/strict";
import test from "node:test";

import { createIlinkAdapter } from "../src/adapters/ilink.mjs";

function config(overrides = {}) {
  return {
    ilink: {
      botToken: "test-bot-token",
      baseUrl: "https://ilinkai.weixin.qq.com",
      toUserId: null,
      contextToken: null,
      sendTimeoutMs: 1_000,
      pollTimeoutMs: 1_000,
      retryMs: 10,
      pollEnabled: true,
      ...overrides
    }
  };
}

function response(value, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => value };
}

test("iLink adapter learns a reply context without reading message text and sends directly", async () => {
  const requests = [];
  let updateCount = 0;
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/getupdates")) {
      updateCount += 1;
      if (updateCount === 1) {
        return response({
          ret: 0,
          get_updates_buf: "next-cursor",
          msgs: [{ message_type: 1, from_user_id: "test-user", context_token: "test-context", item_list: [{ type: 1, text_item: { text: "must-not-be-used" } }] }]
        });
      }
      return new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("stopped")), { once: true }));
    }
    return response({ ret: 0 });
  };
  const adapter = createIlinkAdapter(config(), { fetchImpl, randomBytes: () => Buffer.alloc(4, 1) });
  await adapter.start();
  while (updateCount < 2) await new Promise((resolve) => setImmediate(resolve));
  try {
    const result = await adapter.send({ source: "session-watcher", kind: "turn_finished", surface: "desktop", turnId: "turn-ilink" });
    assert.deepEqual(result, { transport: "weixin-ilink", exitCode: 0 });
    const send = requests.find((request) => request.url.endsWith("/sendmessage"));
    const body = JSON.parse(send.options.body);
    assert.equal(body.msg.to_user_id, "test-user");
    assert.equal(body.msg.context_token, "test-context");
    assert.doesNotMatch(body.msg.item_list[0].text_item.text, /must-not-be-used/);
    assert.equal(send.options.headers.authorization, "Bearer test-bot-token");
  } finally {
    await adapter.close();
  }
});

test("iLink adapter keeps delivery retryable until a user establishes context", async () => {
  const adapter = createIlinkAdapter(config(), { fetchImpl: async () => response({ ret: 0 }), randomBytes: () => Buffer.alloc(4, 1) });
  await assert.rejects(
    () => adapter.send({ source: "session-watcher", kind: "turn_finished", surface: "desktop", turnId: "turn-no-context" }),
    /send the bot one message first/
  );
});

test("iLink adapter discards expired context and returns sanitized failure codes", async () => {
  const adapter = createIlinkAdapter(config({ toUserId: "test-user", contextToken: "test-context" }), {
    fetchImpl: async () => response({ ret: -2, errmsg: "sensitive upstream detail" }),
    randomBytes: () => Buffer.alloc(4, 1)
  });
  await assert.rejects(
    () => adapter.send({ source: "session-watcher", kind: "turn_finished", surface: "desktop", turnId: "turn-expired" }),
    (error) => /context expired/.test(error.message) && !/sensitive upstream detail/.test(error.message)
  );
});

test("iLink adapter recognizes an expired context reported through errcode", async () => {
  const adapter = createIlinkAdapter(config({ toUserId: "test-user", contextToken: "test-context" }), {
    fetchImpl: async () => response({ errcode: -2, errmsg: "sensitive upstream detail" }),
    randomBytes: () => Buffer.alloc(4, 1)
  });
  await assert.rejects(
    () => adapter.send({ source: "session-watcher", kind: "turn_finished", surface: "desktop", turnId: "turn-expired-errcode" }),
    (error) => /context expired/.test(error.message) && !/sensitive upstream detail/.test(error.message)
  );
});
