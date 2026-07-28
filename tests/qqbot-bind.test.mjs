import assert from "node:assert/strict";
import test from "node:test";

import { bindQQBot } from "../src/qqbot-bind.mjs";

function response(value, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => value };
}

class FakeWebSocket {
  static OPEN = 1;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.OPEN;
    this.listeners = new Map();
    this.sent = [];
    FakeWebSocket.instances.push(this);
    queueMicrotask(() => this.emit("message", { data: JSON.stringify({ op: 10, d: { heartbeat_interval: 60_000 } }) }));
  }

  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) || [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }

  emit(type, event) {
    for (const callback of this.listeners.get(type) || []) callback(event);
  }

  send(value) {
    this.sent.push(JSON.parse(value));
    if (this.sent.at(-1)?.op === 2) {
      queueMicrotask(() => this.emit("message", {
        data: JSON.stringify({ op: 0, s: 1, t: "C2C_MESSAGE_CREATE", d: { author: { user_openid: "test-open-id" } } })
      }));
    }
  }

  close() {
    this.readyState = 3;
  }
}

test("one-shot QQ Bot binder gets a C2C OpenID without logging message content", async () => {
  FakeWebSocket.instances = [];
  let ready = 0;
  const requests = [];
  const openId = await bindQQBot({ appId: "test-app", appSecret: "test-secret" }, {
    WebSocketImpl: FakeWebSocket,
    onReady: () => { ready += 1; },
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      if (String(url).includes("getAppAccessToken")) return response({ access_token: "test-token" });
      return response({ url: "wss://gateway.example.test" });
    }
  });
  assert.equal(openId, "test-open-id");
  assert.equal(ready, 1);
  assert.equal(requests.length, 2);
  assert.equal(new URL(requests[1].url).pathname, "/gateway");
  assert.equal(requests[1].options.headers.authorization, "QQBot test-token");
  assert.deepEqual(FakeWebSocket.instances[0].sent[0], {
    op: 2,
    d: { token: "QQBot test-token", intents: 1 << 25, shard: [0, 1] }
  });
});

test("one-shot QQ Bot binder returns only a sanitized authentication failure", async () => {
  await assert.rejects(
    () => bindQQBot({ appId: "test-app", appSecret: "test-secret" }, {
      WebSocketImpl: FakeWebSocket,
      fetchImpl: async () => response({ message: "test-secret and sensitive upstream response" }, { ok: false, status: 401 })
    }),
    (error) => error.code === "QQBOT_BIND_TOKEN_AUTH_FAILED" && !/secret|sensitive/i.test(error.message)
  );
});

test("one-shot QQ Bot binder exposes no close reason when C2C intent is not enabled", async () => {
  class IntentDeniedWebSocket extends FakeWebSocket {
    constructor(url) {
      super(url);
      queueMicrotask(() => this.emit("close", { code: 4915, reason: "sensitive platform detail" }));
    }
  }
  await assert.rejects(
    () => bindQQBot({ appId: "test-app", appSecret: "test-secret" }, {
      WebSocketImpl: IntentDeniedWebSocket,
      fetchImpl: async (url) => String(url).includes("getAppAccessToken")
        ? response({ access_token: "token" })
        : response({ url: "wss://gateway.example.test" })
    }),
    (error) => error.code === "QQBOT_BIND_INTENT_NOT_ENABLED" && !/sensitive/i.test(error.message)
  );
});
