import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { temporaryDirectory } from "./helpers.mjs";

const script = path.resolve("src", "lifecycle-supervisor.mjs");

test("lifecycle launcher starts one resident watcher and exits", async () => {
  const controlHome = await temporaryDirectory();
  const controlLog = path.join(controlHome, "control.log");

  const result = spawnSync(process.execPath, [script], {
    cwd: path.resolve("."),
    env: {
      ...process.env,
      CODEX_NOTIFY_CONTROL_HOME: controlHome,
      CODEX_NOTIFY_LIFECYCLE_CONTROL_LOG: controlLog
    },
    encoding: "utf8",
    timeout: 10_000
  });

  assert.equal(result.status, 0, result.stderr);
  const actions = (await fs.readFile(controlLog, "utf8")).trim().split(/\r?\n/);
  assert.deepEqual(actions, ["Start"]);
  await assert.rejects(fs.access(path.join(controlHome, "run", "lifecycle.pid.json")));
});
