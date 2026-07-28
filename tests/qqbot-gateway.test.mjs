import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createQQBotGateway } from "../src/qqbot-gateway.mjs";
import { createQQBotGatewayStatusStore } from "../src/qqbot-gateway-status.mjs";

function response(value, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => value };
}

async function waitFor(predicate, { attempts = 100 } = {}) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error("Timed out waiting for test condition.");
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
      queueMicrotask(() => this.emit("message", { data: JSON.stringify({ op: 0, s: 1, t: "READY", d: {} }) }));
    }
  }

  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    queueMicrotask(() => this.emit("close", { code: 1000, reason: "sensitive close detail" }));
  }
}

function fetchForGateway({ closeFirst = false } = {}) {
  let gatewayRequests = 0;
  return async (url) => {
    if (String(url).includes("getAppAccessToken")) return response({ access_token: "test-access-token" });
    gatewayRequests += 1;
    return response({ url: `wss://gateway.example.test/${closeFirst ? gatewayRequests : "one"}` });
  };
}

test("native QQ Gateway identifies, records active-message permission, and never records C2C content", async () => {
  FakeWebSocket.instances = [];
  const statuses = [];
  const gateway = createQQBotGateway({
    credentials: async () => ({ appId: "test-app", appSecret: "test-secret", openId: "must-not-be-used" }),
    fetchImpl: fetchForGateway(),
    WebSocketImpl: FakeWebSocket,
    onStatus: async (status) => { statuses.push(status); }
  });
  const running = gateway.run();
  await waitFor(() => statuses.some((status) => status.state === "online"));
  const socket = FakeWebSocket.instances[0];
  assert.deepEqual(socket.sent[0], {
    op: 2,
    d: { token: "QQBot test-access-token", intents: 1 << 25, shard: [0, 1] }
  });
  socket.emit("message", {
    data: JSON.stringify({
      op: 0,
      s: 2,
      t: "C2C_MSG_RECEIVE",
      d: { author: { user_openid: "must-not-be-recorded" }, content: "must-not-be-recorded" }
    })
  });
  await waitFor(() => statuses.some((status) => status.activeMessaging === "allowed"));
  gateway.stop();
  assert.deepEqual(await running, { state: "stopped", code: null });
  assert.equal(JSON.stringify(statuses).includes("must-not-be-recorded"), false);
  assert.equal(JSON.stringify(statuses).includes("test-secret"), false);
});

test("native QQ Gateway backs off and reconnects after an ordinary close", async () => {
  class ReconnectingWebSocket extends FakeWebSocket {
    constructor(url) {
      super(url);
      if (FakeWebSocket.instances.length === 1) {
        queueMicrotask(() => this.close());
      }
    }
  }
  ReconnectingWebSocket.instances = [];
  FakeWebSocket.instances = [];
  const statuses = [];
  const gateway = createQQBotGateway({
    credentials: async () => ({ appId: "test-app", appSecret: "test-secret" }),
    fetchImpl: fetchForGateway({ closeFirst: true }),
    WebSocketImpl: ReconnectingWebSocket,
    sleepImpl: async () => {},
    onStatus: async (status) => { statuses.push(status); }
  });
  const running = gateway.run();
  await waitFor(() => FakeWebSocket.instances.length >= 2);
  assert.ok(statuses.some((status) => status.state === "backoff" && status.code === "QQBOT_GATEWAY_CONNECTION_CLOSED"));
  gateway.stop();
  assert.deepEqual(await running, { state: "stopped", code: null });
});

test("native QQ Gateway blocks instead of retrying an authentication failure", async () => {
  const statuses = [];
  const gateway = createQQBotGateway({
    credentials: async () => ({ appId: "test-app", appSecret: "test-secret" }),
    fetchImpl: async () => response({ message: "test-secret upstream detail" }, { ok: false, status: 401 }),
    WebSocketImpl: FakeWebSocket,
    onStatus: async (status) => { statuses.push(status); }
  });
  assert.deepEqual(await gateway.run(), { state: "blocked", code: "QQBOT_GATEWAY_TOKEN_AUTH_FAILED" });
  const final = statuses.at(-1);
  assert.deepEqual(final.state, "blocked");
  assert.equal(final.code, "QQBOT_GATEWAY_TOKEN_AUTH_FAILED");
  assert.equal(JSON.stringify(statuses).includes("test-secret"), false);
});

test("native QQ Gateway exposes a sanitized intent-permission failure", async () => {
  class IntentDeniedWebSocket extends FakeWebSocket {
    constructor(url) {
      super(url);
      queueMicrotask(() => this.emit("close", { code: 4915, reason: "sensitive platform detail" }));
    }
  }
  const statuses = [];
  const gateway = createQQBotGateway({
    credentials: async () => ({ appId: "test-app", appSecret: "test-secret" }),
    fetchImpl: fetchForGateway(),
    WebSocketImpl: IntentDeniedWebSocket,
    onStatus: async (status) => { statuses.push(status); }
  });
  assert.deepEqual(await gateway.run(), { state: "blocked", code: "QQBOT_GATEWAY_INTENT_NOT_ENABLED" });
  assert.equal(JSON.stringify(statuses).includes("sensitive"), false);
});

test("Gateway status store permits only sanitized state and code", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "qqbot-gateway-status-"));
  const statusPath = path.join(directory, "status.json");
  const store = createQQBotGatewayStatusStore({ statusPath });
  const status = {
    schemaVersion: 1,
    state: "online",
    activeMessaging: "allowed",
    updatedAt: "2026-07-29T00:00:00.000Z",
    code: null
  };
  await store.write(status);
  assert.deepEqual(await store.read(), status);
  const persisted = await readFile(statusPath, "utf8");
  assert.equal(persisted.includes("secret"), false);
  await store.write({ ...status, code: "test-secret" });
  assert.equal((await store.read()).code, null);
});
