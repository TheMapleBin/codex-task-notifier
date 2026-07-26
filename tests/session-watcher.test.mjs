import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createSessionWatcher } from "../src/session-watcher.mjs";
import { temporaryDirectory } from "./helpers.mjs";

test("session watcher turns a persisted API failure into a sanitized task error", async () => {
  const root = await temporaryDirectory();
  const directory = path.join(root, "2026", "07", "27");
  await fs.mkdir(directory, { recursive: true });
  const rollout = path.join(directory, "rollout-test.jsonl");
  const lines = [
    JSON.stringify({ type: "turn_context", payload: { cwd: "C:\\work\\demo" } }),
    JSON.stringify({
      timestamp: "2026-07-27T00:00:00.000Z",
      type: "event_msg",
      payload: {
        type: "task_complete",
        turn_id: "turn-503",
        error: { message: "unexpected status 503 Service Unavailable", codex_error_info: "other" }
      }
    })
  ];
  await fs.writeFile(rollout, `${lines.join("\n")}\n`, "utf8");
  const events = [];
  const watcher = createSessionWatcher({ sessionsDir: root, onEvent: async (event) => events.push(event) });
  assert.equal(await watcher.scanOnce(), 1);
  assert.equal(events[0].kind, "task_error");
  assert.equal(events[0].httpStatus, 503);
  assert.equal(events[0].workspace, "demo");
});

test("session watcher records an interrupted root task without prompt content", async () => {
  const root = await temporaryDirectory();
  const directory = path.join(root, "2026", "07", "27");
  await fs.mkdir(directory, { recursive: true });
  const rollout = path.join(directory, "rollout-interrupted.jsonl");
  const lines = [
    JSON.stringify({ type: "turn_context", payload: { cwd: "C:\\work\\demo" } }),
    JSON.stringify({
      timestamp: "2026-07-27T00:00:00.000Z",
      type: "event_msg",
      payload: { type: "turn_aborted", turn_id: "turn-stop", reason: "USER_INTERRUPTED" }
    })
  ];
  await fs.writeFile(rollout, `${lines.join("\n")}\n`, "utf8");
  const events = [];
  const watcher = createSessionWatcher({ sessionsDir: root, onEvent: async (event) => events.push(event) });
  assert.equal(await watcher.scanOnce(), 1);
  assert.equal(events[0].kind, "turn_interrupted");
  assert.equal(events[0].errorCode, "USER_INTERRUPTED");
  assert.equal(events[0].workspace, "demo");
});
