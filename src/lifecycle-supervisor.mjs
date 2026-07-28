import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const controlScript = path.join(repositoryRoot, "scripts", "notifier-control.ps1");
const controlRoot = path.resolve(process.env.CODEX_NOTIFY_CONTROL_HOME || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "CodexWeChatNotifier"));
const runDirectory = path.join(controlRoot, "run");
const logDirectory = path.join(controlRoot, "logs");
const pidPath = path.join(runDirectory, "lifecycle.pid.json");
const logPath = path.join(logDirectory, "lifecycle.log");

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, "utf8");
  await fs.rm(filePath, { force: true });
  await fs.rename(temporary, filePath);
}

async function appendLog(message) {
  await fs.mkdir(logDirectory, { recursive: true });
  await fs.appendFile(logPath, `${new Date().toISOString()} ${message}\n`, "utf8");
}

async function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function claimSingleInstance() {
  try {
    const record = JSON.parse(await fs.readFile(pidPath, "utf8"));
    if (record.pid !== process.pid && await processExists(record.pid)) return false;
  } catch {
    // A missing or stale PID file is replaced below.
  }
  await writeJsonAtomic(pidPath, { schemaVersion: 1, pid: process.pid, startedAt: new Date().toISOString(), repositoryRoot });
  return true;
}

function control(action) {
  if (process.env.CODEX_NOTIFY_LIFECYCLE_CONTROL_LOG) {
    return fs.appendFile(process.env.CODEX_NOTIFY_LIFECYCLE_CONTROL_LOG, `${action}\n`, "utf8");
  }
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", controlScript, "-Action", action], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    stdio: "ignore"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Notifier control action failed: ${action}`);
}

async function main() {
  if (!await claimSingleInstance()) return;
  try {
    await control("Start");
    await appendLog("watcher=start mode=resident");
  } finally {
    await fs.rm(pidPath, { force: true });
  }
}

main().catch(async (error) => {
  await appendLog(`error=${String(error?.code || error?.name || "unknown").slice(0, 64)}`).catch(() => {});
  process.exitCode = 1;
});
