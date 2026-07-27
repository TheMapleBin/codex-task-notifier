import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { temporaryDirectory } from "./helpers.mjs";

const script = path.resolve("scripts", "notifier-control.ps1");

function runControl(action, env) {
  return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Action", action], {
    cwd: path.resolve("."),
    env,
    encoding: "utf8",
    timeout: 10_000
  });
}

test("one-click control starts one isolated watcher without exposing protected values", async () => {
  const controlHome = await temporaryDirectory();
  const sessionsDir = path.join(controlHome, "sessions");
  const secureDirectory = path.join(controlHome, "secure");
  await fs.mkdir(sessionsDir, { recursive: true });
  await fs.mkdir(secureDirectory, { recursive: true });

  const env = {
    ...process.env,
    CODEX_NOTIFY_CONTROL_HOME: controlHome,
    CODEX_NOTIFY_SESSIONS_DIR: sessionsDir,
    CODEX_NOTIFY_POLL_MS: "100"
  };
  const setup = spawnSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "Add-Type -AssemblyName System.Security; function p([string]$v){$b=[Text.Encoding]::UTF8.GetBytes($v);$e=[Text.Encoding]::UTF8.GetBytes('CodexOpenClawNotifier/v1');try{[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($b,$e,[Security.Cryptography.DataProtectionScope]::CurrentUser))}finally{[Array]::Clear($b,0,$b.Length);[Array]::Clear($e,0,$e.Length)}}; @{schemaVersion=1;account=(p 'test-account');target=(p 'test-target')} | ConvertTo-Json -Compress | Set-Content -LiteralPath $env:TEST_CONFIG -Encoding UTF8"
  ], {
    env: { ...env, TEST_CONFIG: path.join(secureDirectory, "openclaw.dpapi.json") },
    encoding: "utf8"
  });
  assert.equal(setup.status, 0, setup.stderr);

  try {
    const started = runControl("Start", env);
    assert.equal(started.status, 0, started.stderr);
    assert.match(started.stdout, /Notifier started/);
    assert.doesNotMatch(`${started.stdout}${started.stderr}`, /test-account|test-target/);

    const duplicate = runControl("Start", env);
    assert.equal(duplicate.status, 0, duplicate.stderr);
    assert.match(duplicate.stdout, /already running/);

    const status = runControl("Status", env);
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /Configured: yes/);
    assert.match(status.stdout, /Running: yes/);
    assert.doesNotMatch(`${status.stdout}${status.stderr}`, /test-account|test-target/);
  } finally {
    runControl("Stop", env);
  }

  const stopped = runControl("Status", env);
  assert.equal(stopped.status, 0, stopped.stderr);
  assert.match(stopped.stdout, /Running: no/);
});
