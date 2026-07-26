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
  const message = typeof error?.message === "string" ? error.message : "";
  const matched = /\b([45]\d{2})\b/.exec(message);
  return matched ? Number(matched[1]) : null;
}

function errorCode(error) {
  return String(error?.codex_error_info || error?.code || "CODEX_TASK_ERROR").slice(0, 120);
}

function terminalEvent(record, state) {
  if (record?.type !== "event_msg" || !record.payload) return null;
  const payload = record.payload;
  const turnId = payload.turn_id || payload.turnId || null;
  const common = {
    source: "session-watcher",
    occurredAt: record.timestamp || new Date().toISOString(),
    workspace: state.workspace,
    surface: "unknown",
    turnId,
    correlationKey: turnId ? `turn:${turnId}` : null
  };
  if (payload.type === "task_complete") {
    if (payload.error) {
      const status = parseHttpStatus(payload.error);
      return {
        ...common,
        kind: "task_error",
        severity: "error",
        httpStatus: status,
        errorKind: status ? "http_status" : "unknown",
        errorCode: errorCode(payload.error)
      };
    }
    return { ...common, kind: "turn_finished" };
  }
  if (payload.type === "turn_aborted") {
    return {
      ...common,
      kind: "turn_interrupted",
      severity: "warning",
      errorKind: "unknown",
      errorCode: String(payload.reason || "INTERRUPTED").slice(0, 120)
    };
  }
  return null;
}

export function createSessionWatcher({ sessionsDir, onEvent, pollIntervalMs = 1_000, excludeSubagents = true }) {
  const states = new Map();
  let timer = null;
  let scanning = false;

  async function scanOnce() {
    if (scanning) return 0;
    scanning = true;
    let emitted = 0;
    try {
      for (const filePath of await findRolloutFiles(sessionsDir)) {
        const stat = await fs.stat(filePath);
        const state = states.get(filePath) || { offset: 0, pending: "", emitted: new Set(), workspace: null, subagent: false };
        if (stat.size < state.offset) {
          state.offset = 0;
          state.pending = "";
          state.emitted.clear();
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
          if (record.type === "turn_context") {
            state.workspace = record.payload?.cwd || state.workspace;
            state.subagent ||= Boolean(record.payload?.parent_thread_id || record.payload?.agent_path);
          }
          if (excludeSubagents && state.subagent) continue;
          const eventInput = terminalEvent(record, state);
          if (!eventInput) continue;
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

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      scanOnce().catch((error) => process.stderr.write(`[codex-notify] session watcher: ${String(error.message || error)}\n`));
    }, pollIntervalMs);
    timer.unref();
    return scanOnce();
  }

  function close() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return Object.freeze({ scanOnce, start, close });
}
