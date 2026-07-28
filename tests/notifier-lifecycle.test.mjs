import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { temporaryDirectory } from "./helpers.mjs";

const script = path.resolve("src", "lifecycle-supervisor.mjs");

test("lifecycle starts for Codex and stops after Codex becomes idle", async () => {
  const controlHome = await temporaryDirectory();
  const fixturePath = path.join(controlHome, "process-states.json");
  const controlLog = path.join(controlHome, "control.log");
  await fs.writeFile(fixturePath, JSON.stringify([true, true, false, false]));

  const result = spawnSync(process.execPath, [
    script,
    "--poll-ms", "100",
    "--idle-grace-ms", "0",
    "--keepalive-ms", "600000",
    "--max-iterations", "4"
  ], {
    cwd: path.resolve("."),
    env: {
      ...process.env,
      CODEX_NOTIFY_CONTROL_HOME: controlHome,
      CODEX_NOTIFY_LIFECYCLE_PROCESS_FIXTURE: fixturePath,
      CODEX_NOTIFY_LIFECYCLE_CONTROL_LOG: controlLog
    },
    encoding: "utf8",
    timeout: 10_000
  });

  assert.equal(result.status, 0, result.stderr);
  const actions = (await fs.readFile(controlLog, "utf8")).trim().split(/\r?\n/);
  assert.deepEqual(actions, ["Start", "KeepAlive", "Stop"]);
  await assert.rejects(fs.access(path.join(controlHome, "run", "lifecycle.pid.json")));
});
