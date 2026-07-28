import assert from "node:assert/strict";
import test from "node:test";

import { createNotifierService } from "../src/notifier-service.mjs";
import { httpRequest, temporaryDirectory, testConfig, unusedPort } from "./helpers.mjs";

test("service timer is ref'd when running without an HTTP listener so the event loop stays alive", async () => {
  // Regression: in watch mode (listen: false) the dispatch timer was unref'd,
  // leaving no ref'd handles so the process exited immediately after printing
  // the ready line. The timer must be ref'd when listen=false.
  const home = await temporaryDirectory();
  const capturedTimers = [];
  const origSetInterval = globalThis.setInterval;
  globalThis.setInterval = (...args) => {
    const t = origSetInterval(...args);
    capturedTimers.push(t);
    return t;
  };
  const service = createNotifierService(testConfig(home), {
    adapter: { name: "capture", send: async () => {} }
  });
  try {
    await service.start({ listen: false });
    assert.ok(capturedTimers.length > 0, "setInterval must have been called");
    const dispatchTimer = capturedTimers[capturedTimers.length - 1];
    assert.ok(
      dispatchTimer.hasRef(),
      "dispatch timer must be ref'd when listen=false — otherwise the watch process exits immediately"
    );
  } finally {
    globalThis.setInterval = origSetInterval;
    await service.close();
  }
});

test("notification service accepts loopback events and dispatches them", async () => {
  const home = await temporaryDirectory();
  const servicePort = await unusedPort();
  const delivered = [];
  const service = createNotifierService(testConfig(home, { servicePort }), {
    adapter: { name: "capture", send: async (event) => delivered.push(event) }
  });
  await service.start();
  try {
    const response = await httpRequest(`http://127.0.0.1:${servicePort}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "cli-wrapper", kind: "turn_finished", surface: "cli", turnId: "turn-service" })
    });
    assert.equal(response.statusCode, 202);
    await service.tick();
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].kind, "turn_finished");
    const health = await httpRequest(`http://127.0.0.1:${servicePort}/health`);
    assert.equal(health.statusCode, 200);
  } finally {
    await service.close();
  }
});

test("notification worker dispatches direct watcher events without an HTTP listener", async () => {
  const home = await temporaryDirectory();
  const delivered = [];
  const service = createNotifierService(testConfig(home), {
    adapter: { name: "capture", send: async (event) => delivered.push(event) }
  });
  await service.start({ listen: false });
  try {
    await service.submit({ source: "session-watcher", kind: "turn_finished", turnId: "turn-direct", durationMs: 1_000 });
    await service.tick();
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].turnId, "turn-direct");
  } finally {
    await service.close();
  }
});

test("notification worker keeps only the latest pending terminal event for one task", async () => {
  const home = await temporaryDirectory();
  const delivered = [];
  const service = createNotifierService(testConfig(home), {
    adapter: { name: "capture", send: async (event) => delivered.push(event) }
  });
  await service.start({ listen: false });
  try {
    await service.submit({ source: "session-watcher", kind: "task_error", turnId: "turn-coalesced", finalOutput: "older" });
    await service.submit({ source: "session-watcher", kind: "turn_finished", turnId: "turn-coalesced", finalOutput: "latest" });
    await service.tick();
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].kind, "turn_finished");
    assert.equal(delivered[0].finalOutput, "latest");
  } finally {
    await service.close();
  }
});

test("notification service owns the optional adapter lifecycle", async () => {
  const home = await temporaryDirectory();
  const calls = [];
  const adapter = {
    name: "lifecycle",
    start: async () => calls.push("start"),
    send: async () => {},
    close: async () => calls.push("close")
  };
  const service = createNotifierService(testConfig(home), { adapter });
  await service.start({ listen: false });
  await service.close();
  assert.deepEqual(calls, ["start", "close"]);
});
