# Codex 微信通知实施计划

## 目标架构

```text
Codex Desktop/CLI rollout JSONL
  -> 单一 watcher
  -> 持久 outbox
  -> 内置微信 iLink adapter
  -> 微信
```

生产发送已切回直接 iLink。微信公众号测试号 adapter 和 DPAPI 配置保留为备用，但其长文本卡片展示不满足完整输出需求。

## 状态

| 阶段 | 当前结果 |
| --- | --- |
| 发送路径调查 | 完成；测试号展示受限后切回直接 iLink |
| 二维码和会话绑定 | 完成；schema 2 DPAPI 配置已生成 |
| watcher/outbox/iLink adapter | 完成；56/56 软件测试通过 |
| Desktop/CLI 生命周期 | 完成；轻量 supervisor 按 `codex.exe` 启动 watcher，全部退出 30 秒后停止；supervisor 每 30 秒维持 ClawBot context |
| 正常完成真实投递 | 完成；生产切换后用户确认连续收到两条“Codex 通知” |
| 内部尾部清理 | 2400 字输出、citation/rollout 和 Codex UI 尾部指令清理已实现；直接 iLink 长输出仍需继续现场复验 |
| 安全任务名称 | 已实现；显式名称优先，prompt 副本被拒绝 |
| API 错误、中断、离线恢复 | 尚未完成真实验收 |
| iLink context 恢复 | DPAPI 会话恢复已通过进程重启真实验收；整机冷启动尚未验收 |
| iLink context 保活 | 完成短窗口验收；未重新绑定，连续保活约 4 分钟后用户确认真实收到 |
| 微信公众号测试号备用路径 | 真实投递通过；长变量被卡片截断且不能展开，不再作为生产 transport |

## 不可跨越的边界

- 不为制造错误修改 Codex 全局配置、认证或网络。
- watcher 已覆盖真实错误时，不启用 API proxy。
- 只有 watcher 与可选 CLI wrapper 都可复现漏报时，才讨论 `15722`，且必须先获用户批准。
- 不新增第二个 watcher、Gateway、OpenClaw、服务或保活进程；只允许已记录的 `CodexWeChatNotifierLifecycle` 当前用户计划任务承担保活。

## 下一步

1. 继续观察更长周期和整机冷启动后的 ClawBot 保活。
2. 复验 2400 字输出和 outbox 离线恢复。
3. 验收 CLI 非零/错误和用户中断。
4. 寻找安全的 Desktop API 错误复现；找不到则保留未验收状态。
5. 两条 failed 属于切换前已耗尽重试次数的旧 iLink 记录；未经用户明确授权，不读取正文、不重放、不删除。
