# Codex OpenClaw Notifier

为 Windows 上的 Codex Desktop 与 Codex CLI 提供本地、持久化的任务结束和 API 故障通知桥接。

当前代码默认使用 `dry-run` adapter。真实 OpenClaw 微信 adapter 已按本机实发契约实现，但生产 watcher 尚未启动，也没有修改 Codex Desktop/CLI 的全局配置。

## 当前状态

- 已实现并经自动化测试：进程外会话 JSONL watcher、持久 outbox、OpenClaw CLI adapter，以及可选 CLI wrapper。
- 已完成真实运输验证：一次 `openclaw message send` 成功退出，且收件人已确认微信实际收到。详见 [发送契约](docs/verified-openclaw-contract.md)。
- 尚未完成现场验收：Desktop 正常/API 错误、CLI 正常/非零或 API 错误、用户中断和通道离线恢复重试。
- 未启用：Stop hook、CLI wrapper、API proxy、`15722` 代理和任何新的计划任务或服务。
- 未修改：`C:\Users\TheMapleBin\.codex\config.toml`、现有 OpenClaw Gateway、既有 Gateway 计划任务，以及两个既有微信 channel 配置。

接手任务前必须阅读：[实施计划](docs/implementation-plan.md)、[代理交接](docs/claude-handoff.md)、[受控接入说明](docs/codex-setup.md) 和 [发送契约](docs/verified-openclaw-contract.md)。这些文档以阶段门禁为准，不能用自动化测试、端口监听、channel 状态或 dry-run 替代微信实际送达。

## 本地开发

```powershell
npm test
npm run check
```

`npm run service`、`npm run proxy`、Stop hook 和 CLI wrapper 仅保留作开发或阶段 4 验证，不属于当前生产路线。未来生产接入唯一候选是单进程 `npm run watch`，且只能在阶段 5 的真实现场验收完成、用户明确允许后启动。

不要将 Codex `base_url` 切换到 `15722`；只有出现 watcher 与 wrapper 均漏报、而透明代理可复现覆盖的具体案例后，才可提出该变更并先取得用户确认。
