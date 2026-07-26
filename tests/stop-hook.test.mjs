import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createNotifierService } from "../src/notifier-service.mjs";
import { temporaryDirectory, testConfig, unusedPort } from "./helpers.mjs";

function runPowerShellHook(scriptPath, event, env) {
  return new Promise((resolve, reject) => {
    const child = spawn("pwsh", ["-NoProfile", "-File", scriptPath], { env, stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Stop hook exited ${code}: ${stderr}`));
    });
    child.stdin.end(JSON.stringify(event));
  });
}

test("PowerShell Stop hook sends only a minimal loopback event", async () => {
  const home = await temporaryDirectory();
  const servicePort = await unusedPort();
  const delivered = [];
  const service = createNotifierService(testConfig(home, { servicePort, stopHoldMs: 0 }), {
    adapter: { name: "capture", send: async (event) => delivered.push(event) }
  });
  await service.start();
  try {
    await runPowerShellHook(
      fileURLToPath(new URL("../scripts/codex-stop-hook.ps1", import.meta.url)),
      { session_id: "session-test", turn_id: "turn-test", cwd: "D:\\private\\demo" },
      {
        ...process.env,
        CODEX_NOTIFY_HOME: home,
        CODEX_NOTIFY_ENDPOINT: `http://127.0.0.1:${servicePort}/v1/events`,
        CODEX_NOTIFY_CLI_WRAPPER: ""
      }
    );
    await service.tick();
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].source, "stop-hook");
    assert.equal(delivered[0].workspace, "demo");
    assert.equal(delivered[0].kind, "turn_stopped");
  } finally {
    await service.close();
  }
});

test("PowerShell Stop hook falls back to a local incoming record when the service is unavailable", async () => {
  const home = await temporaryDirectory();
  const unavailablePort = await unusedPort();
  await runPowerShellHook(
    fileURLToPath(new URL("../scripts/codex-stop-hook.ps1", import.meta.url)),
    { session_id: "session-fallback", turn_id: "turn-fallback", cwd: "D:\\private\\demo" },
    {
      ...process.env,
      CODEX_NOTIFY_HOME: home,
      CODEX_NOTIFY_ENDPOINT: `http://127.0.0.1:${unavailablePort}/v1/events`,
      CODEX_NOTIFY_CLI_WRAPPER: ""
    }
  );
  const incoming = path.join(home, "incoming");
  const files = await fs.readdir(incoming);
  assert.equal(files.length, 1);
  const event = JSON.parse(await fs.readFile(path.join(incoming, files[0]), "utf8"));
  assert.equal(event.source, "stop-hook");
  assert.equal(event.kind, "turn_stopped");
  assert.equal(event.workspace, "demo");
});
