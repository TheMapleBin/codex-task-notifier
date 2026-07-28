# QQ Bot 迁移计划

## 目标

将当前 Codex Desktop/CLI 任务终态通知从微信 iLink 迁移到腾讯 QQ Bot C2C 主动消息，同时保留现有 watcher、持久 outbox、敏感信息净化、子代理过滤和跟随 Codex 启停机制。

目标不是引入完整 OpenClaw，而是先验证并优先采用腾讯 QQ Bot Node.js SDK 的最小直连 adapter。只有直连路径无法满足运行或验收要求时，才评估官方 OpenClaw QQ channel 插件。

```text
Codex Desktop/CLI rollout JSONL
  -> 现有 session watcher
  -> 现有持久 outbox
  -> QQ Bot adapter（C2C 主动消息）
  -> QQ 用户 openid
```

## 当前边界

- 当前生产 transport 仍为直接腾讯微信 iLink；本计划尚未执行。
- 不安装 QQ 插件、不创建 OpenClaw Gateway、不新增计划任务、不修改 Codex 全局配置。
- 不删除微信 iLink、微信公众号测试号配置或已有 DPAPI 状态；QQ 验收通过前不得切换生产 transport。
- 不读取、输出或提交 AppSecret、access token、openid、二维码凭据、消息正文或原始请求/响应正文。
- 不通知子代理；保持现有 parent/thread source/agent path 过滤规则。
- 不把 SDK 返回成功、HTTP 200、进程运行或 outbox `delivered` 单独视为 QQ 手机端已收到；仍需用户现场确认。

## 已知技术事实

基于腾讯官方 `@tencent-connect/qqbot-nodejs` SDK 和 `@tencent-connect/openclaw-qqbot` 插件的只读审计：

- 不带 `msgId` 的 `sendText` 走 C2C/群组主动消息接口；不依赖最近一条入站消息的会话上下文。
- C2C 主动消息目标是用户 `openid`；群组目标是群组 `openid`；QQ 频道不支持该主动消息路径。
- SDK 使用 `appId + appSecret` 自动获取和缓存 access token，按 `expires_in` 管理并提前刷新；这与微信 iLink 的 `context_token` 不是同一种生命周期。
- SDK 对网络、HTTP 错误、HTTP 429 和 QQ 业务错误抛出结构化错误；发送层仍需由现有 outbox 负责持久重试。
- 官方插件的被动回复限制器默认每条入站消息最多 4 次、跟踪 TTL 1 小时；过期时可去掉 `msgId` 降级主动发送。这是插件策略，不是本项目可靠投递的替代品。
- QQ 主动消息存在平台额度/频率限制，但 SDK 和插件未给出统一固定的每日数字；必须把 429/业务限流作为可重试错误处理。

## 分阶段计划

### 阶段 0：只读基线与安全检查

1. 读取 `notifier-status.cmd`、`auto-notifier-status.cmd`、Git 状态和当前 transport 选择。
2. 确认只有一个 watcher、一个 lifecycle supervisor 和现有 `CodexWeChatNotifierLifecycle` 计划任务。
3. 只读确认 QQ Bot SDK 版本、主动消息 endpoint、错误字段和 Token 生命周期；不打印凭据或正文。
4. 记录当前 iLink 的可回滚状态，不改生产配置。

**门禁：** 只有确认工作树脏改动已隔离、现有 watcher 未被重复启动、QQ 依赖和 API 契约有本机/官方证据，才能进入阶段 1。

### 阶段 1：QQ 凭据与目标建立

1. 用户在腾讯 QQ 开放平台创建或提供已有 QQ Bot 的 AppID/AppSecret。
2. 启动最小一次性绑定流程，让用户在 QQ C2C 私聊中向机器人发送一条消息。
3. 从入站事件安全提取并 DPAPI 加密保存 `accountId`、用户 `openid` 和必要的非敏感配置。
4. 目标标识只通过安全环境/加密存储读取，禁止出现在命令行、日志、文档和 Git。

**门禁：** 必须证明同一 `openid` 可在进程重启后复用；若只能依赖每次用户重新发消息，则暂停迁移并报告。

### 阶段 2：最小真实 QQ 主动发送

