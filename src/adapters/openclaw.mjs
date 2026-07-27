import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { win32 as windowsPath } from "node:path";

import { formatEventForDelivery } from "../event.mjs";

function windowsPowerShellShim(command, env, existsSyncImpl) {
  const extension = windowsPath.extname(command).toLowerCase();
  if (!["", ".bat", ".cmd", ".ps1"].includes(extension)) return null;

  const base = extension ? command.slice(0, -extension.length) : command;
  const shimName = `${windowsPath.basename(base)}.ps1`;
  const candidates = [];
  if (windowsPath.isAbsolute(command) || /[\\/]/.test(command)) {
    candidates.push(windowsPath.join(windowsPath.dirname(command), shimName));
  } else {
    const pathValue = env.Path || env.PATH || "";
    for (const entry of pathValue.split(windowsPath.delimiter)) {
      const directory = entry.trim().replace(/^"|"$/g, "");
      if (directory) candidates.push(windowsPath.join(directory, shimName));
    }
  }
  return candidates.find((candidate) => existsSyncImpl(candidate)) || null;
}

function resolveInvocation(command, args, { platform, env, existsSyncImpl }) {
  if (platform !== "win32") return { command, args };

  const extension = windowsPath.extname(command).toLowerCase();
  const shim = windowsPowerShellShim(command, env, existsSyncImpl);
  if (shim) {
    const systemRoot = env.SystemRoot || env.SYSTEMROOT || "C:\\Windows";
    return {
      command: windowsPath.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
      args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", shim, ...args]
    };
  }
  if ([".bat", ".cmd", ".ps1"].includes(extension)) {
    throw new Error("Windows script wrapper has no safe PowerShell shim.");
  }
  return { command, args };
}

export function executeOpenClaw(command, args, {
  timeoutMs,
  spawnImpl = spawn,
  platform = process.platform,
  env = process.env,
  existsSyncImpl = existsSync
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const settle = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    let child;
    try {
      const invocation = resolveInvocation(command, args, { platform, env, existsSyncImpl });
      child = spawnImpl(invocation.command, invocation.args, { stdio: "ignore", windowsHide: true });
    } catch {
      settle({ started: false, exitCode: null, timedOut: false });
      return;
    }

    timer = setTimeout(() => {
      child.kill();
      settle({ started: true, exitCode: null, timedOut: true });
    }, timeoutMs);
    timer.unref?.();

    child.once("error", () => settle({ started: false, exitCode: null, timedOut: false }));
    child.once("exit", (exitCode) => settle({ started: true, exitCode, timedOut: false }));
  });
}

function deliveryError(result) {
  if (result?.timedOut) {
    return new Error("OpenClaw delivery command timed out.");
  }
  if (!result?.started) {
    return new Error("OpenClaw delivery command could not start.");
  }
  if (!Number.isInteger(result.exitCode) || result.exitCode !== 0) {
    return new Error(`OpenClaw delivery command exited with code ${result?.exitCode ?? "unknown"}.`);
  }
  return null;
}

export function createOpenClawAdapter(config, { execute = executeOpenClaw } = {}) {
  const settings = config.openclaw;
  if (!settings?.account || !settings?.target) {
    throw new Error("OpenClaw delivery requires secure account and target configuration.");
  }

  return Object.freeze({
    name: "openclaw-cli",
    async send(event) {
      const args = [
        "message",
        "send",
        "--channel",
        settings.channel,
        "--account",
        settings.account,
        "--target",
        settings.target,
        "--message",
        formatEventForDelivery(event),
        "--json"
      ];
      let result;
      try {
        result = await execute(settings.command, args, { timeoutMs: settings.timeoutMs });
      } catch {
        throw new Error("OpenClaw delivery command could not start.");
      }
      const error = deliveryError(result);
      if (error) throw error;
      return { transport: "openclaw-cli", exitCode: 0 };
    }
  });
}
