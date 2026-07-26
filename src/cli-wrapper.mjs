import { StringDecoder } from "node:string_decoder";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { loadConfig } from "./config.mjs";
import { sendEventToLocalService } from "./event-client.mjs";

export class JsonlParser {
  constructor(onRecord) {
    this.onRecord = onRecord;
    this.decoder = new StringDecoder("utf8");
    this.pending = "";
  }

  push(chunk) {
    this.pending += this.decoder.write(chunk);
    this.#drainLines();
  }

  end() {
    this.pending += this.decoder.end();
    if (this.pending.trim()) this.#parseLine(this.pending);
    this.pending = "";
  }

  #drainLines() {
    let newlineIndex;
    while ((newlineIndex = this.pending.indexOf("\n")) >= 0) {
      const line = this.pending.slice(0, newlineIndex);
      this.pending = this.pending.slice(newlineIndex + 1);
      this.#parseLine(line);
    }
  }

  #parseLine(line) {
    if (!line.trim()) return;
    try {
      this.onRecord(JSON.parse(line));
    } catch {
      // Keep Codex stdout byte-for-byte visible even if a future version adds
      // a non-JSON status line to --json output.
    }
  }
}

function terminalFromRecord(record, state) {
  if (record.type === "thread.started" && record.thread_id) {
    state.threadId = String(record.thread_id);
    return;
  }
  if (record.type === "turn.completed") {
    state.terminal = { kind: "turn_finished", errorKind: null, errorCode: null };
    return;
  }
  if (record.type === "turn.failed" || record.type === "error") {
    const code = record.error?.code || record.code || record.type;
    state.terminal = { kind: "task_error", errorKind: "unknown", errorCode: String(code).slice(0, 120) };
  }
}

function normalizedExecArgs(args) {
  const effective = args[0] === "--" ? args.slice(1) : args.slice();
  if (!effective.includes("--json")) effective.unshift("--json");
  return effective;
}

function exitCodeForSignal(signal) {
  return ({ SIGHUP: 129, SIGINT: 130, SIGTERM: 143 })[signal] || 1;
}

function terminalForExit(state, exitResult) {
  if (exitResult.signal) {
    return {
      kind: "turn_interrupted",
      errorKind: "unknown",
      errorCode: String(exitResult.signal).slice(0, 120)
    };
  }
  if (exitResult.code !== 0 && state.terminal?.kind !== "task_error") {
    return {
      kind: "task_error",
      errorKind: "exit_code",
      errorCode: exitResult.spawnError ? "CODEX_SPAWN_FAILED" : `EXIT_${exitResult.code}`
    };
  }
  return state.terminal || { kind: "turn_finished", errorKind: null, errorCode: null };
}

export async function runCodexExec(args, {
  config = loadConfig(),
  spawnImpl = spawn,
  stdout = process.stdout,
  stderr = process.stderr,
  cwd = process.cwd(),
  env = process.env
} = {}) {
  const state = { threadId: null, terminal: null };
  const child = spawnImpl(env.CODEX_BIN || "codex", ["exec", ...normalizedExecArgs(args)], {
    cwd,
    env: { ...env, CODEX_NOTIFY_CLI_WRAPPER: "1" },
    stdio: ["inherit", "pipe", "pipe"]
  });
  const parser = new JsonlParser((record) => terminalFromRecord(record, state));

  child.stdout.on("data", (chunk) => {
    stdout.write(chunk);
    parser.push(chunk);
  });
  child.stderr.on("data", (chunk) => stderr.write(chunk));

  const exitResult = await new Promise((resolve) => {
    child.once("error", (error) => resolve({ code: 1, spawnError: error }));
    child.once("close", (code, signal) => resolve({ code: code ?? (signal ? exitCodeForSignal(signal) : 1), signal }));
  });
  parser.end();

  const terminal = terminalForExit(state, exitResult);
  try {
    await sendEventToLocalService(config, {
      source: "cli-wrapper",
      kind: terminal.kind,
      surface: "cli",
      workspace: cwd,
      turnId: state.threadId,
      correlationKey: state.threadId ? `cli:${state.threadId}` : null,
      errorKind: terminal.errorKind,
      errorCode: terminal.errorCode
    });
  } catch (error) {
    // Notification capture is intentionally fail-open: it must not rewrite the
    // exit status that callers use to determine the Codex task outcome.
    stderr.write(`[codex-notify] notification capture failed: ${String(error.message || error)}\n`);
  }
  return exitResult;
}

async function main() {
  const result = await runCodexExec(process.argv.slice(2));
  process.exitCode = result.code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`[codex-notify] CLI wrapper failed: ${String(error.message || error)}\n`);
    process.exitCode = 1;
  });
}
