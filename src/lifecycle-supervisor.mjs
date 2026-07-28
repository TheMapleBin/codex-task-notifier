import { execFile, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const controlScript = path.join(repositoryRoot, "scripts", "notifier-control.ps1");
const controlRoot = path.resolve(process.env.CODEX_NOTIFY_CONTROL_HOME || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "CodexWeChatNotifier"));
const runDirectory = path.join(controlRoot, "run");
const logDirectory = path.join(controlRoot, "logs");
const pidPath = path.join(runDirectory, "lifecycle.pid.json");
const logPath = path.join(logDirectory, "lifecycle.log");
const pollMs = integerOption("--poll-ms", 2_000, 100, 60_000);
const idleGraceMs = integerOption("--idle-grace-ms", 30_000, 0, 600_000);
const keepAliveMs = integerOption("--keepalive-ms", 30_000, 5_000, 600_000);
const maxIterations = integerOption("--max-iterations", 0, 0, 1_000_000);

function integerOption(name, fallback, min, max) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const parsed = Number.parseInt(process.argv[index + 1], 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return parsed;
}

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

async function fixtureStates() {
  if (!process.env.CODEX_NOTIFY_LIFECYCLE_PROCESS_FIXTURE) return null;
  const parsed = JSON.parse(await fs.readFile(process.env.CODEX_NOTIFY_LIFECYCLE_PROCESS_FIXTURE, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("Lifecycle process fixture must be an array.");
  return parsed.map(Boolean);
}

async function codexActive(iteration, states) {
  if (states) return states.length ? states[Math.min(iteration, states.length - 1)] : false;
  const { stdout } = await execFileAsync("tasklist.exe", ["/FI", "IMAGENAME eq codex.exe", "/NH", "/FO", "CSV"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 5_000
  });
  return /"codex\.exe"/i.test(stdout);
}

function control(action) {
  if (process.env.CODEX_NOTIFY_LIFECYCLE_CONTROL_LOG) {
    return fs.appendFile(process.env.CODEX_NOTIFY_LIFECYCLE_CONTROL_LOG, `${action}\n`, "utf8");
  }
  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", controlScript, "-Action", action];
  let result = spawnSync(process.env.CODEX_NOTIFY_POWERSHELL || "pwsh.exe", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    stdio: "ignore"
  });
  if (result.error?.code === "ENOENT") {
    result = spawnSync("powershell.exe", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
      stdio: "ignore"
    });
  }
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Notifier control action failed: ${action}`);
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  if (!await claimSingleInstance()) return;
  const states = await fixtureStates();
  let iteration = 0;
  let lastActiveAt = null;
  let lastDesired = null;
  let nextKeepAliveAt = 0;
  let lastKeepAliveOk = null;
  try {
    while (maxIterations === 0 || iteration < maxIterations) {
      const now = Date.now();
      const active = await codexActive(iteration, states);
      if (active) lastActiveAt = now;
      const desired = active || (lastActiveAt != null && now - lastActiveAt < idleGraceMs);
      if (desired !== lastDesired) {
        const action = desired ? "Start" : "Stop";
        await control(action);
        await appendLog(`watcher=${action.toLowerCase()} codex=${active ? "active" : "inactive"}`);
        lastDesired = desired;
      }
      if (now >= nextKeepAliveAt) {
        try {
          await control("KeepAlive");
          if (lastKeepAliveOk !== true) await appendLog("keepalive=ok");
          lastKeepAliveOk = true;
        } catch (error) {
          if (lastKeepAliveOk !== false) {
            await appendLog(`keepalive=failed code=${String(error?.code || error?.name || "unknown").slice(0, 64)}`);
          }
          lastKeepAliveOk = false;
        }
        nextKeepAliveAt = Date.now() + keepAliveMs;
      }
      iteration += 1;
      if (maxIterations === 0 || iteration < maxIterations) await sleep(pollMs);
    }
  } finally {
    await fs.rm(pidPath, { force: true });
  }
}

main().catch(async (error) => {
  await appendLog(`error=${String(error?.code || error?.name || "unknown").slice(0, 64)}`).catch(() => {});
  process.exitCode = 1;
});
