# Codex / Claude 交接

## 当前事实

- 当前生产路径是直接腾讯 iLink。
- 唯一 watcher 由 `start-notifier.cmd` 管理；先运行状态命令，不要启动第二个。
- DPAPI schema 2 已配置，真实微信已确认收到直接 iLink 通知。
- 39/39 自动化测试通过。
- citation 清理与任务名称已完成软件验证，等待下一条真实微信通知确认显示。
- API 错误、中断和离线恢复尚未全部验收。

## 禁止回退

- 不修改 Codex `config.toml`、`base_url`、认证或启用 `15722`。
- 不安装或恢复 OpenClaw、Gateway、`openclaw-weixin` channel；生产发送链路是仓库内置的 iLink adapter。
- 不启用 Stop hook、生产 CLI wrapper、API proxy、第二个 service/watcher 或其他计划任务；唯一允许的是 `CodexWeChatNotifierLifecycle`。
- 不读取、输出、提交 bot token、context token、用户 ID、二维码材料、prompt、消息正文、源码或原始请求/响应。
- 任务名称优先使用 `threads.name`，否则使用 Codex UI 的 `threads.title`，并进行限长和敏感值净化。

## 接手步骤

1. `git status --short`，保护脏工作树。
2. 阅读本文件、实施计划、直连契约和现场验收。
3. 代码修改前做 GitNexus impact，提交前做 `detect_changes`。
4. 运行 `npm run check`、`npm test`、`git diff --check`。
5. 只暂存本任务文件，本地提交，不 push；提交后刷新 GitNexus 索引。
