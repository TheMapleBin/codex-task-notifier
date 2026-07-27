# Codex 微信通知现场验收记录

## 证据边界

本文件只记录不含敏感值的现场证据。account、完整 target、context token、消息正文、prompt、源码和请求/响应正文均未写入文档或 Git。

一个用例只有同时具备以下四层证据才能标记为通过：事件已捕获、已进入持久 outbox、OpenClaw 发送成功、收件人确认微信实际收到。

## CLI 正常完成

验收时间：2026-07-28（Asia/Shanghai）。

| 证据层 | 现场结果 |
| --- | --- |
| 新任务 | 通过 `codex exec --json` 创建独立任务，进程退出码为 `0` |
| 事件捕获 | `session-watcher` 捕获 `turn_finished`；项目为 `codex-openclaw-notifier`；短任务 ID 为 `e3a9b8f8369c`；耗时 `10293 ms` |
| 持久 outbox | 事件写入独立验证目录并进入 `delivered`；发送尝试计数为 `0`；无最后错误类别 |
| OpenClaw 发送 | Windows adapter 通过 npm PowerShell shim 调用 OpenClaw；命令成功，无 stderr |
| 微信确认 | 系统发送一条引用短任务 ID 的验收请求；仅当收到任务通知时要求回复。对应 context-token 文件在请求之后出现新的入站更新时间，回复正文未读取 |

结论：CLI 新任务正常完成后的微信通知链路通过四层验收。

## 运行范围

- watcher 使用全新的独立验证目录，没有读取或发送默认 outbox 中的历史事件。
- watcher 以前台等价的临时隐藏进程运行，没有注册 Windows 服务、计划任务或第二个 Gateway。
- 验收完成后临时 watcher 已停止。
- 验证期间另一个根任务也在 watcher 启动后结束，因此同样被捕获并发送。这证明 watcher 当前按全局 Codex sessions 目录工作；后续临时验收必须及时停止，避免发送不在测试范围内的并发任务通知。
- 本次没有修改 `C:\Users\TheMapleBin\.codex\config.toml`、`base_url`、`15722`、OpenClaw 登录、Gateway 或 channel 配置。

## 尚未验收

| 用例 | 状态 |
| --- | --- |
| Desktop 正常完成 | 未验收 |
| Desktop API 错误 | 阻塞：缺少不改配置、认证或网络的安全可控触发方式 |
| CLI 非零或 API 错误 | 未验收 |
| 用户中断 | 未验收 |
| 微信离线后恢复重试 | 未验收 |

阶段 6 仍不得开始。只有剩余用例完成同样的四层证据且用户明确允许后，才能启动唯一的生产 `npm run watch`。
