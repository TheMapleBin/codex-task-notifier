# Codex 微信通知实施计划

## 目标架构

```text
Codex Desktop/CLI rollout JSONL
  -> 单一 watcher
  -> 持久 outbox
  -> 内置微信 iLink adapter
  -> 微信
```

这是从 Codeg 公开源码验证出的最小路径：二维码认证、`getupdates` 和 `sendmessage` 都内置在同一个 watcher 中。

## 状态

| 阶段 | 当前结果 |
| --- | --- |
| 发送路径调查 | 完成；选择直接 iLink |
| 二维码和会话绑定 | 完成；schema 2 DPAPI 配置已生成 |
| watcher/outbox/iLink adapter | 完成；软件测试通过 |
| Desktop/CLI 生命周期 | 完成；一个登录 supervisor 按 `codex.exe` 启停唯一 watcher |
| 正常完成真实投递 | 完成；用户确认收到两条通知 |
| 内部 citation 清理 | 已修复并测试；等待下一条真实消息复验 |
| 安全任务名称 | 已实现；显式名称优先，prompt 副本被拒绝 |
| API 错误、中断、离线恢复 | 尚未完成真实验收 |

## 不可跨越的边界

- 不为制造错误修改 Codex 全局配置、认证或网络。
- watcher 已覆盖真实错误时，不启用 API proxy。
- 只有 watcher 与可选 CLI wrapper 都可复现漏报时，才讨论 `15722`，且必须先获用户批准。
- 不新增第二个 watcher、Gateway 或服务；只允许已记录的 `CodexWeChatNotifierLifecycle` 当前用户计划任务。

## 下一步

1. 用下一条真实任务完成通知确认 citation 已消失、名称行符合规则。
2. 验收 CLI 非零/错误和用户中断。
3. 寻找安全的 Desktop API 错误复现；找不到则保留未验收状态。
4. 验证 iLink 失败时 pending 会在恢复后 delivered，并由用户确认收到。
