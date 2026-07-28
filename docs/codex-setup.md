# Codex 受控接入说明

唯一 watcher 可由 `start-notifier.cmd` 手工启动，也可由 `enable-auto-notifier.cmd` 的轻量 supervisor 管理。Codex Desktop/CLI 任一运行时启动 watcher，全部退出 30 秒后停止 watcher。supervisor 保持运行，并每 30 秒执行一次不可见的 ClawBot `typing/cancel` 保活。

`configure-notifier.cmd` 执行一次二维码认证和会话绑定，使用 DPAPI 保存凭据。运行期会另外加密保存稳定 UIN、更新游标和最新 context，用于 watcher 重启恢复。

## 安全边界

- 不修改 Codex `config.toml`、认证、`base_url` 或网络路由。
- 不启用 `15722`、Stop hook、生产 CLI wrapper、API proxy、额外 HTTP service 或 Windows 服务。
- 自动模式只允许计划任务 `CodexWeChatNotifierLifecycle`；不得创建第二个生命周期任务、保活进程或 watcher。
- DPAPI 会话状态已通过 watcher 完整停止和换 PID 重启验收，无需再次绑定即可投递，因此 watcher 可以安全跟随 Codex 启停。
- 不读取或发送用户 prompt、用户消息、完整会话、源码、原始请求/响应正文。
- 任务名称优先使用 `threads.name`，否则使用 Codex UI 的 `threads.title`，并进行限长和敏感值净化。
- 最终输出在截断前移除完整、残缺和 HTML 转义的 citation/rollout 内部元数据，并删除末尾独立行中的 `::git-commit`、`::created-thread`、`::code-comment`，再进行凭据净化，最多 2400 字符。正文中的普通 `::` 不删除；UI 指令规则等待真实微信复验。
- 只允许一个 watcher。`npm run watch` 与 `start-notifier.cmd` 不得同时运行。

日常建议运行一次 `enable-auto-notifier.cmd`，之后无需手工启动。关闭最后一个 Codex 进程 30 秒后 watcher 自动退出，supervisor 继续维持 ClawBot 会话；下次启动 Codex 时从 DPAPI 状态恢复。用 `notifier-status.cmd` 查看最近一次保活是否为 `ok`。整机冷启动和长期保活尚未现场验收；若腾讯服务端仍明确提示 context 失效，只需在微信里向机器人发一条消息，不需要重新扫码。

真实验收状态见 [live-acceptance.md](live-acceptance.md)，发送细节见 [verified-ilink-contract.md](verified-ilink-contract.md)。
