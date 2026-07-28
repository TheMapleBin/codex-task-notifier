# 微信公众号测试号接入

该路径已于 2026-07-28 从独立试验升级为生产 transport，用微信官方模板消息替代存在激活窗口的 iLink。切换不修改 outbox、生命周期计划任务或 Codex 全局配置，原 iLink DPAPI 配置保留用于回滚。

## 平台配置

1. 打开微信官方测试号页面：<https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login>。
2. 微信扫码登录，并在“测试号二维码”区域关注测试号。
3. 在“模板消息接口”新增模板，模板标题可填写 `Codex 通知`，模板内容必须带固定标签：

```text
通知内容：{{content.DATA}}
```

4. 页面会显示 `AppID`、`AppSecret`、关注用户的 `OpenID` 和新增模板的模板 ID。
5. 不要把这些值发送到聊天、日志或文档。

## 本机配置和实发

运行 `configure-wechat-test-account.cmd`，在独立终端窗口中依次输入四个值。入口优先使用 PowerShell 7 (`pwsh.exe`)，仅在未安装时回退 Windows PowerShell。所有值都会用当前 Windows 用户的 DPAPI 加密，配置保存到 `%LOCALAPPDATA%\CodexWeChatNotifier\secure\wechat-test-account.dpapi.json`。

然后运行 `test-wechat-test-account.cmd`。成功只能证明微信官方发送命令返回成功；仍需用户确认微信实际收到。状态可通过 `wechat-test-account-status.cmd` 查看，命令不会显示配置值。

## 阶段门禁

- 2026-07-28 16:36:24（Asia/Shanghai），微信官方发送命令返回成功，用户随后确认个人微信实际收到“微信公众号测试号链路测试”。
- 该证据验证了 `AppID/AppSecret -> access_token -> template/send -> OpenID` 的短消息链路。
- 首次实发使用短消息；完整 2400 字输出、错误通知和离线重试需另行验收。
- 真实微信验证表明：纯 `{{content.DATA}}` 模板只显示标题；带固定标签后可以显示变量。测试号卡片仍会截断单个超长变量且无 `url` 时不能展开，因此生产 adapter 将换行压成单行分隔符，完整 2400 字展示仍未通过。
- 生产切换已完成，用户确认个人微信连续收到两条“Codex 通知”。现场状态为 `Pending 0 / Delivered 40 / Failed 2`。
- iLink 配置继续保留为可回滚路径；两条 failed 是切换前已耗尽尝试次数的旧记录，未经授权不得读取、重放或删除。
