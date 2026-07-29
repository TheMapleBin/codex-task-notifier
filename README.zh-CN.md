# Codex Task Notifier

Windows 专用的通知器，把 Codex Desktop/CLI 任务的终态推送到聊天客户端。

[English](README.md) | 简体中文

[![CI](https://github.com/TheMapleBin/codex-task-notifier/actions/workflows/ci.yml/badge.svg)](https://github.com/TheMapleBin/codex-task-notifier/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.5-brightgreen.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D4.svg)](#环境要求)

一个耗时很久的 Codex 任务跑完了，而你正在别的窗口、别的应用里，或者干脆离开了座位——十分钟后才发现它早就结束了。本工具直接监听 Codex 自己的 rollout 日志，在你发起的任务真正进入终态时推送一条短消息。

```text
Codex rollout JSONL -> Node watcher (in-process QQ Gateway) -> durable outbox -> QQ Bot HTTPS API
```

不需要额外的消息网关、HTTP 代理、Codex hook 或 CLI 注入，也不会改动你的 Codex 配置。

## 功能特性

- **只通知根任务。** 子代理、评审代理和嵌套代理的终态会被过滤，你实际发起的每个任务只收到一条消息。
- **持久 outbox。** 每个事件在投递前先落盘，按内容哈希去重，失败按指数退避重试，并固定到入队时的 transport。
- **最新状态优先。** 待发终态按 correlation key 合并覆盖，同一个任务不会用过期状态重复通知。
- **DPAPI 加密配置。** 凭据和运行时会话状态按当前 Windows 用户加密，绝不以明文存储，也绝不出现在命令行上。
- **跟随 Codex 的生命周期。** 一个计划任务在登录时启动轻量 lifecycle supervisor；watcher 只在 `codex.exe` 存活期间运行，最后一个 Codex 进程退出 30 秒后停止。任何时候只允许存在一个 watcher。
- **净化后的输出。** 内部 citation/rollout 元数据和末尾的 Codex UI 指令会被移除，明显的 token、Cookie、认证头、密码和 secret 会被遮盖，消息最长 2400 字符。
- **可插拔 transport。** 生产使用 QQ Bot；微信 iLink、微信公众号测试号和无网络的 dry-run adapter 作为备用保留。
- **零运行时依赖。** 只使用 Node 标准库——无需 `npm install`，也没有依赖需要审计。

## 环境要求

- Windows 10 或 Windows 11。
- Node.js >= 22.5（项目使用 `node:sqlite` 和内置测试运行器）。
- 一个已开启 C2C/群消息事件（`GROUP_AND_C2C_EVENT` intent）的 QQ Bot 应用，需要它的 AppID 和 AppSecret。
- 推荐 PowerShell 7（`pwsh.exe`）；`.cmd` 入口在缺失时回退到 Windows PowerShell。

## 快速开始

仓库根目录的五个 `.cmd` 文件是两行的快捷入口，只负责 `call` [`commands/`](commands/README.md) 中的真实脚本。它们能做的事都可以直接从 `commands/` 调用。

**1. 克隆并验证检出结果。**

```powershell
git clone https://github.com/TheMapleBin/codex-task-notifier
cd codex-task-notifier
npm run check
npm test
```

没有 `npm install` 这一步——项目零运行时依赖。`npm test` 会短暂 spawn 隔离的 watcher 进程作为被测对象，具体影响范围见[开发](#开发)。

**2. 完成一次性 QQ Bot 绑定。**

```powershell
.\bind-qqbot.cmd
```

按提示输入 AppID 和 AppSecret（切勿粘贴到命令行上）。脚本提示开始监听后，用要接收通知的 QQ 账号向机器人发送一条消息——发“绑定”即可。OpenID 会从这条消息中捕获、经 DPAPI 加密保存，脚本随即退出。

**3. 选择 QQ Bot transport。**

```powershell
.\commands\use-qqbot.cmd
.\commands\qqbot-status.cmd
```

这一步不能跳过。transport 选择器没有中性默认值：未固定时 `scripts/notifier-control.ps1` 里的 `Get-SelectedTransport` 会解析为 `weixin-ilink`，此时启动 watcher 要么以 `Notifier is not configured` 失败，要么——如果机器上还留着旧的 iLink 配置——真的通过微信 iLink 发送。`dry-run` 只是 `src/config.mjs` 在环境中没有指定 adapter、直接裸跑 `node src/index.mjs watch` 时的默认值，任何 `.cmd` 或 supervisor 路径都不会走到它。`qqbot-status.cmd` 只显示配置是否存在，不显示具体值。

**4. 启用跟随 Codex 的生命周期。**

```powershell
.\enable-auto-notifier.cmd
```

**5. 查看状态。**

```powershell
.\notifier-status.cmd
.\auto-notifier-status.cmd
```

`notifier-status.cmd` 显示 watcher 状态、`QQ Gateway: online` 和 outbox 计数——不含凭据，也不含消息正文。随后跑一个真实的 Codex 任务，确认通知确实到达 QQ 客户端。

卸载方式：`.\disable-auto-notifier.cmd` 会注销计划任务并停止 supervisor 与 watcher，但不会删除 DPAPI 绑定。

## 工作原理

1. 计划任务 `CodexWeChatNotifierLifecycle` 在登录时启动 `src/lifecycle-supervisor.mjs`。
2. supervisor 轮询 `codex.exe`，通过 `scripts/notifier-control.ps1` 启停唯一的 watcher，空闲宽限期为 30 秒。
3. `src/session-watcher.mjs` 跟踪 Codex sessions 目录下的 `rollout-*.jsonl`，只读取新追加的字节，并丢弃标记为子代理的会话。
4. 提取终态（`turn_finished`、`task_error`、`turn_interrupted`）；`src/thread-name.mjs` 从 Codex 状态数据库解析任务名称——优先显式 `threads.name`，否则使用 UI 的 `threads.title`。
5. `src/event.mjs` 归一化事件：剥离元数据、遮盖凭据、限制任务名称长度与 2400 字符输出上限，并生成确定性事件 ID。
6. `src/notifier-service.mjs` 覆盖同一 correlation key 下的待发记录，随后由 `src/outbox.mjs` 原子写入 `outbox\pending`。
7. 调度 tick 调用 `outbox.processDue()`；`src/adapters/qqbot.mjs` 等待进程内的 `src/qqbot-gateway.mjs` 客户端进入 `READY`，再通过 QQ Bot HTTPS API 投递。
8. 成功的记录移入 `outbox\delivered`；失败的记录保持 pending 并按指数退避重试，超过尝试上限后进入 `outbox\failed`。

## 项目结构

```text
commands/       Windows 双击入口、诊断和 transport 切换
docs/           架构、迁移、验收和交接文档（中文）
scripts/        PowerShell 配置、生命周期和 DPAPI 控制层，以及 Node 语法门禁
src/            watcher、outbox、事件净化和 transport 实现
src/adapters/   QQ Bot 生产 adapter 以及微信和 dry-run adapters
tests/          Node 行为测试（node --test）
```

## 配置

运行时状态位于 `%LOCALAPPDATA%\CodexWeChatNotifier`——包括配置、outbox 各目录、watcher PID 文件和脱敏后的状态文件。凭据和运行时会话状态使用 Windows DPAPI 按当前用户加密，绝不以明文写入，也绝不出现在命令行上。

transport 用一条命令切换，在 watcher 下次启动时生效：

| 命令 | transport |
| --- | --- |
| `commands/use-qqbot.cmd` | `qqbot` —— 生产 |
| `commands/use-ilink.cmd` | `weixin-ilink` —— 回滚 |
| `commands/use-wechat-test-account.cmd` | `wechat-test-account` —— 回滚 |
| *（未固定）* | 回退到 `weixin-ilink` —— **不是**空操作，见[快速开始](#快速开始)第 3 步 |
| *（仅手工）* `CODEX_NOTIFY_ADAPTER=dry-run` | `dry-run` —— 只格式化并丢弃 |

已有的微信 iLink 和测试号配置保留为回滚手段，不会删除，也不会自动重放。更细的行为（sessions 目录、轮询间隔、重试窗口、adapter 覆盖）由 `src/config.mjs` 读取的 `CODEX_NOTIFY_*` 环境变量控制。

## 隐私与安全

- 绝不记录、打印或提交：机器人 token 与 secret、context token、用户 ID、二维码素材、Codex prompt，以及请求/响应正文。
- 通知内容仅限来源、项目、任务名称、状态、耗时、短任务 ID、净化后的错误类别/HTTP 状态，以及最后一条 assistant 消息。
- 净化器会移除完整、残缺和 HTML 转义的内部 citation/rollout 元数据，并且只清理末尾独立行中的白名单 Codex UI 指令 `::git-commit`、`::created-thread` 和 `::code-comment`——正文中的普通 `::` 文本予以保留。明显的 token、Cookie、认证头、密码和 secret 会被遮盖。2400 字符上限最后应用。
- 只通知你自己创建的根任务；子代理和评审代理的终态一律丢弃。
- 任何时候只允许运行一个 watcher。不要启动第二个 watcher、Gateway 服务、代理或生命周期计划任务。

漏洞上报方式见 [SECURITY.md](SECURITY.md)。

## 当前状态

生产 transport 为 **QQ Bot**，在两次真实主动消息投递和一次端到端根任务通知之后，于 2026-07-29 通过用户验收。

以下仍未验证——不要视为已可用：

- [ ] Desktop/API 可控错误场景
- [ ] CLI 非零退出与 API 错误场景
- [ ] 用户中断场景
- [ ] QQ Gateway/API 离线后恢复场景
- [ ] 完整的 Windows 冷启动恢复

逐项验收证据、实时计数和历史运维记录见 [docs/live-acceptance.md](docs/live-acceptance.md)。文档导航见 [docs/README.md](docs/README.md)。

## 开发

```powershell
npm run check   # 对 src/ 和 tests/ 下每个 .mjs 执行 node --check
npm test        # node --test
```

测试使用 Node 内置测试运行器（`node:test`），不引入测试框架，也没有运行时依赖。CI 在 `windows-latest` + Node 22 上执行这两条命令。

需要知道测试套件实际做了什么：部分用例会调起 `scripts/` 下的 PowerShell 脚本并把它们作为被测对象，其中 `tests/notifier-control.test.mjs` 会调用 `notifier-control.ps1 -Action Start`，真的拉起一个隐藏的 `node src/index.mjs watch` 子进程。这些 watcher 是隔离的——临时 `CODEX_NOTIFY_CONTROL_HOME` 和临时 sessions 目录、DPAPI 保护的占位凭据、关闭 iLink 保活轮询——因此不会读取你真实的 Codex rollout，不会向任何地方投递消息，并在 `finally` 中被停止。由于它们使用自己的 control home，既不会观察也不会停止生产 watcher，所以在生命周期已启用的机器上跑测试是安全的。[隐私与安全](#隐私与安全)里「只允许一个 watcher」指的是生产 watcher。

## 参与贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md) 和[行为准则](CODE_OF_CONDUCT.md)。

如果你是 AI 编码代理，或者你正在指挥代理改动这个仓库，请先读 [AGENTS.md](AGENTS.md)。它是唯一权威规则文件，其中的「Notification Safety Gate」规定了那些不可破坏的约束：不得启动第二个 watcher、不得泄漏凭据、不得削弱输出净化层。

## 安全

请按 [SECURITY.md](SECURITY.md) 中的说明私下上报漏洞。切勿在 issue 中包含凭据、token 或消息内容。

## 更新日志

见 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

[MIT](LICENSE) © 2026 TheMapleBin
