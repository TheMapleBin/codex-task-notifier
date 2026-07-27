# 已验证的 OpenClaw 微信发送契约

验证时间：2026-07-27。

本机已使用现有 OpenClaw Gateway 与 `openclaw-weixin` 完成一次真实微信投递。发送命令以退出码 `0` 结束，随后由收件人在微信端确认实际收到。该证据只证明以下契约，不代表 watcher 已部署或 Codex 配置已切换。

```text
openclaw message send \
  --channel openclaw-weixin \
  --account <secure account> \
  --target <secure full inbound address> \
  --message <sanitized notification> \
  --json
```

- `--account` 与 `--target` 仅从受控环境变量读取：`CODEX_NOTIFY_OPENCLAW_ACCOUNT`、`CODEX_NOTIFY_OPENCLAW_TARGET`。
- target 必须使用实际入站元数据中的完整地址；仅使用 peer 部分会被 CLI 拒绝为未知 target。
- adapter 丢弃 CLI stdout/stderr；仅以启动结果、超时和退出码决定 outbox 是否重试。
- 发送命令不读取或写入 Gateway token、iLink token、cookie、二维码信息或会话正文。

第 3 阶段的 watcher 使用此契约，但不启用 Stop hook、CLI wrapper、API proxy、15722 代理或 Codex 全局配置改动。
