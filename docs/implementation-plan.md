# Codex 到 OpenClaw 微信通知实施计划

## 目标和范围

在同一台 Windows 主机上，以尽可能少的常驻组件，把 Codex Desktop 与 CLI 的任务终态和可确认的 API 错误通知到微信。正式运行时只允许一个进程外 `npm run watch`：它读取会话 JSONL、写入持久 outbox，并调用已验证的 OpenClaw CLI adapter。

本计划的阶段顺序是强制门禁。已实现、自动化测试通过、发送命令成功和用户在微信端实际收到，是四种不同证据；后一个阶段不能由前一个阶段替代。

## 不可变边界

- 保留现有 OpenClaw 安装、Gateway 计划任务和两个既有微信 channel；禁止删除、重建、重新登录或重复扫码。
- 不读取、打印、提交或在聊天中索要 account、完整 target、token、cookie、二维码材料、用户 prompt、用户消息、源码或原始请求/响应正文。仅允许处理当前任务最后一条 assistant 输出，并且必须先净化和截断。
- 在阶段 2 的真实微信实发成功之前，不得修改 `C:\Users\TheMapleBin\.codex\config.toml`，不得切换 `base_url`，不得启用 `15722`，不得新增计划任务或服务。
- 即使阶段 2 已完成，Stop hook、CLI wrapper、API proxy 和 `15722` 仍不是当前生产路径。它们只能按下面的阶段门禁作为可选验证对象。
- 不把模拟、`dry-run`、channel configured/enabled、端口监听、Gateway 可达或单独的发送退出码当作微信实际送达。

## 阶段状态

| 阶段 | 允许工作 | 当前结论 | 已有直接证据 | 下一道门禁 |
| --- | --- | --- | --- | --- |
| 1. 发送路径调查 | 只读核对 Codeg、OpenClaw CLI、Gateway、channel 与目标发现方式 | 完成，选择既有 OpenClaw CLI | 插件已加载；当前运行账号有 `send` 能力；`openclaw message send` 提供 channel/account/target/message/json 和退出码契约 | 选择路径后才可做一次手工实发 |
| 2. 最小真实微信实发 | 通过实际入站元数据确定 target，手工发送一条净化测试通知 | 完成 | 命令退出码为 0，收件人已确认微信实际收到 | 记录无敏感发送契约 |
| 3. 最小外部 watcher | 只实现 JSONL watcher、持久 outbox 和真实 adapter；默认排除子代理并去重 | 实现与软件验证完成，未部署 | `bf98bec`、`6edcbea`、`a24bef4`、`373fd3d`；30 项自动化测试通过；Windows adapter 不经过 shell | 需要真实 Codex 终态的四层证据；新增最终输出尚需微信显示验收 |
| 4. CLI 精确退出码 | 仅验证 `codex exec` 自动化 wrapper 的 stdout/stderr 与退出码 | 实现与软件验证完成，未部署 | `ced6bdc`；wrapper 测试覆盖 stderr 透传、非零退出和中断 | 仅在 watcher 无法给出精确退出码时使用 |
| 5. 判断 API 代理是否必要 | 用真实 Desktop 和 CLI 的可控任务与 API 失败验证 watcher/wrapper | 进行中 | CLI 正常完成已通过四层验收；仍无不改 Desktop 配置、认证或网络即可安全注入的 Desktop API 失败 | 完成其余用例的四层证据 |
| 6. 生产接入 | 启动一个 watcher，并完成全套现场验收 | 未开始 | 无 | 阶段 5 全部通过且用户明确允许 |

## 已验证发送契约

发送路径只使用现有 OpenClaw CLI：

```text
openclaw message send \
  --channel openclaw-weixin \
  --account <secure account> \
  --target <secure full inbound address> \
  --message <sanitized notification> \
  --json
```

完整约束见 [已验证的 OpenClaw 微信发送契约](verified-openclaw-contract.md)。实际 target 必须是完整入站地址，不能仅使用 peer 部分。`default` 配置不等于已运行的发送账号；不要猜测、枚举或复用任何 account/target。Codeg 的 iLink 轮询迹象没有形成可安全复用的公开发送与收件人契约，因此不作为发送路径。

