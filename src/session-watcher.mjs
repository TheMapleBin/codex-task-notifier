import fs from "node:fs/promises";
import path from "node:path";

import { createEvent } from "./event.mjs";

async function findRolloutFiles(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findRolloutFiles(fullPath);
    return entry.isFile() && /^rollout-.*\.jsonl$/i.test(entry.name) ? [fullPath] : [];
  }));
  return nested.flat();
}

function parseHttpStatus(error) {
  const message = typeof error === "string" ? error : typeof error?.message === "string" ? error.message : "";
  const matched = /\b([45]\d{2})\b/.exec(message);
  return matched ? Number(matched[1]) : null;
}

function errorKind(error, httpStatus) {
  if (httpStatus) return "http_status";
  const category = String(error?.codex_error_info || error?.code || "").toLowerCase();
  if (["connection_failed", "timeout", "stream_error", "exit_code"].includes(category)) return category;
  const message = typeof error === "string" ? error : typeof error?.message === "string" ? error.message : "";
  if (/timeout/i.test(message)) return "timeout";
  if (/(connection|network)/i.test(message)) return "connection_failed";
  return "unknown";
}

function assistantOutput(record) {
  const payload = record?.type === "response_item" ? record.payload : null;
  if (payload?.type !== "message" || payload.role !== "assistant" || !Array.isArray(payload.content)) return null;
  const parts = payload.content
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .filter((text) => text.trim());
  return parts.length ? parts.join("\n") : null;
}

function terminalEvent(record, state) {
  if (record?.type !== "event_msg" || !record.payload) return null;
  const payload = record.payload;
  const turnId = payload.turn_id || payload.turnId || null;
  const common = {
    source: "session-watcher",
    occurredAt: payload.completed_at || record.timestamp || new Date().toISOString(),
    workspace: state.workspace,
    taskName: state.taskName,
    surface: "unknown",
    turnId,
    durationMs: payload.duration_ms,
    correlationKey: turnId ? `turn:${turnId}` : null,
    finalOutput: !turnId || state.turnId === turnId ? state.lastAssistantOutput : null
  };
  if (payload.type === "task_complete") {
    if (payload.error) {
      const status = parseHttpStatus(payload.error);
      return {
        ...common,
        kind: "task_error",
        severity: "error",
        httpStatus: status,
        errorKind: errorKind(payload.error, status)
      };
    }
    return { ...common, kind: "turn_finished" };
  }
  if (payload.type === "turn_aborted") {
    return {
      ...common,
      kind: "turn_interrupted",
      severity: "warning",
      errorKind: "unknown"
    };
  }
  return null;
}

export function createSessionWatcher({ sessionsDir, onEvent, pollIntervalMs = 1_000, excludeSubagents = true, resolveTaskName = async () => null }) {
  const states = new Map();
  let timer = null;
  let scanning = false;

  function updateContext(record, state) {
    if (record.type === "session_meta") {
      state.threadId = record.payload?.id || record.payload?.session_id || state.threadId;
    }
    const startedTurnId = record.type === "event_msg" && record.payload?.type === "task_started"
      ? record.payload?.turn_id || record.payload?.turnId
      : record.type === "turn_context"
        ? record.payload?.turn_id || record.payload?.turnId
        : null;
    if (startedTurnId && startedTurnId !== state.turnId) {
      state.turnId = startedTurnId;
      state.lastAssistantOutput = null;
    }
    if (record.type === "turn_context") {
      state.workspace = record.payload?.cwd || state.workspace;
      state.subagent ||= Boolean(record.payload?.parent_thread_id || record.payload?.agent_path);
    }
    const output = assistantOutput(record);
    if (output) state.lastAssistantOutput = output;
  }

  function initialState(offset = 0) {
    return {
      offset,
      pending: "",
      emitted: new Set(),
      workspace: null,
      threadId: null,
      taskName: undefined,
      subagent: false,
      turnId: null,
      lastAssistantOutput: null
    };
  }

  async function primeExisting() {
    for (const filePath of await findRolloutFiles(sessionsDir)) {
      const content = await fs.readFile(filePath);
      const state = initialState(content.length);
      const lines = content.toString("utf8").split("\n");
      state.pending = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          updateContext(JSON.parse(line), state);
        } catch {
          // Keep the last valid context and wait for later complete records.
        }
      }
      states.set(filePath, state);
    }
  }

  async function scanOnce() {
    if (scanning) return 0;
    scanning = true;
    let emitted = 0;
    try {
      for (const filePath of await findRolloutFiles(sessionsDir)) {
        const stat = await fs.stat(filePath);
        const state = states.get(filePath) || initialState();
        if (stat.size < state.offset) {
          state.offset = 0;
          state.pending = "";
          state.emitted.clear();
          state.workspace = null;
          state.threadId = null;
          state.taskName = undefined;
          state.subagent = false;
          state.turnId = null;
          state.lastAssistantOutput = null;
        }
        if (stat.size === state.offset) {
          states.set(filePath, state);
          continue;
        }
        const content = await fs.readFile(filePath);
        const appended = content.subarray(state.offset).toString("utf8");
        state.offset = content.length;
        const lines = `${state.pending}${appended}`.split("\n");
        state.pending = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let record;
          try {
            record = JSON.parse(line);
          } catch {
            continue;
          }
          updateContext(record, state);
          if (excludeSubagents && state.subagent) continue;
          let eventInput = terminalEvent(record, state);
          if (!eventInput) continue;
          if (state.threadId) {
            state.taskName = await resolveTaskName(state.threadId);
            eventInput = terminalEvent(record, state);
          }
          const event = createEvent(eventInput);
          if (state.emitted.has(event.id)) continue;
          state.emitted.add(event.id);
          await onEvent(event);
          emitted += 1;
        }
        states.set(filePath, state);
      }
    } finally {
      scanning = false;
    }
    return emitted;
  }

  async function start() {
    if (timer) return 0;
    await primeExisting();
    timer = setInterval(() => {
      scanOnce().catch((error) => process.stderr.write(`[codex-notify] session watcher: ${String(error.message || error)}\n`));
    }, pollIntervalMs);
    timer.unref();
    return 0;
  }

  function close() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return Object.freeze({ scanOnce, start, close });
}
