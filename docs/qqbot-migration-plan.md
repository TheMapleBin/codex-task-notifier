# QQ Bot 直连迁移计划

## 已确认的路线

Codex 通知将使用仓库内的 QQ Bot HTTPS adapter，并由一个原生、最小的 QQ WebSocket Gateway 在线守护保持机器人可用。不安装、不启动、也不依赖 OpenClaw 或其 Gateway。现有微信 iLink 路线继续作为生产回滚，直到 QQ 的真实现场验收完成。

```text
Codex Desktop / CLI rollout JSONL
  -> 现有 session watcher
  -> 现有持久 outbox
  -> 直接 QQ Bot HTTPS adapter
  -> QQ C2C 主动文本消息

原生 QQ Gateway 在线守护
  -> 官方 WebSocket 心跳 / 重连
  -> 仅记录主动消息允许或拒绝状态
```

首次取得用户 `openid` 时，需要短暂运行一次独立的 QQ Gateway 绑定器；绑定后 `openid` 会和 AppID/AppSecret 一起 DPAPI 加密。日常投递仍只使用 HTTPS，但 QQ 平台要求机器人保持 Gateway 在线，因此另有一个不含 OpenClaw 的原生 Gateway 守护进程。它不读取或持久化聊天正文、OpenID、token 或原始事件。

## 当前边界

- 当前生产 transport 仍为直接微信 iLink；本计划尚未授权切换它。
- 不删除 iLink、微信公众号测试号配置、已有 DPAPI 状态、旧 outbox 记录或用户已有脏工作树修改。
- 不修改 `C:\Users\TheMapleBin\.codex\config.toml`、`base_url`、`15722`，不新增 watcher、代理、hook 或计划任务。原生 QQ Gateway 是单独、可显式启动和停止的轻量在线进程，尚未接入生产生命周期。
- 不读取、输出、提交或写日志记录 AppSecret、access token、openid、二维码凭据、消息正文或原始请求/响应正文。
- 不通知子代理；沿用现有根任务过滤、去重、任务名称解析、2400 字输出上限和末尾元数据净化。
- HTTP 成功、SDK 返回、outbox `delivered` 或进程运行都不能单独证明 QQ 客户端实际收到；必须由收件人确认。

## 本机与官方 SDK 已核对的契约

对 `@tencent-connect/qqbot-nodejs@1.0.4` 的只读审计与腾讯 QQ Bot 官方入口一致：

- 获取 token：`POST https://bots.qq.com/app/getAppAccessToken`，JSON 为 `{ appId, clientSecret }`。
- C2C 主动消息：`POST https://api.sgroup.qq.com/v2/users/{openid}/messages`，请求头为 `Authorization: QQBot <access_token>`。
- 主动纯文本正文为 `{ content, msg_type: 0 }`，不传 `msg_id`，因此不依赖微信 iLink 的最近入站 `context_token`。
- 正常消息响应含 `id`；adapter 只保存脱敏后的发送结果，不保存响应正文。
- token 按 `expires_in` 缓存并提前刷新；401/403 发送失败会最多刷新一次 token 后重试。
- 429、网络错误、超时、5xx 保持在 outbox 中退避重试；明确的鉴权/参数/目标拒绝会以脱敏错误直接移到 `failed`，避免无意义地耗尽重试。

QQ 平台仍可能存在额度或频率限制，无法从 SDK 推导固定的全局数字；429 必须按真实响应处理，不能被当作永久成功或无限配额。

## 已实现但尚未上线的内容

- `src/adapters/qqbot.mjs`：原生 `fetch` 的 C2C 主动消息 adapter；无 npm 运行依赖、无 OpenClaw 子进程。
- `src/qqbot-config.mjs` 与 `scripts/qqbot-config.ps1`：只从当前 Windows 用户 DPAPI 读取 AppID、AppSecret、openid。
- `bind-qqbot.cmd`：一次性原生 QQ Gateway 绑定器，收到一条 C2C 消息后直接 DPAPI 加密保存 OpenID 并退出；不使用 OpenClaw。
- `configure-qqbot.cmd`、`qqbot-status.cmd`、`test-qqbot.cmd`：手工配置、只读状态、一次短消息 smoke test；均不改当前生产 transport。
- `start-qqbot-gateway.cmd`、`stop-qqbot-gateway.cmd`、`qqbot-gateway-status.cmd`：原生 Gateway 的显式启动、停止和脱敏状态查看；它们不启动 watcher，也不会改变生产 transport。
- `src/qqbot-gateway.mjs`：官方 Gateway Identify、heartbeat、指数退避重连和 `C2C_MSG_RECEIVE` / `C2C_MSG_REJECT` 脱敏状态记录。
- token 缓存、401 刷新一次、超时、离线、429 Retry-After、不可重试拒绝和敏感信息不外泄的单元测试。
- outbox 新增 `retryable=false` 和 `retryAfterMs` 的受限处理；既有 iLink context 过期路径不变。

