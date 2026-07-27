# Codex 受控接入说明

## 当前操作结论

现在不得启动生产 watcher，也不得修改 Codex Desktop 或 CLI 的全局配置。当前版本只允许本地代码检查与自动化测试：

```powershell
npm run check
npm test
```

这些命令验证软件行为，不会向微信发送消息。阶段门禁、真实发送证据和剩余验收项以 [实施计划](implementation-plan.md) 与 [Codex / Claude 交接](claude-handoff.md) 为准。

## 已冻结的运行环境

下列对象已经存在，必须原样保留：

- OpenClaw 安装和正在工作的 Gateway。
- Gateway 的既有计划任务。
- 两个既有微信 channel 配置。
- `C:\Users\TheMapleBin\.codex\config.toml` 与当前 Codex 网络路由。

不要删除、重新配置、重新登录、重新扫码或重复创建上述对象。不要查看、输出或提交其凭据、完整收件人地址、二维码材料、用户 prompt、用户消息、完整会话或原始请求/响应正文。

## 生产候选路径

阶段 5 通过且用户明确授权后，唯一的生产候选是：

```text
Codex rollout JSONL
  -> 单进程 npm run watch
  -> 持久 outbox
  -> OpenClaw CLI
  -> 已有 Gateway
  -> 微信
```

该 watcher 不会启动本地 HTTP listener。它使用已验证的 OpenClaw CLI 发送契约，account 和完整 target 只能由安全的进程环境注入，变量名为 `CODEX_NOTIFY_OPENCLAW_ACCOUNT` 与 `CODEX_NOTIFY_OPENCLAW_TARGET`。不要把值写进仓库、`config.toml`、脚本、命令历史或聊天内容。

watcher 会从当前根任务的 rollout 中提取最后一条 assistant `output_text`，CLI wrapper 则提取最后一个已完成的 `agent_message`。事件契约在持久化和发送前统一移除控制字符、遮盖明显凭据并截断到 1200 个字符；微信文本仅在结果非空时追加“输出”段。这个机制不提取、不持久化或投递用户消息，也不把原始 API 错误正文当作最终输出。新增输出字段已通过自动化测试，但尚未完成一次新的真实微信显示确认。

生产启动前的最小条件如下：

| 条件 | 必需证据 |
| --- | --- |
| 发送契约 | 发送命令成功且收件人已确认收到；见 [发送契约](verified-openclaw-contract.md) |
| Desktop 正常与 API 错误 | 每项均有事件捕获、outbox、发送成功、微信确认 |
| CLI 正常与非零/API 错误 | 每项均有事件捕获、outbox、发送成功、微信确认 |
| 用户中断和离线恢复 | 每项均有事件捕获、outbox、发送成功、微信确认 |
| 运行范围 | 只启动一个 `npm run watch`，不增加 Gateway、服务或计划任务 |

未满足任何一项时，停止在当前阶段并报告缺失证据，不要“先部署再补测”。

## 禁止启用的替代路径

以下组件保留在仓库中用于开发、回归或阶段 4 的受控验证，不得作为当前生产方案启用：

- `scripts/codex-stop-hook.ps1` 和任何 Codex Stop hook 配置。
- `npm run cli` 包装器。它只适用于 `codex exec` 自动化入口，并非交互式 CLI 的替换。
- `npm run proxy`、`CODEX_NOTIFY_PROXY_ENABLED`、端口 `15722` 和任何 `base_url` 改动。
- 额外的 `npm run service` 常驻实例。

只有存在一个已复现、watcher 与 wrapper 都漏报且透明代理可覆盖的 API 失败时，才可提出代理方案。此时必须先记录风险、回滚步骤和证据，并取得用户明确批准；批准前绝不改动 `base_url`。

## 验收记录格式

每次现场测试用不含敏感值的记录分成四列：事件已捕获、已入 outbox、发送命令成功、微信实际收到。没有最后一列的测试只能称为本机链路验证，不能称为微信通知验收。

有关当前阻塞、提交基线和接手步骤，阅读 [Codex / Claude 交接](claude-handoff.md)。已通过的 CLI 正常完成用例见 [现场验收记录](live-acceptance.md)；不得把该单项结果扩展为生产接入已完成。
