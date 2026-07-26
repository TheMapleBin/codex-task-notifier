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
