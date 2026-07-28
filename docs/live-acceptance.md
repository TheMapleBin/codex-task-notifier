# Codex 微信通知现场验收记录

每项必须分别证明：事件捕获、持久 outbox、发送成功、微信实际收到。测试绿灯、进程运行或 `delivered` 不能单独替代收件确认。

## 已通过

| 用例 | 捕获 | outbox | 发送 | 微信确认 | 说明 |
| --- | --- | --- | --- | --- | --- |
| Codex Desktop 正常完成（直接 iLink） | 通过 | 通过 | 通过 | 通过 | 两条 pending 转 delivered，用户确认收到；其中一条包含最终输出 |
| Codex 正常完成（微信公众号测试号生产路径） | 通过 | 通过 | 通过 | 通过 | 用户确认连续收到两条“Codex 通知”；现场计数 Pending 0 / Delivered 40 / Failed 2 |
| 测试号模板正文渲染 | 通过 | 不适用 | 通过 | 通过 | 固定标签模板显示变量；单行分隔可显示多字段，但长变量会被卡片截断且不能展开 |
| ClawBot 单次保活协议 | 不适用 | 不适用 | 通过 | 不适用 | 最新 DPAPI context 下 getconfig、typing、cancel 均 ret=0；不产生聊天消息 |
| ClawBot 保活跨短期失效窗口 | 不适用 | 不适用 | 通过 | 通过 | 未重新绑定，约 4 分钟内每 30 秒保活；随后发送返回 message ID，用户确认收到 |

直接 iLink 验收期间未修改 `C:\Users\TheMapleBin\.codex\config.toml`、`base_url` 或 `15722`。

用户报告真实消息尾部包含 `<oai-mem-citation>` 内部元数据且部分输出过早截断。统一净化层会在 2400 字符截断前清除完整、残缺和转义的内部元数据，并保留安全任务名称与真实 `session_meta` 子代理过滤。citation/rollout 清理曾通过现场复验，但随后真实通知又暴露了末尾独立行 `::git-commit{...}`。现已增加仅针对末尾 `::git-commit`、`::created-thread`、`::code-comment` 的白名单清理，47/47 自动化测试通过；该新增规则仍需下一条真实根任务通知确认。

## 尚未通过

| 用例 | 状态 |
| --- | --- |
| Desktop API 错误 | 未验收；不得通过修改全局配置或认证制造 |
| CLI 非零或 API 错误 | 未验收 |
| 用户中断 | 未验收 |
| 微信暂时离线后恢复 | 未验收 |
| ClawBot 长周期与整机冷启动后投递 | 未验收；短窗口约 4 分钟已通过，不外推为无限期有效 |

当前允许一个 watcher，生产 transport 为直接 iLink，以及唯一的 `CodexWeChatNotifierLifecycle` 生命周期计划任务；不得启用代理、hook、wrapper、第二个 watcher、服务或其他计划任务。微信公众号测试号配置保留为备用。

两条 failed 是切换前已经耗尽最大尝试次数的旧 iLink 记录，outbox 在调用测试号 adapter 前即将其移入 failed。它们不构成测试号发送失败证据；未经用户明确授权，不读取正文、不重放、不删除。

稳定 UIN、更新游标和最新 context 已使用 DPAPI 整体加密持久化。完整停止 PID `23684`、启动 PID `25248` 后，未重新绑定即成功发送“重启免绑定复测”，用户确认微信实际收到。基于该证据，生命周期恢复为轻量 supervisor 跟随 `codex.exe`：任一 Desktop/CLI 运行时启动 watcher，全部退出 30 秒后停止。

2026-07-28 实测省略 context 的主动消息虽然 HTTP 200，但用户确认微信未收到；随后发送“绑定”后，两条 pending 自动补发。最新会话状态下 `getconfig`、`typing`、`cancel` 均返回成功，现已将 30 秒保活加入唯一 supervisor。未再次绑定并连续保活约 4 分钟后，测试消息返回 message ID，用户确认微信实际收到。整机冷启动和更长周期仍未验收。
