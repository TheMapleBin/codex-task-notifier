# 已验证的微信公众号测试号契约

验证时间：2026-07-28 16:36:24（Asia/Shanghai）。

## 发送路径

1. 使用固定微信官方地址 `https://api.weixin.qq.com/cgi-bin/token`，通过 `client_credential`、`AppID` 和 `AppSecret` 获取短期 `access_token`。
2. 使用固定微信官方地址 `https://api.weixin.qq.com/cgi-bin/message/template/send`，通过接收人的 `OpenID` 和模板 ID 发送模板消息。
3. 测试模板内容为 `通知内容：{{content.DATA}}`；纯变量模板在真实微信中只显示标题。消息值继续使用项目已有的净化格式化函数，并针对测试号卡片将换行转换为单行分隔符。
4. `access_token` 在进程内缓存，失效错误只允许刷新并重试一次。

## 安全边界

- `AppID`、`AppSecret`、`OpenID` 和模板 ID 由当前 Windows 用户的 DPAPI 加密，保存在仓库外。
- 实发时解密值只通过子进程标准输入传递，不放入命令行参数、文档或日志。
- 微信响应正文和 `errmsg` 不输出；失败只保留 HTTP 状态、微信数字错误码、超时或连接失败类别。
- 当前三个入口优先使用 PowerShell 7 (`pwsh.exe`)，仅在未安装时回退 Windows PowerShell。

## 现场证据

- 自动化检查通过：adapter 请求构造、token 缓存、失效刷新、错误净化和超时，共 5 项。
- 全量测试在初次实现时为 52/52 通过。
- 手工发送命令返回成功。
- 用户确认个人微信实际收到测试模板消息。
- 2026-07-28 生产 adapter 已切换为本契约，用户随后确认个人微信连续收到两条“Codex 通知”。
- 切换后状态命令显示 `Transport: WeChat Official Account test account`、`Pending: 0`、`Delivered: 40`、`Failed: 2`。
- watcher PID `24468`、生命周期 supervisor PID `25548`，唯一计划任务 `CodexWeChatNotifierLifecycle` 为运行状态；PID 仅是当次现场快照，不作为长期配置。
- 两条 failed 是切换前已耗尽重试次数的旧 iLink 记录，并非测试号 adapter 返回失败；未读取其正文。
- 真实客户端已证明带固定标签的模板能显示变量；测试号卡片会截断单个长变量，且未配置 `url` 时不能点击展开。

## 尚未证明

- 尚未验证 2400 字符完整输出、API 错误通知、用户中断通知和微信接口离线后的 outbox 恢复。
- 测试号接口的长期平台政策和配额仍由微信官方控制，不能宣称永久不变。

## 生产选择与回滚

- 当前选择器：`%LOCALAPPDATA%\CodexWeChatNotifier\secure\active-transport.json`，值为 `wechat-test-account`，不含四项凭据。
- 切换测试号：`use-wechat-test-account.cmd`。
- 回滚直接 iLink：`use-ilink.cmd`。
- iLink DPAPI 配置继续保留；切换 transport 不需要 OpenClaw、Gateway、代理或重复扫码。
