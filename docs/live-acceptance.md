# Codex 微信通知现场验收记录

每项必须分别证明：事件捕获、持久 outbox、发送成功、微信实际收到。测试绿灯、进程运行或 `delivered` 不能单独替代收件确认。

## 已通过

| 用例 | 捕获 | outbox | 发送 | 微信确认 | 说明 |
| --- | --- | --- | --- | --- | --- |
| Codex Desktop 正常完成（直接 iLink） | 通过 | 通过 | 通过 | 通过 | 两条 pending 转 delivered，用户确认收到；其中一条包含最终输出 |

直接 iLink 验收期间未修改 `C:\Users\TheMapleBin\.codex\config.toml`、`base_url` 或 `15722`。

用户报告真实消息尾部包含 `<oai-mem-citation>` 内部元数据。统一净化层已修复，并新增安全任务名称；39/39 自动化测试通过。修复后的微信显示需要由后续真实完成通知再次确认。

## 尚未通过

| 用例 | 状态 |
| --- | --- |
| Desktop API 错误 | 未验收；不得通过修改全局配置或认证制造 |
| CLI 非零或 API 错误 | 未验收 |
| 用户中断 | 未验收 |
| 微信暂时离线后恢复 | 未验收 |

当前允许一个直接 iLink watcher，以及唯一的 `CodexWeChatNotifierLifecycle` 生命周期计划任务；不得启用代理、hook、wrapper、第二个 watcher、服务或其他计划任务。
