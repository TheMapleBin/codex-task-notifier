# Codex 受控接入说明

唯一 watcher 可由 `start-notifier.cmd` 手工启动，也可由 `enable-auto-notifier.cmd` 的轻量 supervisor 管理。Codex Desktop/CLI 任一运行时启动 watcher 与同进程 QQ Gateway，全部退出 30 秒后一起停止。QQ transport 下不执行 ClawBot/iLink 保活。

QQ 首次使用 `bind-qqbot.cmd` 完成一次性绑定并用 DPAPI 保存 AppID/AppSecret/OpenID，后续 watcher 与整机重启不需要重新绑定。`configure-notifier.cmd` 的 iLink 配置仅作为回滚保留。

## 安全边界

- 不修改 Codex `config.toml`、认证、`base_url` 或网络路由。
- 不启用 `15722`、Stop hook、生产 CLI wrapper、API proxy、额外 HTTP service 或 Windows 服务。
- 自动模式只允许计划任务 `CodexWeChatNotifierLifecycle`；不得创建第二个生命周期任务、保活进程或 watcher。
- QQ DPAPI 绑定已通过 Gateway/adapter 重启免重新绑定验收，因此 watcher 可以安全跟随 Codex 启停。
- 不读取或发送用户 prompt、用户消息、完整会话、源码、原始请求/响应正文。
- 任务名称优先使用 `threads.name`，否则使用 Codex UI 的 `threads.title`，并进行限长和敏感值净化。
- 最终输出在截断前移除完整、残缺和 HTML 转义的 citation/rollout 内部元数据，并删除末尾独立行中的 `::git-commit`、`::created-thread`、`::code-comment`，再进行凭据净化，最多 2400 字符。正文中的普通 `::` 不删除；当前 QQ watcher 实发仍需继续复验。
- 只允许一个 watcher。`npm run watch` 与 `start-notifier.cmd` 不得同时运行。

日常建议运行一次 `enable-auto-notifier.cmd`，之后无需手工启动。关闭最后一个 Codex 进程 30 秒后 watcher 与 QQ Gateway 自动退出；下次启动 Codex 时从 DPAPI 配置恢复。用 `notifier-status.cmd` 查看 `QQ Gateway` 状态。整机冷启动和真实离线恢复尚未现场验收。

真实验收状态见 [live-acceptance.md](live-acceptance.md)，QQ 发送细节见 [qqbot-native-gateway.md](qqbot-native-gateway.md)，iLink 历史回滚契约见 [verified-ilink-contract.md](verified-ilink-contract.md)。
