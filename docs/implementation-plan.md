# Codex 微信通知实施计划

## 目标架构

```text
Codex Desktop/CLI rollout JSONL
  -> 单一 watcher
  -> 持久 outbox
  -> 微信公众号测试号 adapter
  -> 微信
```

生产发送使用微信官方 `token` 与 `message/template/send` 接口。直接 iLink adapter 和 DPAPI 配置仅作为回滚路径保留。

## 状态

| 阶段 | 当前结果 |
| --- | --- |
| 发送路径调查 | 完成；最初选择直接 iLink，现已切换测试号生产路径 |
| 二维码和会话绑定 | 完成；schema 2 DPAPI 配置已生成 |
| watcher/outbox/测试号 adapter | 完成；55/55 软件测试通过 |
| Desktop/CLI 生命周期 | 完成；轻量 supervisor 按 `codex.exe` 启动 watcher，全部退出 30 秒后停止 |
| 正常完成真实投递 | 完成；生产切换后用户确认连续收到两条“Codex 通知” |
| 内部尾部清理 | 2400 字输出、citation/rollout 和 Codex UI 尾部指令清理已实现；长输出仍需在测试号生产路径复验 |
| 安全任务名称 | 已实现；显式名称优先，prompt 副本被拒绝 |
| API 错误、中断、离线恢复 | 尚未完成真实验收 |
| iLink context 恢复 | DPAPI 会话恢复已通过进程重启真实验收；整机冷启动尚未验收 |
| 微信公众号测试号生产路径 | 已接管 watcher；`Pending 0 / Delivered 40 / Failed 2`，用户确认连续两条到达 |

## 不可跨越的边界

- 不为制造错误修改 Codex 全局配置、认证或网络。
- watcher 已覆盖真实错误时，不启用 API proxy。
- 只有 watcher 与可选 CLI wrapper 都可复现漏报时，才讨论 `15722`，且必须先获用户批准。
- 不新增第二个 watcher、Gateway 或服务；只允许已记录的 `CodexWeChatNotifierLifecycle` 当前用户计划任务。

## 下一步

1. 在测试号生产路径验收 2400 字输出和 outbox 离线恢复。
2. 验收 CLI 非零/错误和用户中断。
3. 寻找安全的 Desktop API 错误复现；找不到则保留未验收状态。
4. 两条 failed 属于切换前已耗尽重试次数的旧 iLink 记录；未经用户明确授权，不读取正文、不重放、不删除。
