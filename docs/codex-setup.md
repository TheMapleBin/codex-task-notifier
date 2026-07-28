# Codex 受控接入说明

唯一生产进程由 `start-notifier.cmd` 启动，等价于隐藏运行 `node src/index.mjs watch`。它读取 `~/.codex/sessions`，从 `~/.codex/state_5.sqlite` 只读解析任务名称，写入 `%LOCALAPPDATA%\CodexWeChatNotifier\live\outbox`，并直接调用腾讯 iLink。

`configure-notifier.cmd` 执行一次二维码认证和会话绑定，使用 DPAPI 保存凭据。

## 安全边界

- 不修改 Codex `config.toml`、认证、`base_url` 或网络路由。
- 不启用 `15722`、Stop hook、生产 CLI wrapper、API proxy、额外 HTTP service、Windows 服务或计划任务。
- 不读取或发送用户 prompt、用户消息、完整会话、源码、原始请求/响应正文。
- 任务名称优先使用 `threads.name`，否则使用 Codex UI 的 `threads.title`，并进行限长和敏感值净化。
- 最终输出移除内部 citation 块并进行凭据净化，最多 1200 字符。
- 只允许一个 watcher。`npm run watch` 与 `start-notifier.cmd` 不得同时运行。

日常入口为 `configure-notifier.cmd`、`start-notifier.cmd`、`notifier-status.cmd` 和 `stop-notifier.cmd`。

真实验收状态见 [live-acceptance.md](live-acceptance.md)，发送细节见 [verified-ilink-contract.md](verified-ilink-contract.md)。
