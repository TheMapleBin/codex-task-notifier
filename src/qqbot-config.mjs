import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultScriptPath = path.join(repositoryRoot, "scripts", "qqbot-config.ps1");
const MAX_OUTPUT_BYTES = 65_536;

function normalizeConfig(value) {
  if (!value || value.schemaVersion !== 1) return null;
  for (const name of ["appId", "appSecret", "openId"]) {
    if (typeof value[name] !== "string" || !value[name] || value[name].length > 8_192) return null;
  }
  return Object.freeze({
    appId: value.appId,
    appSecret: value.appSecret,
    openId: value.openId
  });
}

function runPowerShell({
  configPath,
  scriptPath = defaultScriptPath,
  powershell = process.env.CODEX_NOTIFY_POWERSHELL || "pwsh.exe",
  spawnImpl = spawn,
  env = process.env
}) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(powershell, ["-NoProfile", "-File", scriptPath, "-ConfigPath", configPath], {
      cwd: repositoryRoot,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdout = [];
    let stdoutBytes = 0;
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error("QQ Bot configuration read failed."));
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
      if (code !== 0) return fail();
      settled = true;
      resolve(Buffer.concat(stdout).toString("utf8"));
    });
  });
}

export function createQQBotConfigStore(options = {}) {
  return Object.freeze({
    async read() {
      if (typeof options.configPath !== "string" || !options.configPath) {
        throw new Error("QQ Bot configuration path is required.");
      }
      const output = await runPowerShell(options);
      try {
        const config = normalizeConfig(JSON.parse(output || "{}"));
        if (!config) throw new Error("invalid");
        return config;
      } catch {
        throw new Error("QQ Bot configuration read failed.");
      }
    }
  });
}
