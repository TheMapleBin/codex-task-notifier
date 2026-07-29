# Codex 通知实施计划

## 目标架构

```text
Codex Desktop/CLI rollout JSONL
  -> 单一 watcher
  -> 持久 outbox
  -> 内置 QQ Gateway + QQ HTTPS adapter
  -> QQ
```

生产发送已切换为 QQ Bot。直接 iLink 与微信公众号测试号 adapter/DPAPI 配置保留为回滚，但不运行 iLink keepalive。

## 状态

| 阶段 | 当前结果 |
| --- | --- |
| 发送路径调查 | 完成；采用仓库内置 QQ HTTPS adapter 与原生 Gateway，不依赖 OpenClaw |
| 一次性绑定 | 完成；QQ AppID/AppSecret/OpenID 使用当前用户 DPAPI 保存，重启无需重新绑定 |
| watcher/outbox/QQ adapter | 完成；82/82 软件测试通过，记录绑定入队 transport |
| Desktop/CLI 生命周期 | 完成；轻量 supervisor 按 `codex.exe` 启动同一 watcher 与内置 QQ Gateway，全部退出 30 秒后一起停止 |
| QQ 最小真实投递 | 完成；两次 Gateway READY + API message ID，用户两次确认 QQ 客户端收到 |
| 内部尾部清理 | 2400 字输出、citation/rollout 和 Codex UI 尾部指令清理已实现；QQ watcher 根任务实发仍需继续现场复验 |
| 安全任务名称 | 已实现；显式名称优先，prompt 副本被拒绝 |
| API 错误、中断、离线恢复 | 尚未完成真实验收 |
| QQ Gateway 恢复 | 自动化覆盖心跳、READY、重连和离线入队；真实离线恢复尚未验收 |
| iLink context 保活 | QQ transport 下为 `not used`，不再发起微信保活；iLink 只保留回滚 |
| 微信公众号测试号备用路径 | 真实投递通过；长变量被卡片截断且不能展开，不再作为生产 transport |

## 不可跨越的边界

- 不为制造错误修改 Codex 全局配置、认证或网络。
- watcher 已覆盖真实错误时，不启用 API proxy。
- 只有 watcher 与可选 CLI wrapper 都可复现漏报时，才讨论 `15722`，且必须先获用户批准。
- 不新增第二个 watcher、独立生产 Gateway、OpenClaw、服务或保活进程；只允许已记录的 `CodexWeChatNotifierLifecycle` 当前用户计划任务管理现有 watcher。

## QQ Bot 迁移状态

QQ Bot 已完成直接 HTTPS adapter、内嵌原生 Gateway、DPAPI 配置、两次真实实收和生产 selector 切换。切换现场 `legacy=79`、`ilink=5` 条旧 pending 已被 transport pinning 隔离，保持原地且不会通过 QQ 重放。分阶段证据见 [QQ Bot 迁移计划](qqbot-migration-plan.md)。

## 下一步

1. 用当前真实 Codex 根任务确认 watcher -> outbox -> QQ 的端到端通知。
2. 复验 2400 字输出和 QQ Gateway/API 离线恢复。
3. 验收 CLI 非零/错误和用户中断。
4. 寻找安全的 Desktop API 错误复现；找不到则保留未验收状态。
5. 两条 failed 和 84 条历史 pending 属于切换前记录；未经用户明确授权，不读取正文、不重放、不删除。