仍未完成：真实 QQ Gateway 在线、真实 C2C 实发、重启后复测、watcher 实发和生产切换。没有这些现场证据前，不能宣称 QQ 已接入生产。

## 后续阶段与门禁

### 阶段 1：一次性绑定并加密保存目标

1. 用户在 <https://q.qq.com/qqbot/openclaw/index.html> 创建或选择 QQ Bot，取得 AppID/AppSecret。
2. 在 QQ Bot 控制台为该机器人启用 C2C/群聊消息事件权限；若未启用，绑定器会给出脱敏的 `QQBOT_BIND_INTENT_NOT_ENABLED`。
3. 运行短生命周期、直接 QQ Gateway 绑定器；用户仅需向机器人发一次“绑定”。绑定器从 `C2C_MESSAGE_CREATE.author.user_openid` 提取目标，绝不打印它，随后立即 DPAPI 加密并退出。
4. 不使用 OpenClaw，不把凭据放进命令行、环境变量、仓库或日志。

**门禁：** 配置文件必须属于当前用户、状态命令只显示 `Configured: yes`，且绑定器退出后没有任何常驻 Gateway。

### 阶段 2：最小真实 QQ 主动发送

1. 运行 `start-qqbot-gateway.cmd`，并用 `qqbot-gateway-status.cmd` 确认 `Running: yes` 与 `Gateway state: online`。
2. 若在 Gateway 启动前已开启“主动消息”，状态可能是 `unknown`；这是未观察到历史事件，不是权限失败。可在 Gateway 在线时关闭再开启一次以得到 `allowed`，无需重新绑定。
3. 运行 `test-qqbot.cmd` 发送“Codex QQ 通知链路测试 + 时间戳”。
4. 记录仅含 transport、退出状态和脱敏错误类别的本机证据；不打印 token/openid/正文/原始响应。
5. 等待用户确认 QQ 客户端实际收到。
6. 停止并重新运行 Gateway 与 smoke test；不重新发送“绑定”，再次等待用户确认。

**门禁：** Gateway 两次在线、两次发送命令成功、两次客户端收件确认、且重启无需重新绑定。任一项失败则继续使用 iLink。

### 阶段 3：受控 watcher 验收

仅在阶段 2 通过后，以显式测试选择器让现有 watcher 使用 QQ adapter，依次验收：

1. Desktop 正常完成。
2. Desktop API 错误。
3. CLI 正常完成。
4. CLI 非零退出/API 错误。
5. 用户中断。
6. QQ API 离线/429 后的持久 outbox 恢复。
7. 子代理终态不投递。
8. 长输出、任务名称和末尾内部元数据净化不回退。

每项必须分开记录：事件捕获、已入 outbox、发送命令成功、QQ 客户端实际收到。

### 阶段 4：生产切换（需再次明确确认）

只有阶段 1-3 全部完成后，才允许将现有 transport selector 从 iLink 切到 `qqbot`。切换时保持同一 watcher、同一 lifecycle supervisor 和同一登录计划任务；不创建第二套常驻体系。首次运行必须观察 pending、delivered、failed、429 和 token 刷新。任何关键验收失败立即切回 iLink。

## 回滚条件

- QQ 主动发送仍要求用户每次先发消息。
- QQ 客户端未收到而 adapter 显示成功，且没有可解释的脱敏失败信号。
- 429、token 刷新、网络恢复或重启导致 outbox 不能自动恢复。
- 现有子代理过滤、任务名称、输出净化或生命周期行为回退。
- 需要引入 OpenClaw Gateway、第二个 watcher、代理、Stop hook 或新计划任务才能工作。
