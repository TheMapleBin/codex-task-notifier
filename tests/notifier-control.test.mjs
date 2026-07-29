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

test("configure stores direct iLink credentials and context without exposing them", async () => {
  const controlHome = await temporaryDirectory();
  const fixturePath = path.join(controlHome, "ilink-setup.json");
  const fixture = { botToken: "test-token", baseUrl: "https://ilinkai.weixin.qq.com", toUserId: "test-user", contextToken: "test-context" };
  await fs.mkdir(controlHome, { recursive: true });
  await fs.writeFile(fixturePath, JSON.stringify(fixture));

  const env = {
    ...process.env,
    CODEX_NOTIFY_CONTROL_HOME: controlHome,
    CODEX_NOTIFY_ILINK_SETUP_FIXTURE: fixturePath
  };
  const configured = runControl("Configure", env);
  assert.equal(configured.status, 0, configured.stderr);
  assert.doesNotMatch(`${configured.stdout}${configured.stderr}`, /test-token|test-user|test-context/);

  const configPath = path.join(controlHome, "secure", "weixin-ilink.dpapi.json");
  const inspect = spawnSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "Add-Type -AssemblyName System.Security;$c=Get-Content -LiteralPath $env:TEST_CONFIG -Raw|ConvertFrom-Json;$e=[Text.Encoding]::UTF8.GetBytes('CodexWeChatNotifier/v1');function unprotectTest([string]$v){$b=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($v),$e,[Security.Cryptography.DataProtectionScope]::CurrentUser);try{return [Text.Encoding]::UTF8.GetString($b)}finally{[Array]::Clear($b,0,$b.Length)}};$bot=unprotectTest ([string]$c.botToken);$base=unprotectTest ([string]$c.baseUrl);$user=unprotectTest ([string]$c.toUserId);$context=unprotectTest ([string]$c.contextToken);[pscustomobject]@{schemaVersion=$c.schemaVersion;transport=$c.transport;matches=($bot -ceq 'test-token' -and $base -ceq 'https://ilinkai.weixin.qq.com' -and $user -ceq 'test-user' -and $context -ceq 'test-context')}|ConvertTo-Json -Compress"
  ], {
    env: { ...env, TEST_CONFIG: configPath },
    encoding: "utf8"
  });
  assert.equal(inspect.status, 0, inspect.stderr);
  assert.deepEqual(JSON.parse(inspect.stdout), { schemaVersion: 2, transport: "weixin-ilink", matches: true });
});

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
    CODEX_NOTIFY_POLL_MS: "100",
    CODEX_NOTIFY_ILINK_POLL_ENABLED: "false"
  };
  const setup = spawnSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "Add-Type -AssemblyName System.Security; function p([string]$v){$b=[Text.Encoding]::UTF8.GetBytes($v);$e=[Text.Encoding]::UTF8.GetBytes('CodexWeChatNotifier/v1');try{[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($b,$e,[Security.Cryptography.DataProtectionScope]::CurrentUser))}finally{[Array]::Clear($b,0,$b.Length);[Array]::Clear($e,0,$e.Length)}}; @{schemaVersion=2;transport='weixin-ilink';botToken=(p 'test-token');baseUrl=(p 'https://ilinkai.weixin.qq.com');toUserId=(p 'test-user');contextToken=(p 'test-context')} | ConvertTo-Json -Compress | Set-Content -LiteralPath $env:TEST_CONFIG -Encoding UTF8"
  ], {
    env: { ...env, TEST_CONFIG: path.join(secureDirectory, "weixin-ilink.dpapi.json") },
    encoding: "utf8"
  });
  assert.equal(setup.status, 0, setup.stderr);

  try {
    const started = runControl("Start", env);
    assert.equal(started.status, 0, started.stderr);
    assert.match(started.stdout, /Notifier started/);
    assert.doesNotMatch(`${started.stdout}${started.stderr}`, /test-token|test-user|test-context/);

    const duplicate = runControl("Start", env);
    assert.equal(duplicate.status, 0, duplicate.stderr);
    assert.match(duplicate.stdout, /already running/);

    const status = runControl("Status", env);
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /Configured: yes/);
    assert.match(status.stdout, /Running: yes/);
    assert.doesNotMatch(`${status.stdout}${status.stderr}`, /test-token|test-user|test-context/);
  } finally {
    runControl("Stop", env);
  }

  const stopped = runControl("Status", env);
  assert.equal(stopped.status, 0, stopped.stderr);
  assert.match(stopped.stdout, /Running: no/);
});

