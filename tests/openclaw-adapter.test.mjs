import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { createOpenClawAdapter, executeOpenClaw } from "../src/adapters/openclaw.mjs";
import { createEvent } from "../src/event.mjs";
import { Outbox } from "../src/outbox.mjs";
import { temporaryDirectory, testConfig } from "./helpers.mjs";

function openClawConfig(home, overrides = {}) {
  return testConfig(home, {
    adapter: "openclaw",
    openclaw: {
      command: "openclaw",
      channel: "openclaw-weixin",
      account: "test-account",
      target: "test-peer@test-account",
      timeoutMs: 1_000,
      ...overrides
    }
  });
}

test("Windows OpenClaw execution uses the PowerShell shim without shell interpolation", async () => {
  const child = new EventEmitter();
  child.kill = () => {};
  let captured;
  const resultPromise = executeOpenClaw("openclaw", ["--message", "literal & value"], {
    timeoutMs: 1_000,
    platform: "win32",
    env: { Path: "C:\\npm", SystemRoot: "C:\\Windows" },
    existsSyncImpl: (candidate) => candidate === "C:\\npm\\openclaw.ps1",
    spawnImpl: (command, args, options) => {
      captured = { command, args, options };
      queueMicrotask(() => child.emit("exit", 0));
      return child;
    }
  });

  assert.deepEqual(await resultPromise, { started: true, exitCode: 0, timedOut: false });
  assert.equal(captured.command, "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
  assert.equal(captured.options.shell, undefined);
  assert.deepEqual(captured.args.slice(-2), ["--message", "literal & value"]);
  assert.equal(captured.args[captured.args.indexOf("-File") + 1], "C:\\npm\\openclaw.ps1");
});

test("OpenClaw adapter uses the verified CLI shape without exposing secure identifiers", async () => {
  const home = await temporaryDirectory();
  const calls = [];
  const config = openClawConfig(home);
  const adapter = createOpenClawAdapter(config, {
    execute: async (command, args, options) => {
      calls.push({ command, args, options });
      return { started: true, exitCode: 0, timedOut: false };
    }
  });
  const event = createEvent({
    source: "session-watcher",
    kind: "task_error",
    workspace: "C:\\work\\demo",
    turnId: "turn-verified-shape",
    durationMs: 2_000,
    httpStatus: 401,
    errorKind: "http_status"
  });

  assert.deepEqual(await adapter.send(event), { transport: "openclaw-cli", exitCode: 0 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args.slice(0, 8), [
    "message", "send", "--channel", "openclaw-weixin", "--account", "test-account", "--target", "test-peer@test-account"
  ]);
  assert.equal(calls[0].args.at(-1), "--json");
  assert.equal(calls[0].options.timeoutMs, 1_000);
  assert.doesNotMatch(calls[0].args[calls[0].args.indexOf("--message") + 1], /test-peer|test-account/);
});

test("OpenClaw adapter surfaces nonzero and timeout outcomes without child output", async () => {
  const home = await temporaryDirectory();
  const event = createEvent({ source: "session-watcher", kind: "turn_finished", turnId: "turn-failure" });
  const config = openClawConfig(home, { target: "private-target" });

  await assert.rejects(
    createOpenClawAdapter(config, { execute: async () => ({ started: true, exitCode: 17, timedOut: false }) }).send(event),
    /exited with code 17/
  );
  await assert.rejects(
    createOpenClawAdapter(config, { execute: async () => ({ started: true, exitCode: null, timedOut: true }) }).send(event),
    /timed out/
  );
  await assert.rejects(
    createOpenClawAdapter(config, { execute: async () => { throw new Error("private-target"); } }).send(event),
    (error) => !error.message.includes("private-target") && /could not start/.test(error.message)
  );
});

test("OpenClaw offline delivery remains queued and retries after command recovery", async () => {
  const home = await temporaryDirectory();
  const config = openClawConfig(home, { timeoutMs: 50 });
  const outbox = new Outbox(config);
  await outbox.init();
  const event = createEvent({ source: "session-watcher", kind: "task_error", turnId: "turn-retry", errorKind: "connection_failed" });
  await outbox.enqueue(event);

  let online = false;
  const adapter = createOpenClawAdapter(config, {
    execute: async () => ({ started: true, exitCode: online ? 0 : 1, timedOut: false })
  });
  await outbox.processDue(adapter, new Date());
  assert.equal((await outbox.counts()).pending, 1);

  online = true;
  await outbox.processDue(adapter, new Date(Date.now() + 100));
  assert.deepEqual(await outbox.counts(), { pending: 0, delivered: 1, failed: 0, incoming: 0 });
});
