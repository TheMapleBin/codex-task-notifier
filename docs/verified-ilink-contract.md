# 已验证的微信 iLink 直连契约

验证时间：2026-07-28（Asia/Shanghai）。

本项目依据 `xintaofei/codeg` 的公开实现确认腾讯 iLink 调用方式，并独立实现最小 adapter：

1. `GET /ilink/bot/get_bot_qrcode?bot_type=3` 获取二维码。
2. `GET /ilink/bot/get_qrcode_status` 在确认后取得 bot token 与 base URL。
3. `POST /ilink/bot/getupdates` 长轮询，只提取 `from_user_id` 与 `context_token`，不读取或保存消息正文。
4. `POST /ilink/bot/sendmessage` 发送净化后的 Codex 通知。

OpenClaw、Gateway、channel account/target 均不属于该契约，也不是运行依赖。2026-07-28 已核对本机不存在 OpenClaw 命令、全局 npm 包、配置目录、Gateway 计划任务或服务；旧 `npx` 安装目录和适配器测试临时夹具已移入回收站。

请求使用 `AuthorizationType: ilink_bot_token`、Bearer token、稳定的 `X-WECHAT-UIN` 和 channel version `1.0.2`。base URL 必须是微信 HTTPS 域名。HTTP/协议错误只记录净化类别或返回码，不记录响应正文。

bot token、base URL、to-user ID 和 context token 由 `configure-notifier.cmd` 写入 Windows DPAPI 配置。启动器只向 watcher 子进程注入，不写入仓库、Codex 配置、命令行参数或日志。

context 过期时，outbox 保持 pending；用户给机器人发送新消息后，长轮询在内存中刷新 context 并继续重试。

真实证据：扫码和“绑定”后配置升级为 schema 2、transport 为 `weixin-ilink`。启动 watcher 后，两条真实 Codex 完成事件从 `pending: 2` 变为 `delivered: 2`、`failed: 0`；收件人确认微信实际收到，并展示了 watcher 元数据和最终 assistant 输出。

该证据证明直接 iLink 正常完成路径，不自动证明 API 错误、中断或离线恢复。
