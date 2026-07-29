# Codex / Claude 交接

## 当前事实

- 当前生产路径是直接 QQ Bot：唯一 watcher 内嵌原生 QQ Gateway，并调用官方 QQ HTTPS API；没有 OpenClaw。
- 唯一 watcher 由 `start-notifier.cmd` 管理，并由登录计划任务中的轻量 supervisor 跟随 `codex.exe` 启停；全部 Codex 退出 30 秒后 watcher 与 QQ Gateway 一起停止。先运行状态命令，不要启动独立生产 Gateway 或第二个 watcher。
- QQ、iLink 和测试号配置均使用当前 Windows 用户 DPAPI 保存；当前选择器为 `qqbot`。iLink/testing 配置只保留回滚。
- 82/82 自动化测试通过；QQ 独立及 watcher 同进程 smoke 各完成一次客户端实收确认。
- 2400 字符输出与 citation/rollout 尾部清理已完成真实微信复验。随后发现末尾 `::git-commit{...}` 仍会外泄，现已增加 Codex UI 指令白名单清理，等待下一条真实微信通知复验。
- API 错误、中断和离线恢复尚未全部验收。
- 稳定 UIN、更新游标和最新 context 已使用独立 DPAPI blob 持久化；完整 watcher 停止和换 PID 重启后，无绑定真实投递已通过。整机冷启动尚未现场验收，不得提前宣称通过。
- 不得再次把 watcher 改为无条件常驻；当前用户要求 Desktop/CLI 关闭后 30 秒停止、启动时自动恢复。QQ transport 下 supervisor 不执行 iLink 保活，不得新增常驻进程或计划任务。
- 2026-07-28 测试号曾完成生产实发，但真实客户端证明长变量会被卡片截断且不能展开；用户随后明确要求切回 iLink。
- 两条 failed 以及 `legacy=79`、`ilink=5` 条 pending 是切换前记录。outbox 已固定入队 transport，旧记录不会通过 QQ 重放；不得读取正文、重放或删除，除非用户另行明确授权。

## 禁止回退

- 不修改 Codex `config.toml`、`base_url`、认证或启用 `15722`。
- 不安装或恢复 OpenClaw、OpenClaw Gateway、`openclaw-weixin` channel；生产发送链路是仓库内置的 QQ adapter 与同进程原生 Gateway。独立 Gateway 命令只用于诊断。
- 不启用 Stop hook、生产 CLI wrapper、API proxy、第二个 service/watcher 或其他计划任务；唯一允许的是 `CodexWeChatNotifierLifecycle`。
- 同一任务在 context 失效期间只保留最新待发终态，避免恢复后旧通知连续消耗新 context。
- 不得将 `weixin-ilink-session.dpapi.json` 的解密内容、字段值或 helper stdin/stdout 写入日志、响应或 Git。
- 不读取、输出、提交 bot token、context token、用户 ID、二维码材料、prompt、消息正文、源码或原始请求/响应。
- 任务名称优先使用 `threads.name`，否则使用 Codex UI 的 `threads.title`，并进行限长和敏感值净化。
- 子代理必须通过 `session_meta` 的 parent/thread source/agent path/source 标记过滤，不发送完成通知。
- 最终输出上限为 2400 字符；必须在截断前清除完整、残缺和 HTML 转义的 citation/rollout 内部元数据尾块，以及末尾独立行中的 `::git-commit`、`::created-thread`、`::code-comment`。不得泛化为删除正文中的任意 `::` 内容。

## 接手步骤

1. `git status --short`，保护脏工作树。
2. 阅读本文件、实施计划、直连契约和现场验收。
3. 代码修改前做 GitNexus impact，提交前做 `detect_changes`。
4. 运行 `npm run check`、`npm test`、`git diff --check`。
5. 只暂存本任务文件，本地提交，不 push；提交后刷新 GitNexus 索引。

QQ adapter 必须等待 Gateway `READY` 且发送响应包含消息 ID；`HELLO`、进程存在或 HTTP 状态不能单独当作收件成功。用户已两次确认 QQ 客户端实收，当前真实 watcher 根任务仍需确认。

## 后续验收

1. QQ watcher 生产路径的真实根任务与 2400 字长输出复验。
2. Desktop 可控 API 错误。
3. CLI 非零或 API 错误。
4. 用户中断。
5. QQ Gateway/API 暂时不可用后的 outbox 自动恢复。