1. 使用 QQ C2C 主动消息接口手工发送一条短测试消息，例如“Codex QQ 通知链路测试 + 时间戳”。
2. 记录脱敏后的命令/adapter 契约、HTTP 状态类别、业务错误类别和返回消息 ID。
3. 等待用户确认 QQ 客户端实际收到；未确认不得切换 watcher adapter。
4. 重启一次发送进程后，在不重新绑定的情况下再次发送，验证 openid 和 Token 自动恢复。

**门禁：** 必须同时满足发送命令成功、返回消息 ID、用户实际收到、重启后无需重新绑定；任何一项失败都保留 iLink 生产路径。

### 阶段 3：实现 QQ adapter

1. 在现有 adapter 接口下新增 QQ 实现，复用 outbox、去重、退避、超时、敏感信息净化和状态统计。
2. 第一版只支持 C2C 文本主动消息；不实现频道、群组、媒体、流式消息或完整 OpenClaw channel。
3. 对 Token 获取失败、HTTP 429、权限错误、目标无效、网络超时分别归类；可重试错误留在 pending，不可重试错误进入 sanitized failed 状态。
4. 保留 iLink adapter 和 transport selector，默认仍为 iLink，QQ 只能通过显式测试选择器启用。
5. 增加单元测试：请求构造、无 `msgId` 主动发送、Token 不泄露、错误分类、超时、429 退避、离线恢复和消息净化。

**门禁：** `npm run check`、`npm test`、`git diff --check` 全部通过；不能影响现有 iLink 测试和运行状态。

### 阶段 4：watcher 集成与可控现场测试

按现有 outbox 契约逐项验证，不把模拟测试当真实收件：

1. Desktop 正常完成。
2. Desktop API 错误。
3. CLI 正常完成。
4. CLI 非零退出或 API 错误。
5. 用户中断/`turn_aborted`。
6. QQ API 暂时离线后恢复重试。
7. watcher 进程重启后无需重新绑定发送。
8. 子代理完成事件不发送。
9. 长输出、任务名称、末尾内部元数据净化与 2400 字上限保持不回退。

每个用例必须分别记录：事件已捕获、已入 outbox、发送命令成功、QQ 客户端实际收到。

### 阶段 5：生产切换（需用户确认）

只有阶段 0-4 全部通过，且用户明确确认后：

1. 备份当前 selector 和 QQ DPAPI 配置状态，不复制明文凭据。
2. 将 transport selector 从 iLink 切换到 QQ adapter。
3. 保留同一个 watcher、同一个 lifecycle supervisor 和同一个计划任务，不创建第二套常驻体系。
4. 首次生产运行持续观察 pending、delivered、failed、429 和 Token 刷新状态。
5. 任一关键验收失败时，使用现有 selector 回滚到 iLink，不删除 QQ 配置。

## 回滚条件

出现以下任一情况，立即停止 QQ 生产切换并恢复 iLink：

- QQ 主动消息需要用户再次发消息才能发送。
- QQ 手机端未收到但 adapter 报告成功，且无法取得可解释的错误信号。
- Token 刷新、429 或网络恢复导致 pending 无法自动重试。
- 现有 2400 字输出净化、任务名称、子代理过滤或生命周期行为回归。
- 需要引入 OpenClaw Gateway、第二个 watcher、代理、Stop hook 或新的计划任务才能工作。

## 暂不做的事项

- 不安装完整 OpenClaw。
- 不启用 QQ 频道主动消息。
- 不实现 QQ 流式 `stream_messages` 作为通知通道。
- 不把 QQ 平台额度当作无限推送能力。
- 不删除微信 iLink、测试号配置、旧 outbox failed 记录或用户已有脏工作树修改。

## 完成定义

QQ 迁移只有在以下证据齐全后才可称为完成：

- QQ C2C 主动消息契约已记录且凭据不出现在仓库。
- 进程重启后无需重新绑定即可发送。
- Desktop/CLI 正常、异常、中断和离线恢复均完成真实现场验收。
- 每条验收均有捕获、入队、发送成功和用户收件四级证据。
- iLink 可一键回滚，工作树和现有计划任务未被破坏。
