# Codex Task Notifier

Windows 上的轻量 Codex Desktop/CLI 任务终态通知器。当前生产路径由一个轻量 lifecycle supervisor 和按需 Node watcher 组成：watcher 读取 Codex rollout JSONL、写入持久 outbox，并在同一 Node 进程内维持原生 QQ Gateway 后调用 QQ Bot HTTPS API。没有 OpenClaw 或第二个 Gateway 服务。

```text
Codex rollout JSONL -> watcher + native QQ Gateway -> durable outbox -> QQ Bot
```

不需要额外消息网关、`account/target`、HTTP 代理、Codex hook 或 CLI 注入。

## 项目结构

```text
commands/       Windows 双击入口、诊断和 transport 切换
docs/           架构、迁移、验收和代理交接文档
scripts/        PowerShell 配置、生命周期和 DPAPI 控制层
src/            watcher、outbox、事件净化和 transport 实现
src/adapters/   QQ Bot 生产 adapter 与微信备用 adapters
tests/          Node 与 PowerShell 行为测试
```

根目录只保留首次绑定、自动启用、状态和禁用的常用快捷入口。完整命令说明见 [`commands/README.md`](commands/README.md)，文档入口见 [`docs/README.md`](docs/README.md)。

## 当前状态

- 2026-07-29 QQ Bot 已完成两次真实主动消息验收：原生 Gateway `READY`、QQ API 返回消息 ID、QQ 客户端两次实际收到。生产 transport 已按用户确认从 iLink 切换为 QQ Bot。
- QQ watcher 根任务端到端验收已通过；实时计数与未验收项见 [现场验收](docs/live-acceptance.md)，不在首页固化易过期的运行数字。
- 2026-07-28 已完成 2400 字符输出与 citation/rollout 尾部净化复验，并增加末尾 Codex UI 指令的受限白名单清理。
- 当前轻量 watcher 已配置；是否运行以 `notifier-status.cmd` 的实时结果为准。QQ transport 下 `QQ Gateway: online` 才表示发送门禁就绪，客户端收件仍以用户确认优先。
- 自动化验证覆盖直接 iLink、微信公众号测试号备用 adapter、DPAPI 配置、加密会话恢复、ClawBot 心跳、outbox 重试、终态识别、子代理过滤、跟随 Codex 的生命周期、待发终态合并、敏感信息净化、残缺/转义内部元数据、尾部 Codex UI 指令清理和安全任务名称。
- 尚未完成：Desktop/API 可控错误、CLI 非零/API 错误、用户中断、QQ Gateway/API 离线恢复的全部真实验收。
- 微信 iLink 与微信公众号测试号 DPAPI 配置保留为回滚，不删除、不自动重放。QQ Bot 同样不需要 OpenClaw 或 `account/target`。
- 从未启用：OpenClaw（及其 Gateway）、`15722`、`base_url` 切换、Stop hook、生产 CLI wrapper 或新服务。唯一计划任务在用户登录时启动轻量 supervisor；watcher 只在 Codex Desktop/CLI 运行时存在。ClawBot 保活仅在回滚到 iLink transport 时启用，QQ 生产路径不执行微信保活。
- QQ Bot adapter 与最小原生 Gateway 已接入同一个 watcher 生命周期：Codex 启动时跟随 watcher 启动，Codex 全部退出 30 秒后一起停止；DPAPI 绑定跨重启保留。Gateway 离线时任务仍进入 outbox，恢复 `READY` 后重试。
- outbox 记录固定到入队时的 transport。2026-07-29 切换时现场发现 `legacy=79`、`ilink=5` 条历史 pending；它们保留原地且不会通过 QQ 重放。新 QQ 记录只由 QQ adapter 处理。
- ClawBot 保活已通过短窗口真实验收：未重新发送“绑定”，连续保活约 4 分钟后主动发送成功，用户确认微信实际收到。整机冷启动和更长周期仍需后续观察。

通知包含来源、项目、任务名称、状态、耗时、短任务 ID、净化错误类别/HTTP 状态和最后一条 assistant 输出。输出最多 2400 字符；完整、残缺或 HTML 转义的内部 citation/rollout 元数据，以及末尾独立行中的 `::git-commit`、`::created-thread`、`::code-comment` 会在截断前移除。正文中的普通 `::` 保留，明显 token、Cookie、认证头、密码和 secret 会被遮盖。

只通知用户直接创建的根任务。Codex Desktop/CLI 调用的子代理、评审代理和嵌套代理终态默认全部忽略。

任务名称优先使用 Codex 数据库中的显式 `threads.name`，否则使用 Codex UI 的 `threads.title`；名称会限长并进行敏感值净化。

## 一键使用

QQ 首次配置使用根目录 `bind-qqbot.cmd`，只需向机器人发送一次“绑定”。根目录保留常用快捷入口，完整命令集中在 [`commands/`](commands/README.md)。生产切换使用 `commands/use-qqbot.cmd`；回滚 iLink 使用 `commands/use-ilink.cmd`；测试号备用路径使用 `commands/use-wechat-test-account.cmd`。

- `commands/start-notifier.cmd`：启动唯一隐藏 watcher。
- `notifier-status.cmd`：显示运行状态和 outbox 计数，不显示凭据或消息正文。
- `commands/stop-notifier.cmd`：只停止该启动器记录的 watcher。
- `enable-auto-notifier.cmd`：启用跟随 Codex 的自动生命周期。
- `auto-notifier-status.cmd`：查看自动模式、supervisor 和计划任务状态。
- `disable-auto-notifier.cmd`：移除自动模式并停止 supervisor 与 watcher。

QQ Bot 使用 `bind-qqbot.cmd` 完成一次性绑定：它只在本次操作中短暂连接官方 QQ Gateway，等你向机器人发“绑定”后立即将 OpenID 加密保存并退出。`commands/test-qqbot.cmd` 会在同一短命进程中连接 Gateway、发送、关闭，用于独立验收。`commands/start-qqbot-gateway.cmd` 等命令只保留为诊断工具，生产模式不运行该独立进程。

自动模式沿用原有的一个当前用户登录计划任务和一个轻量 supervisor。Codex Desktop/CLI 任一运行时启动 watcher 与内置 QQ Gateway；全部退出 30 秒后一起停止。QQ 凭据和目标由当前 Windows 用户 DPAPI 持久保存，不需要每次重新绑定。QQ transport 下 iLink/ClawBot keepalive 为 `not used`，不会发起微信保活请求。

运行目录为 `%LOCALAPPDATA%\CodexWeChatNotifier`。

完整文档入口见 [文档导航](docs/README.md)；微信公众号测试号配置和真实实发步骤见 [微信公众号测试号接入](docs/wechat-test-account-trial.md)。

## 验证

```powershell
npm run check
npm test
```

接手前从 [文档导航](docs/README.md) 阅读实施计划、交接说明、现场验收和受控接入文档。