## 阶段 3 的实现边界

`npm run watch` 会在一个进程中启动以下组件，而不会打开本地 HTTP listener：

1. 会话 JSONL watcher：只在启动后读取新增记录，默认忽略子代理，识别 `task_complete`、`task_complete.error` 和 `turn_aborted`。
2. 持久 outbox：先落盘、去重、重试；发送失败或超时不会阻塞 Codex。
3. OpenClaw adapter：仅从 `CODEX_NOTIFY_OPENCLAW_ACCOUNT` 与 `CODEX_NOTIFY_OPENCLAW_TARGET` 取得敏感定位值，且丢弃子进程 stdout/stderr。

通知内容严格限于来源、项目名、状态、耗时、短任务 ID、净化后的错误类别、HTTP 状态，以及当前任务最后一条 assistant 输出。最终输出保留换行、最多 1200 个字符，并在写入 outbox 前移除控制字符和遮盖明显的认证头、Cookie、token、API key、密码与 secret。watcher 只接受 rollout 中 `role=assistant` 的 `output_text`；CLI wrapper 只接受 `item.completed` 的 `agent_message`。不得包含用户 prompt、用户消息、完整会话、文件内容、认证值或原始请求/响应与错误正文。没有 assistant 结果的 API 失败或中断可以省略输出段。

## 阶段 5 现场验收

阶段 5 需要用户可观察的真实 Codex Desktop 和 CLI 会话。不得通过改全局配置、重置认证、代理网络或重启 OpenClaw 来“制造”失败。每项都必须分别留存以下无敏感元数据：

1. watcher 或 wrapper 捕获到事件。
2. 事件已持久化进入 outbox。
3. OpenClaw 发送命令成功。
4. 收件人确认微信实际收到。

| 用例 | 需要证明的终态 | 当前状态 |
| --- | --- | --- |
| Desktop 正常完成 | `turn_finished` 被捕获并送达 | 未验收 |
| Desktop API 错误 | 错误类别或 HTTP 状态被净化后送达 | 阻塞：缺少安全可控的失败触发方式 |
| CLI 正常完成 | watcher 捕获终态并送达 | 已验收：2026-07-28，见 [现场验收记录](live-acceptance.md) |
| CLI 非零或 API 错误 | watcher 或按需 wrapper 捕获并送达 | 未验收 |
| 用户中断 | `turn_aborted` 或精确 CLI 中断被捕获并送达 | 未验收 |
| 微信暂时离线后恢复 | pending outbox 重试并最终送达 | 未验收 |

如果 watcher 与 wrapper 都已覆盖真实 API 错误，阶段 5 的结论必须是“不启用代理”。只有给出一个两者都会漏报、且透明代理能覆盖的可复现实例后，才能建议 `15722`；先提交风险、回滚方案和用户确认，再进行任何 `base_url` 改动。

## 阶段 6 生产接入

只有阶段 5 全部通过后，才可在用户明确授权下启动单个 `npm run watch` 作为最小常驻方式。不要新建或重复启动 Gateway，也不要建立第二个 notifier 服务。生产开始后按上表逐项复验，记录事件捕获、outbox、发送命令和微信收件确认四层结果。

清理、合并微信账号、移除 Gateway、代理、生成文件或计划任务是独立的最后工作；必须先列出每个对象和影响，等待用户确认，禁止自行删除。

## 验证与提交规则

当前软件验证为 `npm run check` 与 `npm test`，后者在 `373fd3d` 上为 30/30 通过。只有 [现场验收记录](live-acceptance.md) 中逐层留证的用例才构成阶段 5 证据；自动化测试本身不构成阶段 5 或 6 现场验收。2026-07-28 的 CLI 正常完成验收早于最终输出功能，不能据此宣称微信已显示该新增输出段。

所有后续修改必须保留脏工作树、检查 `git status --short` 与相关 diff、只暂存本任务文件、运行 GitNexus `detect_changes`，本地提交且不 push。完整交接状态见 [Codex / Claude 交接](claude-handoff.md)。
