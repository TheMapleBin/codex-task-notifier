# Codex 接入与运行说明

本文件描述生产接入步骤。当前仓库不会自动修改用户的 Codex 配置、CC Switch 端口或 Windows 计划任务。

## 1. 启动本地服务（dry-run）

```powershell
$env:CODEX_NOTIFY_HOME = "$env:LOCALAPPDATA\CodexOpenClawNotifier"
npm run service
```

检查服务：

```powershell
Invoke-RestMethod http://127.0.0.1:17080/health
```

默认 adapter 是 `dry-run`；交付记录会写到：

```text
%LOCALAPPDATA%\CodexOpenClawNotifier\dry-run-deliveries.jsonl
```

## 2. 配置 Codex Stop hook

在用户级 `C:\Users\TheMapleBin\.codex\config.toml` 的现有 hooks 后追加以下内容。不要删除已有的 `SessionStart` hook。

```toml
[[hooks.Stop]]

[[hooks.Stop.hooks]]
type = "command"
command_windows = 'pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Shared\codex-openclaw-notifier\scripts\codex-stop-hook.ps1"'
timeout = 2
status_message = "Queueing local Codex notification"
```

Codex 会要求审核并信任新 hook。完成信任后，Desktop 和交互式 CLI 的每一轮任务结束会写入本地通知队列。

`Stop` 事件没有可靠的最终成功/失败语义，因此它会先产生“任务已停止，等待结果确认”。CLI wrapper 和可选会话观察器会补充更精确的终态；API 代理则独立报告网络/API 失败。

## 3. 启用 CLI 精确终态

对自动化任务使用 wrapper：

```powershell
npm run cli -- "只读分析当前仓库"
```

它等价于 `codex exec --json ...`，但会保留原始 stdout/stderr、读取 `turn.completed` / `turn.failed` / `error`，并将非零退出码写入本地队列。wrapper 启动的 Codex 会抑制 Stop hook，避免重复通知。

若子进程以非零状态退出，即使此前 JSONL 中出现了 `turn.completed`，wrapper 仍以 `task_error` 和 `EXIT_n` 为准；若 wrapper 仍存活并观察到子进程 `SIGINT`，会写入 `turn_interrupted` 并返回常用退出码 `130`。强制杀死 wrapper 或系统崩溃无法由进程内代码保证即时入队，需由可选会话观察器在记录落盘后尽力恢复。

## 4. 启用 API 错误兜底

先以 dry-run 验证服务与代理：

```powershell
$env:CODEX_NOTIFY_PROXY_ENABLED = 'true'
npm run service
```

确认 `http://127.0.0.1:15722` 正在监听后，才把用户级 Codex 配置的 custom provider `base_url` 从：

```toml
base_url = "http://127.0.0.1:15721/v1"
```

改为：

```toml
base_url = "http://127.0.0.1:15722/v1"
```

代理只监听 loopback，并固定转发到 `127.0.0.1:15721`。它不记录 Authorization、Cookie、prompt、源码、请求体或响应体；仅在 HTTP 4xx/5xx、连接失败、超时时入队一个最小错误事件。

回滚：停止本地服务，再把 `base_url` 恢复为 `http://127.0.0.1:15721/v1`。

## 5. 可选：会话 JSONL 观察器

这是兼容性兜底，不是稳定公开接口。验证本机 Codex 版本后才开启：

```powershell
$env:CODEX_NOTIFY_WATCHER_ENABLED = 'true'
npm run service
```

观察器默认忽略可识别的子代理记录，并会用 `task_complete.error` / `turn_aborted` 补充 Desktop 任务的具体失败或中断状态。它可以在对应终态到达时抑制尚未投递的通用 Stop 事件。

## 6. 等待 OpenClaw 微信接入信息

请提供下列任一种已验证接口，不要在聊天中发送 token：

1. OpenClaw Gateway 的本地/远程地址、认证方式、发送消息方法和目标会话标识；或
2. 一个能够安全调用的本机 OpenClaw CLI 命令格式及目标会话标识；或
3. 现有 OpenClaw 部署目录和它的官方发送消息文档。

收到后会实现 `src/adapters/openclaw.mjs`，将 token 放在 Windows Credential Manager 或由服务启动环境注入，不写入 Git、Codex `config.toml` 或通知正文。

## 验证矩阵

| 用例 | 预期 |
| --- | --- |
| dry-run 单条事件 | pending 变为 delivered，生成 dry-run JSONL |
| CLI 正常完成 | 一条 `turn_finished`，CLI stdout/stderr 不变 |
| CLI 非零退出 | 一条 `task_error`，含 `EXIT_n`，无敏感正文 |
| 上游返回 503 | Codex 仍看到原始 503，队列收到 `api_error` / `HTTP_503` |
| 上游连接失败或超时 | Codex 看到 502/504，队列收到相应错误类型 |
| Desktop 正常结束 | Stop hook 产生通用结束事件；启用观察器后以精确终态替换待投递事件 |
| OpenClaw 离线 | 事件保留在 pending，服务恢复后重试 |

当前仓库已通过本地自动化测试覆盖该矩阵中的 503、连接失败、超时、CLI 非零退出、可观察到的中断、会话中断，以及 Stop hook 在服务不可用时的 incoming-fallback。它们是软件验证，不等同于已修改全局 Codex 配置、已运行真实 Desktop/CLI 任务或已收到微信消息的现场验收。
