# Codex OpenClaw Notifier

为 Windows 上的 Codex Desktop 与 Codex CLI 提供本地、持久化的任务结束和 API 故障通知桥接。

当前版本默认使用 `dry-run` adapter：所有事件会进入本地 outbox，并写入本地 dry-run 交付记录；不会调用微信或 OpenClaw。

## 当前边界

- 已实现：本地服务、持久 outbox、透明 API 代理、CLI JSONL 事件解析、Codex Stop hook、会话 JSONL 兼容性观察器。
- 待接入：真实 OpenClaw 微信发送协议、目标会话/联系人、凭据安全存储和生产配置切换。
- 未修改：现有 `C:\Users\TheMapleBin\.codex\config.toml` 与 CC Switch 的运行端口。

详见 [实施计划](docs/implementation-plan.md) 与 [Codex 接入说明](docs/codex-setup.md)。

## 本地开发

```powershell
npm test
npm run service
```

服务默认监听 `http://127.0.0.1:17080`，API 代理默认监听 `http://127.0.0.1:15722`，上游固定为本机 CC Switch `http://127.0.0.1:15721`。

在没有 OpenClaw 配置前，不要把 Codex 的 `base_url` 切换到代理端口。
