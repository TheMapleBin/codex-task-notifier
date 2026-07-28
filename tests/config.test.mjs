import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.mjs";

function baseEnv(overrides = {}) {
  return {
    USERPROFILE: "C:\\Users\\Test",
    LOCALAPPDATA: "C:\\Users\\Test\\AppData\\Local",
    CODEX_NOTIFY_ADAPTER: "dry-run",
    ...overrides
  };
}

test("direct iLink adapter requires only QR credentials and accepts optional conversation context", () => {
  const env = baseEnv({ CODEX_NOTIFY_ADAPTER: "ilink" });
  assert.throws(() => loadConfig(env), /CODEX_NOTIFY_ILINK_BOT_TOKEN/);
  assert.throws(() => loadConfig({ ...env, CODEX_NOTIFY_ILINK_BOT_TOKEN: "test-token" }), /CODEX_NOTIFY_ILINK_BASE_URL/);

  const config = loadConfig({
    ...env,
    CODEX_NOTIFY_ILINK_BOT_TOKEN: "test-token",
    CODEX_NOTIFY_ILINK_BASE_URL: "https://ilinkai.weixin.qq.com",
    CODEX_NOTIFY_ILINK_TO_USER_ID: "test-user",
    CODEX_NOTIFY_ILINK_CONTEXT_TOKEN: "test-context"
  });
  assert.equal(config.adapter, "ilink");
  assert.equal(config.ilink.toUserId, "test-user");
  assert.equal(config.ilink.contextToken, "test-context");
});
