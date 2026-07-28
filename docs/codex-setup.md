# Codex 受控接入说明

唯一 watcher 可由 `start-notifier.cmd` 手工启动，也可由 `enable-auto-notifier.cmd` 在用户登录时自动启动。计划任务的启动器在拉起 watcher 后立即退出，生产态不保留 supervisor 进程。

`configure-notifier.cmd` 执行一次二维码认证和会话绑定，使用 DPAPI 保存凭据。运行期会另外加密保存稳定 UIN、更新游标和最新 context，用于 watcher 重启恢复。

## 安全边界

- 不修改 Codex `config.toml`、认证、`base_url` 或网络路由。
- 不启用 `15722`、Stop hook、生产 CLI wrapper、API proxy、额外 HTTP service 或 Windows 服务。
- 自动模式只允许计划任务 `CodexWeChatNotifierLifecycle`；不得创建第二个生命周期任务或 watcher。
- DPAPI 会话状态已通过 watcher 完整停止和换 PID 重启验收，无需再次绑定即可投递；自动模式仍保持单个轻量 watcher 常驻，以降低服务端 context 主动失效概率。
- 不读取或发送用户 prompt、用户消息、完整会话、源码、原始请求/响应正文。
- 任务名称优先使用 `threads.name`，否则使用 Codex UI 的 `threads.title`，并进行限长和敏感值净化。
- 最终输出在截断前移除完整、残缺和 HTML 转义的 citation/rollout 内部元数据并进行凭据净化，最多 2400 字符；真实微信复验已确认内容完整且无内部尾块。
- 只允许一个 watcher。`npm run watch` 与 `start-notifier.cmd` 不得同时运行。

日常建议运行一次 `enable-auto-notifier.cmd`，之后无需手工启动。进程级重启已经确认能够自动恢复；整机冷启动尚未现场验收。若腾讯服务端明确提示 context 失效，只需在微信里向机器人发一条消息，不需要重新扫码。手工入口仍保留为 `start-notifier.cmd`、`notifier-status.cmd` 和 `stop-notifier.cmd`。

真实验收状态见 [live-acceptance.md](live-acceptance.md)，发送细节见 [verified-ilink-contract.md](verified-ilink-contract.md)。
