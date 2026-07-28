# Codex WeChat Notifier

Windows 上的轻量 Codex Desktop/CLI 任务终态通知器。当前生产路径只有一个 Node watcher：读取 Codex rollout JSONL，写入持久 outbox，并直接调用腾讯微信 iLink API。

```text
Codex rollout JSONL -> watcher -> durable outbox -> WeChat iLink
```

不需要额外消息网关、`account/target`、HTTP 代理、Codex hook 或 CLI 注入。

## 当前状态

- 2026-07-28 测试号模板路径完成真实验收后，因卡片长文本会截断且不能展开，生产 adapter 已按用户决定切回直接 iLink。
- 切换后的现场状态为 `Pending: 0`、`Delivered: 40`、`Failed: 2`。两条 failed 是切换前已经耗尽重试次数的旧 iLink 记录，未读取正文、未重放、未删除。
- 2026-07-28 已完成 2400 字符输出与 citation/rollout 尾部净化复验，并增加末尾 Codex UI 指令的受限白名单清理。
- 当前轻量 watcher 已配置；是否运行以 `notifier-status.cmd` 的实时结果为准。
- 自动化验证为 55/55，覆盖直接 iLink、微信公众号测试号生产 adapter、DPAPI 配置、访问令牌刷新、加密会话恢复、outbox 重试、终态识别、子代理过滤、跟随 Codex 的生命周期、待发终态合并、敏感信息净化、残缺/转义内部元数据、尾部 Codex UI 指令清理和安全任务名称。
- 尚未完成：Desktop/API 可控错误、CLI 非零/API 错误、用户中断、微信离线后恢复的全部真实验收。
- 微信公众号测试号 DPAPI 配置保留为备用；当前 iLink 路径不需要 OpenClaw 或 `account/target`。
- 从未启用：`15722`、`base_url` 切换、Stop hook、生产 CLI wrapper 或新服务。唯一计划任务在用户登录时启动轻量 supervisor；watcher 只在 Codex Desktop/CLI 运行时存在。

通知包含来源、项目、任务名称、状态、耗时、短任务 ID、净化错误类别/HTTP 状态和最后一条 assistant 输出。输出最多 2400 字符；完整、残缺或 HTML 转义的内部 citation/rollout 元数据，以及末尾独立行中的 `::git-commit`、`::created-thread`、`::code-comment` 会在截断前移除。正文中的普通 `::` 保留，明显 token、Cookie、认证头、密码和 secret 会被遮盖。

只通知用户直接创建的根任务。Codex Desktop/CLI 调用的子代理、评审代理和嵌套代理终态默认全部忽略。

任务名称优先使用 Codex 数据库中的显式 `threads.name`，否则使用 Codex UI 的 `threads.title`；名称会限长并进行敏感值净化。

## 一键使用

当前生产首次配置运行 `configure-notifier.cmd`，扫码后给 ClawBot 发一条短消息建立会话。切换回 iLink 使用 `use-ilink.cmd`；测试号备用路径使用 `use-wechat-test-account.cmd`。

- `start-notifier.cmd`：启动唯一隐藏 watcher。
- `notifier-status.cmd`：显示运行状态和 outbox 计数，不显示凭据或消息正文。
- `stop-notifier.cmd`：只停止该启动器记录的 watcher。
- `enable-auto-notifier.cmd`：启用跟随 Codex 的自动生命周期。
- `auto-notifier-status.cmd`：查看自动模式、supervisor 和计划任务状态。
- `disable-auto-notifier.cmd`：移除自动模式并停止 supervisor 与 watcher。

自动模式只新增一个当前用户登录计划任务和一个轻量 supervisor。Codex Desktop/CLI 任一运行时启动 watcher；全部退出 30 秒后停止 watcher。测试号凭据持久保存在 DPAPI 中，跟随启停和重新登录不需要重复绑定。

运行目录为 `%LOCALAPPDATA%\CodexWeChatNotifier`。

微信公众号测试号配置和真实实发步骤见 [微信公众号测试号接入](docs/wechat-test-account-trial.md)。

## 验证

```powershell
npm run check
npm test
```

接手前阅读 [实施计划](docs/implementation-plan.md)、[交接说明](docs/claude-handoff.md)、[iLink 直连契约](docs/verified-ilink-contract.md)、[测试号契约](docs/verified-wechat-test-account-contract.md)、[现场验收](docs/live-acceptance.md) 和 [受控接入](docs/codex-setup.md)。
