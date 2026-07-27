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
        completed_at: "2026-07-27T00:00:05.000Z",
        duration_ms: 5_000,
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
  assert.equal(events[0].durationMs, 5_000);
  assert.equal(events[0].errorCode, null);
  assert.equal(events[0].workspace, "demo");
  assert.equal(await watcher.scanOnce(), 0);
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
  assert.equal(events[0].errorCode, null);
  assert.equal(events[0].workspace, "demo");
});

test("session watcher classifies string API errors without preserving their text", async () => {
  const root = await temporaryDirectory();
  const directory = path.join(root, "2026", "07", "27");
  await fs.mkdir(directory, { recursive: true });
  const rollout = path.join(directory, "rollout-string-error.jsonl");
  await fs.writeFile(rollout, `${JSON.stringify({ type: "turn_context", payload: { cwd: "C:\\work\\demo" } })}\n${JSON.stringify({
    timestamp: "2026-07-27T00:00:00.000Z",
    type: "event_msg",
    payload: { type: "task_complete", turn_id: "turn-401", duration_ms: 1, error: "request failed with 401" }
  })}\n`, "utf8");
  const events = [];
  const watcher = createSessionWatcher({ sessionsDir: root, onEvent: async (event) => events.push(event) });
  assert.equal(await watcher.scanOnce(), 1);
  assert.equal(events[0].httpStatus, 401);
  assert.equal(events[0].errorKind, "http_status");
  assert.equal(events[0].errorCode, null);
});

test("session watcher ignores subagent terminal events by default", async () => {
  const root = await temporaryDirectory();
  const directory = path.join(root, "2026", "07", "27");
  await fs.mkdir(directory, { recursive: true });
  const rollout = path.join(directory, "rollout-subagent.jsonl");
  const lines = [
    JSON.stringify({ type: "turn_context", payload: { cwd: "C:\\work\\demo", parent_thread_id: "root-turn" } }),
    JSON.stringify({
      timestamp: "2026-07-27T00:00:00.000Z",
      type: "event_msg",
      payload: { type: "task_complete", turn_id: "sub-turn", duration_ms: 1 }
    })
  ];
  await fs.writeFile(rollout, `${lines.join("\n")}\n`, "utf8");
  const events = [];
  const watcher = createSessionWatcher({ sessionsDir: root, onEvent: async (event) => events.push(event) });
  assert.equal(await watcher.scanOnce(), 0);
  assert.deepEqual(events, []);
});

test("session watcher baselines historical rollouts before observing appended terminal events", async () => {
  const root = await temporaryDirectory();
  const directory = path.join(root, "2026", "07", "27");
  await fs.mkdir(directory, { recursive: true });
  const rollout = path.join(directory, "rollout-existing.jsonl");
  await fs.writeFile(rollout, `${JSON.stringify({ type: "turn_context", payload: { cwd: "C:\\work\\demo" } })}\n${JSON.stringify({
    timestamp: "2026-07-27T00:00:00.000Z",
    type: "event_msg",
    payload: { type: "task_complete", turn_id: "historic-turn", duration_ms: 1 }
  })}\n`, "utf8");
  const events = [];
  const watcher = createSessionWatcher({ sessionsDir: root, onEvent: async (event) => events.push(event) });
  try {
    assert.equal(await watcher.start(), 0);
    assert.deepEqual(events, []);
    await fs.appendFile(rollout, `${JSON.stringify({
      timestamp: "2026-07-27T00:01:00.000Z",
      type: "event_msg",
      payload: { type: "task_complete", turn_id: "fresh-turn", duration_ms: 2_000 }
    })}\n`, "utf8");
    assert.equal(await watcher.scanOnce(), 1);
    assert.equal(events[0].turnId, "fresh-turn");
    assert.equal(events[0].workspace, "demo");
  } finally {
    watcher.close();
  }
});
