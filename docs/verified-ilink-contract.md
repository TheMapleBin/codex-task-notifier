# 已验证的微信 iLink 直连契约

验证时间：2026-07-28（Asia/Shanghai）。

本项目依据 `xintaofei/codeg` 的公开实现确认腾讯 iLink 调用方式，并独立实现最小 adapter：

1. `GET /ilink/bot/get_bot_qrcode?bot_type=3` 获取二维码。
2. `GET /ilink/bot/get_qrcode_status` 在确认后取得 bot token 与 base URL。
3. `POST /ilink/bot/getupdates` 长轮询，只提取 `from_user_id` 与 `context_token`，不读取或保存消息正文。
4. `POST /ilink/bot/sendmessage` 发送净化后的 Codex 通知。
5. `POST /ilink/bot/getconfig` 获取 `typing_ticket`，再调用 `POST /ilink/bot/sendtyping`；状态 `1` 后立即发送状态 `2`，作为不可见的低占空比会话保活。

OpenClaw、Gateway、channel account/target 均不属于该契约，也不是运行依赖。2026-07-28 已核对本机不存在 OpenClaw 命令、全局 npm 包、配置目录、Gateway 计划任务或服务；旧 `npx` 安装目录和适配器测试临时夹具已移入回收站。

请求使用 `AuthorizationType: ilink_bot_token`、Bearer token、稳定的 `X-WECHAT-UIN` 和 channel version `1.0.2`。base URL 必须是微信 HTTPS 域名。HTTP/协议错误只记录净化类别或返回码，不记录响应正文。

bot token、base URL、to-user ID 和初始 context token 由 `configure-notifier.cmd` 写入 Windows DPAPI 配置。运行期的稳定 UIN、更新游标、to-user ID 和最新 context token 由 `ilink-session-state.ps1` 整体加密为独立 DPAPI blob。敏感值只通过子进程 stdin/pipe 传递，不写入仓库、Codex 配置、命令行参数或日志。

watcher 启动时优先恢复 DPAPI 会话状态。现场已证明完整停止并换 PID 重启后，无需重新发送绑定消息即可直接投递。若腾讯服务端明确返回 context 过期，outbox 仍保持 pending；用户给机器人发送新消息后，长轮询刷新并重新加密 context。

2026-07-28 的补充调查证明：省略 `context_token` 的 `sendmessage` 可返回 HTTP 200，但微信没有实际收到，因此禁止把 HTTP 成功当作主动推送成功。Codeg 遇到 `ret=-2` 也只缓存并等待下一条入站消息；腾讯官方 `@tencent-weixin/openclaw-weixin@2.4.6` 同样依赖 context，并在处理回复期间每 5 秒发送一次 typing。安装或运行 OpenClaw 不能绕过该协议限制。

历史生产阶段中，唯一 lifecycle supervisor 曾每 30 秒调用一次 `getconfig`，随后执行 `typing/cancel`；真实调用取得 `getconfig ret=0`、typing `ret=0` 和 cancel `ret=0`。未重新发送“绑定”、连续保活约 4 分钟后，主动发送返回 message ID，用户确认微信实际收到。2026-07-29 生产已切换为 QQ Bot，当前 iLink keepalive 为 `not used`；本段仅作为回滚契约与历史证据，不能当作当前运行状态。

真实证据：扫码和“绑定”后配置升级为 schema 2、transport 为 `weixin-ilink`。启动 watcher 后，两条真实 Codex 完成事件从 `pending: 2` 变为 `delivered: 2`、`failed: 0`；收件人确认微信实际收到，并展示了 watcher 元数据和最终 assistant 输出。2026-07-28 又完成一次进程级恢复验收：加密状态更新后停止 PID `23684`，启动新 PID `25248`，期间未再次绑定；“重启免绑定复测”进入 `delivered: 29` 且用户粘贴确认微信实际收到。整机冷启动尚未实际关机验收。

该证据证明直接 iLink 正常完成路径，不自动证明 API 错误、中断或离线恢复。
