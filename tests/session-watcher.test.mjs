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

test("session watcher carries only the latest assistant output for the current turn", async () => {
  const root = await temporaryDirectory();
  const directory = path.join(root, "2026", "07", "28");
  await fs.mkdir(directory, { recursive: true });
  const rollout = path.join(directory, "rollout-output.jsonl");
  const lines = [
    JSON.stringify({ type: "session_meta", payload: { id: "thread-output" } }),
    JSON.stringify({ type: "event_msg", payload: { type: "task_started", turn_id: "turn-output" } }),
    JSON.stringify({ type: "turn_context", payload: { cwd: "C:\\work\\demo", turn_id: "turn-output" } }),
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: "private prompt" }] } }),
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "draft output" }] } }),
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "final line one" }, { type: "output_text", text: "final line two" }] } }),
    JSON.stringify({ type: "event_msg", payload: { type: "task_complete", turn_id: "turn-output", duration_ms: 2_000 } })
  ];
  await fs.writeFile(rollout, `${lines.join("\n")}\n`, "utf8");
  const events = [];
  const resolved = [];
  const watcher = createSessionWatcher({
    sessionsDir: root,
    onEvent: async (event) => events.push(event),
    resolveTaskName: async (threadId) => { resolved.push(threadId); return "输出通知验收"; }
  });

  assert.equal(await watcher.scanOnce(), 1);
  assert.equal(events[0].finalOutput, "final line one\nfinal line two");
  assert.equal(events[0].taskName, "输出通知验收");
  assert.deepEqual(resolved, ["thread-output"]);
  assert.doesNotMatch(events[0].finalOutput, /private prompt|draft output/);
});

test("session watcher resolves the task name only when the terminal event arrives", async () => {
  const root = await temporaryDirectory();
  const directory = path.join(root, "2026", "07", "28");
  await fs.mkdir(directory, { recursive: true });
  const rollout = path.join(directory, "rollout-late-title.jsonl");
  await fs.writeFile(rollout, `${JSON.stringify({ type: "session_meta", payload: { id: "thread-late-title" } })}\n`, "utf8");
  const events = [];
  const resolved = [];
  const watcher = createSessionWatcher({
    sessionsDir: root,
    onEvent: async (event) => events.push(event),
    resolveTaskName: async (threadId) => { resolved.push(threadId); return "稍后生成的任务名称"; }
  });

  assert.equal(await watcher.scanOnce(), 0);
  assert.deepEqual(resolved, []);
  await fs.appendFile(rollout, `${JSON.stringify({
    type: "event_msg",
    payload: { type: "task_complete", turn_id: "turn-late-title" }
  })}\n`, "utf8");

  assert.equal(await watcher.scanOnce(), 1);
  assert.equal(events[0].taskName, "稍后生成的任务名称");
  assert.deepEqual(resolved, ["thread-late-title"]);
});

test("session watcher does not reuse assistant output across turns", async () => {
  const root = await temporaryDirectory();
  const directory = path.join(root, "2026", "07", "28");
  await fs.mkdir(directory, { recursive: true });
  const rollout = path.join(directory, "rollout-two-turns.jsonl");
  const lines = [
    JSON.stringify({ type: "event_msg", payload: { type: "task_started", turn_id: "turn-one" } }),
    JSON.stringify({ type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "first output" }] } }),
    JSON.stringify({ type: "event_msg", payload: { type: "task_complete", turn_id: "turn-one" } }),
    JSON.stringify({ type: "event_msg", payload: { type: "task_started", turn_id: "turn-two" } }),
    JSON.stringify({ type: "event_msg", payload: { type: "task_complete", turn_id: "turn-two", error: "request failed with 503" } })
  ];
  await fs.writeFile(rollout, `${lines.join("\n")}\n`, "utf8");
  const events = [];
  const watcher = createSessionWatcher({ sessionsDir: root, onEvent: async (event) => events.push(event) });

  assert.equal(await watcher.scanOnce(), 2);
  assert.equal(events[0].finalOutput, "first output");
  assert.equal(events[1].finalOutput, null);
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

test("session watcher ignores subagents identified by session metadata", async () => {
  const root = await temporaryDirectory();
  const directory = path.join(root, "2026", "07", "28");
  await fs.mkdir(directory, { recursive: true });
  const rollout = path.join(directory, "rollout-subagent-meta.jsonl");
  const lines = [
    JSON.stringify({
      type: "session_meta",
      payload: {
        session_id: "root-thread",
        id: "child-thread",
        parent_thread_id: "root-thread",
        source: { subagent: "reviewer" },
        thread_source: "subagent",
        agent_path: "/root/reviewer"
      }
    }),
    JSON.stringify({ type: "turn_context", payload: { cwd: "C:\\work\\demo" } }),
    JSON.stringify({ type: "event_msg", payload: { type: "task_complete", turn_id: "child-turn" } })
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
