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

test("WeChat test-account adapter uses only a protected configuration path", () => {
  const config = loadConfig(baseEnv({
    CODEX_NOTIFY_ADAPTER: "wechat-test-account",
    CODEX_NOTIFY_WECHAT_TEST_CONFIG: "C:\\secure\\wechat-test-account.dpapi.json",
    CODEX_NOTIFY_POWERSHELL: "C:\\Program Files\\PowerShell\\7\\pwsh.exe"
  }));
  assert.equal(config.adapter, "wechat-test-account");
  assert.equal(config.wechatTestAccount.configPath, "C:\\secure\\wechat-test-account.dpapi.json");
  assert.equal(config.wechatTestAccount.powershell, "C:\\Program Files\\PowerShell\\7\\pwsh.exe");
  assert.equal(Object.hasOwn(config.wechatTestAccount, "appSecret"), false);
});
