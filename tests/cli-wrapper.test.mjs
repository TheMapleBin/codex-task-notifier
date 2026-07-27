import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";

import { runCodexExec } from "../src/cli-wrapper.mjs";
import { createNotifierService } from "../src/notifier-service.mjs";
import { temporaryDirectory, testConfig, unusedPort } from "./helpers.mjs";

function captureStream() {
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  return { stream, text: () => Buffer.concat(chunks).toString("utf8") };
}

function syntheticSpawn({ output = "", errorOutput = "", code = 0, signal = null }, calls) {
  return (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    queueMicrotask(() => {
      if (output) child.stdout.write(output);
      if (errorOutput) child.stderr.write(errorOutput);
      child.stdout.end();
      child.stderr.end();
      child.emit("close", code, signal);
    });
    return child;
  };
}

async function startCaptureService(home) {
  const servicePort = await unusedPort();
  const delivered = [];
  const config = testConfig(home, { servicePort, pollIntervalMs: 60_000 });
  const service = createNotifierService(config, {
    adapter: { name: "capture", send: async (event) => delivered.push(event) }
  });
  await service.start();
  return { config, service, delivered };
}

test("CLI wrapper lets a nonzero child exit override a stale completed JSONL record", async () => {
  const home = await temporaryDirectory();
  const { config, service, delivered } = await startCaptureService(home);
  const stdout = captureStream();
  const stderr = captureStream();
  const calls = [];
  const output = '{"type":"thread.started","thread_id":"thread-demo"}\n{"type":"item.completed","item":{"id":"item-1","type":"agent_message","text":"final output\\nsecond line"}}\n{"type":"turn.completed"}\n';
  const errorOutput = "codex stderr passthrough\n";
  try {
    const result = await runCodexExec(["implement something"], {
      config,
      cwd: "D:\\work\\demo",
      stdout: stdout.stream,
      stderr: stderr.stream,
      spawnImpl: syntheticSpawn({ output, errorOutput, code: 47 }, calls)
    });
    await service.tick();
    assert.equal(result.code, 47);
    assert.equal(stdout.text(), output);
    assert.equal(stderr.text(), errorOutput);
    assert.deepEqual(calls[0].args, ["exec", "--json", "implement something"]);
    assert.equal(calls[0].options.env.CODEX_NOTIFY_CLI_WRAPPER, "1");
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].kind, "task_error");
    assert.equal(delivered[0].errorKind, "exit_code");
    assert.equal(delivered[0].errorCode, "EXIT_47");
    assert.equal(delivered[0].workspace, "demo");
    assert.equal(delivered[0].finalOutput, "final output\nsecond line");
  } finally {
    await service.close();
  }
});

test("CLI wrapper reports an observed SIGINT as an interrupted task", async () => {
  const home = await temporaryDirectory();
  const { config, service, delivered } = await startCaptureService(home);
  const stdout = captureStream();
  const calls = [];
  try {
    const result = await runCodexExec(["long task"], {
      config,
      cwd: "D:\\work\\demo",
      stdout: stdout.stream,
      spawnImpl: syntheticSpawn({ output: '{"type":"thread.started","thread_id":"thread-stop"}\n', code: null, signal: "SIGINT" }, calls)
    });
    await service.tick();
    assert.equal(result.code, 130);
    assert.match(stdout.text(), /thread-stop/);
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].kind, "turn_interrupted");
    assert.equal(delivered[0].errorCode, "SIGINT");
  } finally {
    await service.close();
  }
});

test("CLI wrapper preserves the child exit code when local capture falls back to disk", async () => {
  const home = await temporaryDirectory();
  const config = testConfig(home, { servicePort: await unusedPort() });
  const calls = [];
  const result = await runCodexExec(["failing task"], {
    config,
    cwd: "D:\\work\\demo",
    spawnImpl: syntheticSpawn({ code: 23 }, calls)
  });
  assert.equal(result.code, 23);
  const incoming = path.join(home, "incoming");
  const files = await fs.readdir(incoming);
  assert.equal(files.length, 1);
  const event = JSON.parse(await fs.readFile(path.join(incoming, files[0]), "utf8"));
  assert.equal(event.kind, "task_error");
  assert.equal(event.errorCode, "EXIT_23");
});