test("production control starts the watcher with protected WeChat test-account credentials", async () => {
  const controlHome = await temporaryDirectory();
  const sessionsDir = path.join(controlHome, "sessions");
  const secureDirectory = path.join(controlHome, "secure");
  await fs.mkdir(sessionsDir, { recursive: true });
  await fs.mkdir(secureDirectory, { recursive: true });
  const configPath = path.join(secureDirectory, "wechat-test-account.dpapi.json");
  const selectorPath = path.join(secureDirectory, "active-transport.json");
  const env = {
    ...process.env,
    CODEX_NOTIFY_CONTROL_HOME: controlHome,
    CODEX_NOTIFY_SESSIONS_DIR: sessionsDir,
    CODEX_NOTIFY_POLL_MS: "100"
  };
  const setup = spawnSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "Add-Type -AssemblyName System.Security; function p([string]$v){$b=[Text.Encoding]::UTF8.GetBytes($v);$e=[Text.Encoding]::UTF8.GetBytes('CodexWeChatNotifier/v1');try{[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($b,$e,[Security.Cryptography.DataProtectionScope]::CurrentUser))}finally{[Array]::Clear($b,0,$b.Length);[Array]::Clear($e,0,$e.Length)}}; @{schemaVersion=1;transport='wechat-test-account';appId=(p 'stored-app');appSecret=(p 'stored-secret');openId=(p 'stored-user');templateId=(p 'stored-template')} | ConvertTo-Json -Compress | Set-Content -LiteralPath $env:TEST_CONFIG -Encoding UTF8"
  ], {
    env: { ...env, TEST_CONFIG: configPath },
    encoding: "utf8"
  });
  assert.equal(setup.status, 0, setup.stderr);
  await fs.writeFile(selectorPath, JSON.stringify({ schemaVersion: 1, transport: "wechat-test-account" }));

  try {
    const started = runControl("Start", env);
    assert.equal(started.status, 0, started.stderr);
    assert.match(started.stdout, /Notifier started/);
    assert.doesNotMatch(`${started.stdout}${started.stderr}`, /stored-app|stored-secret|stored-user|stored-template/);
    const status = runControl("Status", env);
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /WeChat Official Account test account/);
    assert.match(status.stdout, /Running: yes/);
  } finally {
    runControl("Stop", env);
  }
});

test("production control selects QQ Bot without exposing its protected configuration", async () => {
  const controlHome = await temporaryDirectory();
  const secureDirectory = path.join(controlHome, "secure");
  await fs.mkdir(secureDirectory, { recursive: true });
  const configPath = path.join(secureDirectory, "qqbot.dpapi.json");
  await fs.writeFile(configPath, JSON.stringify({
    schemaVersion: 1,
    transport: "qqbot",
    appId: "opaque-app-id",
    appSecret: "opaque-app-secret",
    openId: "opaque-open-id"
  }));
  const env = { ...process.env, CODEX_NOTIFY_CONTROL_HOME: controlHome };

  const selected = runControl("UseQQBot", env);
  assert.equal(selected.status, 0, selected.stderr);
  assert.match(selected.stdout, /direct QQ Bot/);
  assert.doesNotMatch(`${selected.stdout}${selected.stderr}`, /opaque-/);
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(secureDirectory, "active-transport.json"), "utf8")).transport,
    "qqbot"
  );

  const status = runControl("Status", env);
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /direct QQ Bot with native Gateway/);
  assert.match(status.stdout, /ClawBot keepalive: not used/);
  assert.doesNotMatch(`${status.stdout}${status.stderr}`, /opaque-/);

  const keepAlive = runControl("KeepAlive", env);
  assert.equal(keepAlive.status, 0, keepAlive.stderr);
  const keepAliveStatus = JSON.parse(await fs.readFile(path.join(controlHome, "run", "ilink-keepalive-status.json"), "utf8"));
  assert.equal(keepAliveStatus.code, "not_used");
});

test("ClawBot keepalive records only sanitized status", async () => {
  const controlHome = await temporaryDirectory();
  const fixturePath = path.join(controlHome, "keepalive.json");
  await fs.writeFile(fixturePath, JSON.stringify({ ok: true }));
  const env = {
    ...process.env,
    CODEX_NOTIFY_CONTROL_HOME: controlHome,
    CODEX_NOTIFY_ILINK_KEEPALIVE_FIXTURE: fixturePath
  };

  const result = runControl("KeepAlive", env);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(`${result.stdout}${result.stderr}`.trim(), "");
  const status = JSON.parse(await fs.readFile(path.join(controlHome, "run", "ilink-keepalive-status.json"), "utf8"));
  assert.equal(status.ok, true);
  assert.equal(status.code, "ok");
  assert.equal(Object.hasOwn(status, "token"), false);
  assert.equal(Object.hasOwn(status, "contextToken"), false);
});
