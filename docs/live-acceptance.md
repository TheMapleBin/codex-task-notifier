# Codex 微信通知现场验收记录

每项必须分别证明：事件捕获、持久 outbox、发送成功、微信实际收到。测试绿灯、进程运行或 `delivered` 不能单独替代收件确认。

## 已通过

| 用例 | 捕获 | outbox | 发送 | 微信确认 | 说明 |
| --- | --- | --- | --- | --- | --- |
| Codex Desktop 正常完成（直接 iLink） | 通过 | 通过 | 通过 | 通过 | 两条 pending 转 delivered，用户确认收到；其中一条包含最终输出 |

直接 iLink 验收期间未修改 `C:\Users\TheMapleBin\.codex\config.toml`、`base_url` 或 `15722`。

用户报告真实消息尾部包含 `<oai-mem-citation>` 内部元数据且部分输出过早截断。统一净化层会在 2400 字符截断前清除完整、残缺和转义的内部元数据，并保留安全任务名称与真实 `session_meta` 子代理过滤。citation/rollout 清理曾通过现场复验，但随后真实通知又暴露了末尾独立行 `::git-commit{...}`。现已增加仅针对末尾 `::git-commit`、`::created-thread`、`::code-comment` 的白名单清理，47/47 自动化测试通过；该新增规则仍需下一条真实根任务通知确认。

## 尚未通过

| 用例 | 状态 |
| --- | --- |
| Desktop API 错误 | 未验收；不得通过修改全局配置或认证制造 |
| CLI 非零或 API 错误 | 未验收 |
| 用户中断 | 未验收 |
| 微信暂时离线后恢复 | 未验收 |

当前允许一个直接 iLink watcher，以及唯一的 `CodexWeChatNotifierLifecycle` 生命周期计划任务；不得启用代理、hook、wrapper、第二个 watcher、服务或其他计划任务。

稳定 UIN、更新游标和最新 context 已使用 DPAPI 整体加密持久化。完整停止 PID `23684`、启动 PID `25248` 后，未重新绑定即成功发送“重启免绑定复测”，用户确认微信实际收到。基于该证据，生命周期恢复为轻量 supervisor 跟随 `codex.exe`：任一 Desktop/CLI 运行时启动 watcher，全部退出 30 秒后停止。整机冷启动仍未实际关机验收。
