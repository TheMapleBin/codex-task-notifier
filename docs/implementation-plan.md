# Codex → OpenClaw 微信通知：实施计划

## 目标

为同一台 Windows 主机上的 Codex Desktop 与 Codex CLI 提供统一、可恢复的任务通知：

- 正常完成、用户中断和无法确认结果的任务状态；
- 本地模型网关/API 的 HTTP 4xx/5xx、连接失败与超时；
- 通知先进入本地持久队列，再由 OpenClaw 微信适配器投递；
- OpenClaw 或微信临时不可用时不阻塞 Codex，并在恢复后重试。

## 已确认事实

1. 当前全局 Codex 配置使用本地 CC Switch：`http://127.0.0.1:15721/v1`。
2. Hooks 已开启，但用户级配置目前只有 `SessionStart`，没有任务结束通知。
3. 当前运行时已观察到网关 `503`（所有供应商熔断）；会话记录中存在带错误对象的任务终态。因此 API 故障不能只依赖任务内 hook。
4. 当前机器尚未发现可调用的 OpenClaw 微信发送命令、Gateway 配置或目标会话标识。真实微信投递属于后续接入门槛。

## 架构决定

```text
Codex Desktop / CLI
 ├─ Stop hook ──────────────────────────────────┐
 ├─ CLI wrapper (`codex exec --json`) ───────────┼─> 本地通知服务
 ├─ 会话 JSONL 观察器（兼容性兜底） ─────────────┤      ├─ 去重与状态归并
 └─ 127.0.0.1:15722 API 代理 ─> CC Switch :15721 ┘      ├─ durable outbox
                                                            └─ OpenClaw adapter
```

核心规则：

- `Stop` 属于每轮任务范围，适合产生“任务停止/完成”信号；不把它当作 API 失败的唯一来源。
- API 代理位于 Codex 与 CC Switch 之间，独立于失败的 Codex 任务；它保留原响应，同时为 HTTP 错误与网络错误入队告警。
- 当前会话 JSONL 是已验证的实用补充，但不是稳定公开接口，因此只能用作归并/恢复兜底，不能作为唯一机制。
- hook 与 proxy 只提交最小元数据，绝不向队列或微信写入提示词、源码、Authorization、Cookie、请求体或模型 token。

## 实施阶段

| 阶段 | 工作 | 状态 |
| --- | --- | --- |
| 1 | 初始化 Node.js 项目、配置与文档 | 完成 |
| 2 | 定义事件契约、持久 outbox、去重和重试 | 完成 |
| 3 | 实现本地通知 HTTP 服务和 dry-run adapter | 完成 |
| 4 | 实现透明 API 代理、CLI JSONL 包装器、Stop hook 与会话观察器 | 完成 |
| 5 | 编写单元/集成测试，验证正常、503、超时、中断、离线重试 | 完成：16 项通过 |
| 6 | 取得 OpenClaw 入口后实现真实微信 adapter、写入用户级 Codex 配置并进行 Desktop/CLI 实测 | 阻塞：等待微信侧信息 |

## 文件与职责

- `src/config.mjs`：严格读取/校验环境变量与本地配置；默认 dry-run，不存储凭据。
- `src/event.mjs`：统一事件类型、严格字段白名单、状态归并与去重 key。
- `src/outbox.mjs`：原子落盘、指数退避、过期清理和恢复扫描。
- `src/notifier-service.mjs`：仅监听 `127.0.0.1` 的入队接口和后台投递循环。
- `src/api-proxy.mjs`：透明转发 Responses API；捕获错误但不记录敏感请求内容。
- `src/session-watcher.mjs`：增量读取 Codex rollout JSONL，并将可识别终态转换为事件。
- `src/cli-wrapper.mjs`：启动 `codex exec --json`，保留原始输出并提取 CLI 退出码/终态。
- `src/adapters/dry-run.mjs`：本地可验证 adapter。
- `src/adapters/openclaw.mjs`：等待提供 Gateway/CLI 协议与目标会话后实现。
- `scripts/codex-stop-hook.ps1`：由 Codex `Stop` hook 调用；只快速投递给本地服务，失败时 fail-open。
- `docs/codex-setup.md`：生产接入步骤、hook trust、代理切换、回滚和验证矩阵。

