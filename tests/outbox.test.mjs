import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createEvent } from "../src/event.mjs";
import { Outbox } from "../src/outbox.mjs";
import { temporaryDirectory, testConfig } from "./helpers.mjs";

test("outbox deduplicates, retries, and eventually delivers", async () => {
  const home = await temporaryDirectory();
  const outbox = new Outbox(testConfig(home));
  await outbox.init();
  const event = createEvent({ source: "api-proxy", kind: "api_error", requestId: "req-1", httpStatus: 503, errorKind: "http_status" });

  assert.equal((await outbox.enqueue(event)).accepted, true);
  assert.equal((await outbox.enqueue(event)).reason, "duplicate");

  let attempts = 0;
  await outbox.processDue({ send: async () => {
    attempts += 1;
    throw new Error("offline");
  } }, new Date());
  assert.equal((await outbox.counts()).pending, 1);

  await outbox.processDue({ send: async () => {
    attempts += 1;
    return { ok: true };
  } }, new Date(Date.now() + 100));
  assert.equal(attempts, 2);
  assert.deepEqual(await outbox.counts(), { pending: 0, delivered: 1, failed: 0, incoming: 0 });
});

test("outbox pins records to the selected transport and never replays iLink work through QQ", async () => {
  const home = await temporaryDirectory();
  const ilinkOutbox = new Outbox(testConfig(home, { adapter: "ilink" }));
  await ilinkOutbox.init();
  await ilinkOutbox.enqueue(createEvent({ source: "session-watcher", kind: "turn_finished", turnId: "turn-ilink-pending" }));

  const qqOutbox = new Outbox(testConfig(home, { adapter: "qqbot" }));
  await qqOutbox.init();
  let qqSends = 0;
  await qqOutbox.processDue({ send: async () => { qqSends += 1; } }, new Date(Date.now() + 1_000));
  assert.equal(qqSends, 0);
  assert.deepEqual(await qqOutbox.counts(), { pending: 1, delivered: 0, failed: 0, incoming: 0 });

  await qqOutbox.enqueue(createEvent({ source: "session-watcher", kind: "turn_finished", turnId: "turn-qq-pending" }));
  await qqOutbox.processDue({ send: async () => { qqSends += 1; } }, new Date(Date.now() + 2_000));
  assert.equal(qqSends, 1);
  assert.deepEqual(await qqOutbox.counts(), { pending: 1, delivered: 1, failed: 0, incoming: 0 });
});

test("legacy unpinned records remain eligible only for iLink", async () => {
  const home = await temporaryDirectory();
  const ilinkOutbox = new Outbox(testConfig(home, { adapter: "ilink" }));
  await ilinkOutbox.init();
  await ilinkOutbox.enqueue(createEvent({ source: "session-watcher", kind: "turn_finished", turnId: "turn-legacy-pending" }));
  const pendingDirectory = path.join(home, "outbox", "pending");
  const fileName = (await fs.readdir(pendingDirectory))[0];
  const recordPath = path.join(pendingDirectory, fileName);
  const legacy = JSON.parse(await fs.readFile(recordPath, "utf8"));
  delete legacy.transport;
  legacy.schemaVersion = 1;
  await fs.writeFile(recordPath, `${JSON.stringify(legacy)}\n`, "utf8");

  const qqOutbox = new Outbox(testConfig(home, { adapter: "qqbot" }));
  let qqSends = 0;
  await qqOutbox.processDue({ send: async () => { qqSends += 1; } }, new Date(Date.now() + 1_000));
  assert.equal(qqSends, 0);
  assert.equal((await qqOutbox.counts()).pending, 1);

  let ilinkSends = 0;
  await ilinkOutbox.processDue({ send: async () => { ilinkSends += 1; } }, new Date(Date.now() + 2_000));
  assert.equal(ilinkSends, 1);
  assert.deepEqual(await ilinkOutbox.counts(), { pending: 0, delivered: 1, failed: 0, incoming: 0 });
});

test("outbox moves explicitly non-retryable delivery failures to failed without exhausting retries", async () => {
  const home = await temporaryDirectory();
  const outbox = new Outbox(testConfig(home));
  await outbox.init();
  await outbox.enqueue(createEvent({ source: "session-watcher", kind: "turn_finished", turnId: "turn-no-retry" }));
  await outbox.processDue({ send: async () => {
    const error = new Error("QQBOT_SEND_REJECTED");
    error.code = "QQBOT_SEND_REJECTED";
    error.retryable = false;
    throw error;
  } });
  assert.deepEqual(await outbox.counts(), { pending: 0, delivered: 0, failed: 1, incoming: 0 });
  await fs.rm(path.join(home, "outbox"), { recursive: true, force: true });
});

test("terminal event suppresses a pending generic Stop event", async () => {
  const home = await temporaryDirectory();
  const outbox = new Outbox(testConfig(home));
  await outbox.init();
  await outbox.enqueue(createEvent({
    source: "stop-hook",
    kind: "turn_stopped",
    turnId: "turn-42",
    correlationKey: "turn:turn-42"
  }), { notBefore: new Date(Date.now() + 60_000) });
  assert.equal(await outbox.supersedePending("turn:turn-42"), 1);
  assert.equal((await outbox.counts()).pending, 0);

  await fs.rm(path.join(home, "outbox"), { recursive: true, force: true });
});

test("context-blocked pending records wait without consuming attempts and wake immediately", async () => {
  const home = await temporaryDirectory();
  const outbox = new Outbox(testConfig(home, { retryMaxMs: 60_000 }));
  await outbox.init();
  const event = createEvent({ source: "session-watcher", kind: "turn_finished", turnId: "turn-context" });
  await outbox.enqueue(event);

  const firstNow = new Date();
  await outbox.processDue({ send: async () => {
    throw Object.assign(new Error("context expired"), { code: "ILINK_CONTEXT_EXPIRED" });
  } }, firstNow);
  const pendingPath = (await fs.readdir(path.join(home, "outbox", "pending")))[0];
  const blocked = JSON.parse(await fs.readFile(path.join(home, "outbox", "pending", pendingPath), "utf8"));
  assert.equal(blocked.attempts, 0);
  assert.equal(blocked.lastErrorCode, "ILINK_CONTEXT_EXPIRED");
  assert.ok(new Date(blocked.nextAttemptAt) > firstNow);

  assert.equal(await outbox.wakeContextPending(new Date(firstNow.getTime() + 1_000)), 1);
  await outbox.processDue({ send: async () => ({ ok: true }) }, new Date(firstNow.getTime() + 1_000));
  assert.deepEqual(await outbox.counts(), { pending: 0, delivered: 1, failed: 0, incoming: 0 });
});
