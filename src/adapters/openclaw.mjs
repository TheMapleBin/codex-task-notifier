import { spawn } from "node:child_process";

import { formatEventForDelivery } from "../event.mjs";

function executeOpenClaw(command, args, { timeoutMs, spawnImpl = spawn } = {}) {
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
      // On Windows, npm-installed CLI wrappers are .cmd files and require a
      // shell to execute. Pass shell:true only on Windows so Unix behaviour
      // is unchanged. Args are still array-based; Node handles the escaping.
      const spawnOpts = process.platform === "win32"
        ? { stdio: "ignore", windowsHide: true, shell: true }
        : { stdio: "ignore", windowsHide: true };
      child = spawnImpl(command, args, spawnOpts);
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
