import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createIlinkSessionStore } from "../src/ilink-session-state.mjs";
import { temporaryDirectory } from "./helpers.mjs";

test("iLink session state round-trips through DPAPI without plaintext at rest", { skip: process.platform !== "win32" }, async () => {
  const home = await temporaryDirectory();
  const env = { ...process.env, CODEX_NOTIFY_CONTROL_HOME: home };
  const store = createIlinkSessionStore({ env });
  const state = {
    schemaVersion: 1,
    wechatUin: "test-uin-value",
    cursor: "test-cursor-value",
    toUserId: "test-user-value",
    contextToken: "test-context-value"
  };

  await store.write(state);
  assert.deepEqual(await store.read(), state);

  const encrypted = await fs.readFile(path.join(home, "secure", "weixin-ilink-session.dpapi.json"), "utf8");
  assert.doesNotMatch(encrypted, /test-uin-value|test-cursor-value|test-user-value|test-context-value/);
  assert.match(encrypted, /protectedData/);
});