## 事件契约

所有来源统一为：

```json
{
  "id": "source:session-or-request:turn-or-timestamp",
  "source": "stop-hook | cli-wrapper | api-proxy | session-watcher",
  "surface": "desktop | cli | unknown",
  "kind": "turn_finished | turn_interrupted | api_error | task_error | delivery_error",
  "severity": "info | warning | error",
  "occurredAt": "ISO-8601 UTC",
  "workspace": "basename only",
  "turnId": "short opaque id",
  "httpStatus": 503,
  "errorKind": "http_status | connection_failed | timeout | unknown"
}
```

不允许扩展字段承载 prompt、文件内容、URL query、请求/响应 body 或认证信息。

## 验收标准

1. 服务在无 OpenClaw 配置时以 dry-run 正常启动，事件可持久保存并可重启恢复。
2. 同一 terminal event 多次到达只生成一条通知。
3. 代理在 503、上游连接拒绝和超时时将 `api_error` 入队，并保持对 Codex 的原始错误语义。
4. CLI wrapper 对 `turn.completed`、`turn.failed` 和非零退出码产生正确事件，且不污染用户的 stdout/stderr。
5. Stop hook 在通知服务不可用时 2 秒内 fail-open，不影响 Codex 的任务结果。
6. 会话观察器能忽略子代理默认噪声，并把根任务的成功、失败、中断归并为单条状态。
7. 接入真实 OpenClaw 后，Desktop 正常完成、CLI 正常完成、API 错误、用户中断、OpenClaw 离线恢复均有留档证据。

## 安全与运维边界

- 服务只绑定 `127.0.0.1`，代理上游固定为本地 CC Switch，避免成为开放代理。
- OpenClaw token 仅从 Windows Credential Manager、环境变量或用户指定的安全入口读取；不提交到 Git，也不写入 Codex 配置。
- 使用 `outbox/`、`state/`、日志文件的本地 `.gitignore`；日志只保留事件元数据。
- 真实接入前不修改 `C:\\Users\\TheMapleBin\\.codex\\config.toml`，不改变 Desktop/CLI 正在使用的网关。

## 本轮执行记录

- [x] 创建独立仓库。
- [x] 写入本计划文档。
- [x] 完成阶段 1–5 的无凭据实现与本地验证。
- [x] 建立 GitNexus 本地代码图谱，并在修改 CLI 包装器前完成影响分析（LOW：仅 1 个直接调用者）。
- [x] `npm run check` 与 `npm test` 通过；后者覆盖 16 项，包括 503、连接失败、超时、CLI 非零退出、可观察到的 `SIGINT`、会话中断、Stop hook 在线和离线落盘兜底。
- [x] 修复 Stop hook 离线落盘路径中 PowerShell `$Home` 自动变量冲突，改用 `$NotifierHome`。
- [ ] 获得 OpenClaw 微信入口后完成阶段 6。

## 验证边界

本轮已证明的是本机软件链路：事件被净化、入队、持久化、重试或写入 dry-run 交付记录；其中 Stop hook 的 HTTP 到 incoming-fallback 路径已由 PowerShell 子进程实测。

尚未宣称完成以下现场验收：未修改用户级 Codex 配置，因此没有实际 Desktop hook 触发证据；没有以真实 Codex 任务对当前版本做 CLI 端到端验收；未提供 OpenClaw 微信入口，因此没有真实消息送达证据。CLI wrapper 只能在其自身仍存活且观察到子进程关闭信号时将 `SIGINT` 归类为中断；强制杀死 wrapper/系统崩溃仍需依赖后续会话观察器恢复，不能保证即时通知。
