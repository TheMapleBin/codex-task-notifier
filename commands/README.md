# Windows 命令入口

此目录集中保存 Windows 双击入口。根目录仅保留首次绑定、自动启用、状态和禁用的兼容快捷方式。

## 日常使用

- `bind-qqbot.cmd`：首次绑定 QQ Bot，DPAPI 保存配置。
- `enable-auto-notifier.cmd`：启用跟随 Codex 的唯一 lifecycle supervisor。
- `auto-notifier-status.cmd`：查看 supervisor 与计划任务。
- `notifier-status.cmd`：查看 watcher、QQ Gateway 和 outbox。
- `disable-auto-notifier.cmd`：禁用自动模式并停止 watcher。

## 手工与诊断

- `start-notifier.cmd` / `stop-notifier.cmd`：手工控制唯一 watcher。
- `qqbot-status.cmd` / `test-qqbot.cmd`：检查配置或执行一次真实发送测试。
- `start-qqbot-gateway.cmd` / `stop-qqbot-gateway.cmd` / `qqbot-gateway-status.cmd`：独立 Gateway 诊断，不用于生产。

## 备用 transport

- `use-qqbot.cmd`：选择当前生产 QQ Bot transport。
- `use-ilink.cmd`：回滚到微信 iLink。
- `use-wechat-test-account.cmd`：切换到微信公众号测试号。
- `configure-notifier.cmd`、`configure-wechat-test-account.cmd` 及对应测试/状态命令仅用于备用路径。

生产环境只允许一个 watcher、一个内嵌 QQ Gateway 和现有的 `CodexWeChatNotifierLifecycle` 计划任务。运行诊断入口前先执行状态命令。
