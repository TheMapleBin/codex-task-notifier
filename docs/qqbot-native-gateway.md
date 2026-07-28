# QQ Bot 原生 Gateway 在线守护

## 目的与边界

QQ Bot 的 C2C 主动消息仍由 `src/adapters/qqbot.mjs` 通过官方 HTTPS 接口发送；这个小进程只保持官方 QQ WebSocket Gateway 在线，以满足平台对机器人在线状态的要求。它不是 OpenClaw，也不启动 OpenClaw Gateway、HTTP 代理、第二个 watcher、hook 或计划任务。

当前生产 transport 仍是微信 iLink。本组件完成本地实现和单独现场验证前，不得把 watcher 改为 QQ Bot。

## 安全契约

- AppSecret、access token、OpenID、消息正文、原始 Gateway 事件和原始 HTTP 响应均不会写入 stdout、stderr、日志、状态文件或仓库。
- AppID/AppSecret/OpenID 只从当前 Windows 用户的既有 DPAPI 文件读取；access token 只存在于进程内存。
- `%LOCALAPPDATA%\CodexWeChatNotifier\run\qqbot-gateway-status.json` 只包含受限状态、主动消息状态、时间和受限错误码；目录由控制脚本设为当前用户私有。
- 收到 `C2C_MSG_RECEIVE` 仅记录 `Active messages: allowed`；收到 `C2C_MSG_REJECT` 仅记录 `rejected`。不会保留事件 ID、OpenID 或内容。

## 行为

1. 读取 DPAPI 配置，获取临时 AppAccessToken 和官方 Gateway URL。
2. 用 `GROUP_AND_C2C_EVENT` intent 进行 Identify，按服务端给出的心跳间隔发送 heartbeat。
3. 普通断开、网络/限流/上游短暂故障采用 1 秒至 60 秒指数退避重连；鉴权错误或未启用 intent 进入 `blocked`，不无限重试。
4. 连接状态按 `starting`、`connecting`、`online`、`backoff`、`blocked`、`stopped` 写入脱敏状态文件。

它没有保存或复用 Gateway session/resume token；每次重连重新取得短期 token 并 Identify，保持实现最小且不把会话凭据落盘。

## 手工验收

以下命令都只操作原生 QQ Gateway，不改变 iLink watcher 的生产 transport：

1. 双击 `start-qqbot-gateway.cmd`。
2. 双击 `qqbot-gateway-status.cmd`，确认 `Running: yes` 与 `Gateway state: online`。
3. 若 `Active messages: unknown`，它只表示“开启主动消息”的事件发生在 Gateway 启动前，不能据此推断权限失效。若需要用事件确认状态，可在 Gateway 在线时在 QQ 资料卡关闭再开启一次“主动消息”；无需重新绑定，也不需要重新输入凭据。
4. 运行 `test-qqbot.cmd`，并由收件人在 QQ 客户端确认实际收到。官方消息 ID 回执只证明 API 接受，不能替代客户端确认。
5. 运行 `stop-qqbot-gateway.cmd`，再执行 `qqbot-gateway-status.cmd`，确认 `Running: no`。这一步不会删除绑定或 DPAPI 配置。

## 失败处理

- `QQBOT_GATEWAY_INTENT_NOT_ENABLED`：检查 QQ Bot 控制台的 C2C/群聊事件权限；不需要重新绑定。
- `QQBOT_GATEWAY_AUTH_FAILED` 或 `QQBOT_GATEWAY_TOKEN_AUTH_FAILED`：检查 QQ Bot 控制台的 AppID/AppSecret；不要把值粘贴到终端命令行或聊天中。
- `QQBOT_GATEWAY_RATE_LIMITED`、`*_UPSTREAM_UNAVAILABLE`、`*_CONNECTION_*`：进程会在退避后自动重连；等待 `online` 后再进行一次独立真实发送。
- 状态 `online` 与 HTTPS 消息 ID 都不等于客户端已展示消息；仍须由收件人确认。失败时保留 iLink 作为唯一回滚路径。
