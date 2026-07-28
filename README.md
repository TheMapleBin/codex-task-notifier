# Codex WeChat Notifier

Windows 上的轻量 Codex Desktop/CLI 任务终态通知器。当前生产路径只有一个 Node watcher：读取 Codex rollout JSONL，写入持久 outbox，并直接调用腾讯微信 iLink API。

```text
Codex rollout JSONL -> watcher -> durable outbox -> WeChat iLink
```

不需要额外消息网关、`account/target`、HTTP 代理、Codex hook 或 CLI 注入。

## 当前状态

- 2026-07-28 已完成直接 iLink 真实验收：两个已捕获事件从 `pending` 进入 `delivered`，收件人确认微信实际收到，且通知包含最终 assistant 输出。
- 2026-07-28 已完成 2400 字符输出与尾部净化复验：收件人确认通知内容完整，且末尾没有 citation/rollout 内部元数据。
- 当前轻量 watcher 已配置；是否运行以 `notifier-status.cmd` 的实时结果为准。
- 自动化验证为 41/41，覆盖直接 iLink、DPAPI 配置、outbox 重试、终态识别、子代理过滤、生命周期切换、敏感信息净化、残缺/转义内部元数据清理和安全任务名称。
- 尚未完成：Desktop/API 可控错误、CLI 非零/API 错误、用户中断、微信离线后恢复的全部真实验收。
- 从未启用：`15722`、`base_url` 切换、Stop hook、生产 CLI wrapper 或新服务。唯一计划任务是生命周期 supervisor。

通知包含来源、项目、任务名称、状态、耗时、短任务 ID、净化错误类别/HTTP 状态和最后一条 assistant 输出。输出最多 2400 字符；完整、残缺或 HTML 转义的内部 citation/rollout 元数据会在截断前移除，明显 token、Cookie、认证头、密码和 secret 会被遮盖。

只通知用户直接创建的根任务。Codex Desktop/CLI 调用的子代理、评审代理和嵌套代理终态默认全部忽略。

任务名称优先使用 Codex 数据库中的显式 `threads.name`，否则使用 Codex UI 的 `threads.title`；名称会限长并进行敏感值净化。

## 一键使用

首次运行 `configure-notifier.cmd`。它直接获取腾讯 iLink 二维码；扫码后给机器人发一条短消息建立会话上下文，四项定位值使用当前 Windows 用户的 DPAPI 保存到仓库外。

- `start-notifier.cmd`：启动唯一隐藏 watcher。
- `notifier-status.cmd`：显示运行状态和 outbox 计数，不显示凭据或消息正文。
- `stop-notifier.cmd`：只停止该启动器记录的 watcher。
- `enable-auto-notifier.cmd`：启用无感生命周期；Codex Desktop/CLI 运行时自动启动 watcher，全部退出 30 秒后自动停止。
- `auto-notifier-status.cmd`：查看自动模式和 supervisor 状态。
- `disable-auto-notifier.cmd`：移除自动模式并停止 supervisor 与 watcher。

自动模式只新增一个当前用户登录计划任务和一个仅使用 Node 内置模块的 supervisor。supervisor 只检查是否存在 `codex.exe`，不读取窗口、命令内容、会话或凭据。

运行目录为 `%LOCALAPPDATA%\CodexWeChatNotifier`。

## 验证

```powershell
npm run check
npm test
```

接手前阅读 [实施计划](docs/implementation-plan.md)、[交接说明](docs/claude-handoff.md)、[直连契约](docs/verified-ilink-contract.md)、[现场验收](docs/live-acceptance.md) 和 [受控接入](docs/codex-setup.md)。
