import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.mjs";

function baseEnv(overrides = {}) {
  return {
    USERPROFILE: "C:\\Users\\Test",
    LOCALAPPDATA: "C:\\Users\\Test\\AppData\\Local",
    CODEX_NOTIFY_ADAPTER: "openclaw",
    ...overrides
  };
}

test("OpenClaw adapter requires account and target from the process environment", () => {
  assert.throws(() => loadConfig(baseEnv()), /CODEX_NOTIFY_OPENCLAW_ACCOUNT/);
  assert.throws(() => loadConfig(baseEnv({ CODEX_NOTIFY_OPENCLAW_ACCOUNT: "test-account" })), /CODEX_NOTIFY_OPENCLAW_TARGET/);

  const config = loadConfig(baseEnv({
    CODEX_NOTIFY_OPENCLAW_ACCOUNT: "test-account",
    CODEX_NOTIFY_OPENCLAW_TARGET: "test-peer@test-account"
  }));
  assert.equal(config.openclaw.channel, "openclaw-weixin");
  assert.equal(config.openclaw.account, "test-account");
  assert.equal(config.openclaw.target, "test-peer@test-account");
});
