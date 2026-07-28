# 微信公众号测试号试验

该路径用于验证微信官方模板消息能否替代存在激活窗口的 iLink。当前仅为独立试验，不接管生产 watcher，不修改 iLink 配置、outbox、生命周期计划任务或 Codex 全局配置。

## 平台配置

1. 打开微信官方测试号页面：<https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login>。
2. 微信扫码登录，并在“测试号二维码”区域关注测试号。
3. 在“模板消息接口”新增模板，模板标题可填写 `Codex 通知`，模板内容必须填写：

```text
{{content.DATA}}
```

4. 页面会显示 `AppID`、`AppSecret`、关注用户的 `OpenID` 和新增模板的模板 ID。
5. 不要把这些值发送到聊天、日志或文档。

## 本机配置和实发

运行 `configure-wechat-test-account.cmd`，在独立终端窗口中依次输入四个值。入口优先使用 PowerShell 7 (`pwsh.exe`)，仅在未安装时回退 Windows PowerShell。所有值都会用当前 Windows 用户的 DPAPI 加密，配置保存到 `%LOCALAPPDATA%\CodexWeChatNotifier\secure\wechat-test-account.dpapi.json`。

然后运行 `test-wechat-test-account.cmd`。成功只能证明微信官方发送命令返回成功；仍需用户确认微信实际收到。状态可通过 `wechat-test-account-status.cmd` 查看，命令不会显示配置值。

## 阶段门禁

- 真实收到前，不修改生产 adapter 选择逻辑。
- 首次实发使用短消息；完整 2400 字输出、错误通知和离线重试需另行验收。
- 生产切换前必须重新执行 GitNexus impact，并保留 iLink 配置作为可回滚路径。
