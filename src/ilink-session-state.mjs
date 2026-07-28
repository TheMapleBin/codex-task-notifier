import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultScriptPath = path.join(repositoryRoot, "scripts", "ilink-session-state.ps1");
const MAX_OUTPUT_BYTES = 65_536;

function validOptionalString(value, maximumLength) {
  return value == null || (typeof value === "string" && value.length <= maximumLength);
}

function normalizeState(value) {
  if (!value || value.schemaVersion !== 1) return null;
  if (!validOptionalString(value.wechatUin, 512)) return null;
  if (!validOptionalString(value.cursor, 16_384)) return null;
  if (!validOptionalString(value.toUserId, 4_096)) return null;
  if (!validOptionalString(value.contextToken, 16_384)) return null;
  return Object.freeze({
    schemaVersion: 1,
    wechatUin: value.wechatUin || null,
    cursor: value.cursor || "",
    toUserId: value.toUserId || null,
    contextToken: value.contextToken || null
  });
}

function runPowerShell(action, input, { scriptPath = defaultScriptPath, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-Action", action], {
      cwd: repositoryRoot,
      env,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const stdout = [];
    let stdoutBytes = 0;
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error("iLink session state operation failed."));
    };
    child.once("error", fail);
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_OUTPUT_BYTES) {
        child.kill();
        fail();
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.resume();
    child.once("close", (code) => {
      if (settled) return;
      if (code !== 0) {
        fail();
        return;
      }
      settled = true;
      resolve(Buffer.concat(stdout).toString("utf8"));
    });
    child.stdin.end(input || "");
  });
}

export function createIlinkSessionStore(options = {}) {
  return Object.freeze({
    async read() {
      const output = await runPowerShell("Read", "", options);
      try {
        return normalizeState(JSON.parse(output || "{}"));
      } catch {
        throw new Error("iLink session state operation failed.");
      }
    },
    async write(value) {
      const state = normalizeState(value);
      if (!state) throw new Error("Invalid iLink session state.");
      await runPowerShell("Write", JSON.stringify(state), options);
    }
  });
}
