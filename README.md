# Codex Task Notifier

A Windows-only notifier that reports the terminal outcome of your Codex Desktop/CLI tasks to a chat client.

English | [简体中文](README.zh-CN.md)

[![CI](https://github.com/TheMapleBin/codex-task-notifier/actions/workflows/ci.yml/badge.svg)](https://github.com/TheMapleBin/codex-task-notifier/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.5-brightgreen.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D4.svg)](#requirements)

A long Codex task finishes while you are in another window, another app, or away from the desk — and you find out ten minutes later. This tool watches Codex's own rollout log, and pushes one short message when a task you started actually reaches a terminal state.

```text
Codex rollout JSONL -> Node watcher (in-process QQ Gateway) -> durable outbox -> QQ Bot HTTPS API
```

No extra message gateway, no HTTP proxy, no Codex hook, no CLI injection, and no change to your Codex configuration.

## Features

- **Root tasks only.** Subagent, review, and nested-agent outcomes are filtered out, so you get one message per task you actually started.
- **Durable outbox.** Every event is written to disk before delivery, deduplicated by content hash, retried with exponential backoff, and pinned to the transport it was queued under.
- **Newest state wins.** Pending terminal outcomes are superseded by correlation key, so a task never notifies twice with stale status.
- **DPAPI-encrypted configuration.** Credentials and runtime session state are encrypted per Windows user, never stored as plaintext and never passed on a command line.
- **Codex-following lifecycle.** One scheduled task starts a lightweight supervisor at logon; the watcher runs only while `codex.exe` is alive and stops 30 seconds after the last one exits. Exactly one watcher is ever allowed.
- **Sanitized output.** Internal citation/rollout metadata and trailing Codex UI directives are stripped, obvious tokens, cookies, auth headers, passwords and secrets are masked, and the message is capped at 2400 characters.
- **Pluggable transports.** QQ Bot in production; WeChat iLink, a WeChat official-account test account, and a no-network dry-run adapter are kept as alternatives.
- **Zero runtime dependencies.** Node standard library only — nothing to `npm install`, nothing to audit.

## Requirements

- Windows 10 or Windows 11.
- Node.js >= 22.5 (the project uses `node:sqlite` and the built-in test runner).
- A QQ Bot application with C2C/group message events enabled (the `GROUP_AND_C2C_EVENT` intent). You need its AppID and AppSecret.
- PowerShell 7 (`pwsh.exe`) is preferred; the `.cmd` entry points fall back to Windows PowerShell.

## Quick start

The five `.cmd` files in the repository root are two-line convenience shims that `call` the real scripts in [`commands/`](commands/README.md). Anything they do is also reachable directly from `commands/`.

**1. Clone and verify the checkout.**

```powershell
git clone https://github.com/TheMapleBin/codex-task-notifier
cd codex-task-notifier
npm run check
npm test
```

There is no `npm install` step — the project has zero runtime dependencies. `npm test` briefly spawns isolated watcher processes as test subjects; see [Development](#development) for what that does and does not touch.

**2. Bind the QQ Bot once.**

```powershell
.\bind-qqbot.cmd
```

Enter the AppID and AppSecret at the prompt (never paste them onto a command line). When the script reports it is listening, send the bot a single message — `绑定` works — from the QQ account that should receive notifications. The OpenID is captured from that message, DPAPI-encrypted, and the script exits.

**3. Select the QQ Bot transport.**

```powershell
.\commands\use-qqbot.cmd
.\commands\qqbot-status.cmd
```

Do not skip this. The transport selector has no neutral default: with nothing pinned, `Get-SelectedTransport` in `scripts/notifier-control.ps1` resolves to `weixin-ilink`, so starting the watcher either fails with `Notifier is not configured` or — if an older iLink configuration is still present — really delivers over WeChat iLink. `dry-run` is only the default in `src/config.mjs` for a bare `node src/index.mjs watch` with no adapter in the environment; no `.cmd` or supervisor path reaches it. `qqbot-status.cmd` reports presence of configuration, never values.

**4. Enable the Codex-following lifecycle.**

```powershell
.\enable-auto-notifier.cmd
```

**5. Check state.**

```powershell
.\notifier-status.cmd
.\auto-notifier-status.cmd
```

`notifier-status.cmd` shows the watcher, `QQ Gateway: online`, and outbox counts — no credentials, no message bodies. Then run one real Codex task and confirm the notification arrives in your QQ client.

To remove it: `.\disable-auto-notifier.cmd` unregisters the scheduled task and stops the supervisor and watcher. It does not delete the DPAPI binding.

## How it works

1. The scheduled task `CodexWeChatNotifierLifecycle` starts `src/lifecycle-supervisor.mjs` at logon.
2. The supervisor polls for `codex.exe` and starts/stops the single watcher through `scripts/notifier-control.ps1`, using a 30-second idle grace period.
3. `src/session-watcher.mjs` tails `rollout-*.jsonl` under the Codex sessions directory, reading only appended bytes, and drops any session marked as a subagent.
4. Terminal outcomes (`turn_finished`, `task_error`, `turn_interrupted`) are extracted; `src/thread-name.mjs` resolves the task name from the Codex state database — explicit `threads.name` first, else the UI `threads.title`.
5. `src/event.mjs` normalizes the event: metadata stripping, credential redaction, task-name and 2400-character output caps, and a deterministic event id.
6. `src/notifier-service.mjs` supersedes any pending record for the same correlation key, then `src/outbox.mjs` writes the record atomically to `outbox\pending`.
7. A dispatch tick calls `outbox.processDue()`; `src/adapters/qqbot.mjs` waits for the in-process `src/qqbot-gateway.mjs` client to reach `READY`, then delivers over the QQ Bot HTTPS API.
8. Success moves the record to `outbox\delivered`; failures stay pending with exponential backoff and land in `outbox\failed` after the attempt limit.

## Repository layout

```text
commands/       Windows double-click entry points, diagnostics, transport switching
docs/           Architecture, migration, acceptance and handoff docs (Chinese)
scripts/        PowerShell configuration, lifecycle and DPAPI control layer, plus the Node syntax gate
src/            Watcher, outbox, event sanitizing, transports
src/adapters/   QQ Bot production adapter plus WeChat and dry-run adapters
tests/          Node behavior tests (node --test)
```

## Configuration

Runtime state lives in `%LOCALAPPDATA%\CodexWeChatNotifier` — configuration, the outbox directories, the watcher PID file, and redacted status files. Credentials and runtime session state are encrypted with Windows DPAPI, scoped to the current user; they are never written as plaintext and never appear on a command line.

Transport is switched with a single command and takes effect the next time the watcher starts:

| Command | Transport |
| --- | --- |
| `commands/use-qqbot.cmd` | `qqbot` — production |
| `commands/use-ilink.cmd` | `weixin-ilink` — rollback |
| `commands/use-wechat-test-account.cmd` | `wechat-test-account` — rollback |
| *(none pinned)* | falls back to `weixin-ilink` — **not** a no-op; see [Quick start](#quick-start) step 3 |
| *(manual only)* `CODEX_NOTIFY_ADAPTER=dry-run` | `dry-run` — formats and discards |

Existing WeChat iLink and test-account configurations are kept for rollback. They are never deleted and never replayed automatically. Advanced behaviour (sessions directory, poll interval, retry window, adapter override) is driven by `CODEX_NOTIFY_*` environment variables read in `src/config.mjs`.

## Privacy and safety

- Never logged, printed, or committed: bot tokens and secrets, context tokens, user IDs, QR material, Codex prompts, and request/response bodies.
- Notification content is limited to source, project, task name, status, duration, short task id, a sanitized error class/HTTP status, and the last assistant message.
- The sanitizers remove complete, orphaned, and HTML-escaped internal citation/rollout metadata, and strip only the allowlisted trailing standalone Codex UI directives `::git-commit`, `::created-thread`, and `::code-comment` — ordinary `::` text in the body is preserved. Obvious tokens, cookies, auth headers, passwords, and secrets are masked. The 2400-character cap is applied last.
- Only root tasks you created are notified; subagent and review-agent outcomes are dropped.
- Exactly one watcher may run. Do not start a second watcher, gateway service, proxy, or lifecycle schedule.

See [SECURITY.md](SECURITY.md) for reporting a vulnerability.

## Status

Production transport is **QQ Bot**, user-accepted on 2026-07-29 after two real active-message deliveries and one end-to-end root-task notification.

Still unverified — do not treat these as working:

- [ ] Desktop/API controllable-error case
- [ ] CLI non-zero exit and API-error case
- [ ] User-interruption case
- [ ] QQ Gateway/API offline-then-recovery case
- [ ] Full Windows cold-boot recovery

Detailed per-case evidence, live counts, and historical operational notes live in [docs/live-acceptance.md](docs/live-acceptance.md). The documentation index is [docs/README.md](docs/README.md).

## Development

```powershell
npm run check   # node --check over every .mjs in src/ and tests/
npm test        # node --test
```

Tests use the Node built-in test runner (`node:test`) with no test framework and no runtime dependencies. CI runs both commands on `windows-latest` with Node 22.

Note what the suite actually does: several cases shell out to the PowerShell scripts in `scripts/` and exercise them as subjects, and `tests/notifier-control.test.mjs` calls `notifier-control.ps1 -Action Start`, which launches a real hidden `node src/index.mjs watch` child process. Those watchers are isolated — a temporary `CODEX_NOTIFY_CONTROL_HOME` and sessions directory, DPAPI-protected placeholder credentials, iLink keepalive polling disabled — so they never read your real Codex rollouts, never deliver a message anywhere, and are stopped in a `finally` block. Because they use their own control home, they neither observe nor stop the production watcher, so the suite is safe to run while the lifecycle is enabled. The "exactly one watcher" rule in [Privacy and safety](#privacy-and-safety) is about the production watcher.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

If you are an AI coding agent — or you are directing one at this repository — read [AGENTS.md](AGENTS.md) first. It is the canonical rule file and holds the Notification Safety Gate: the invariants that keep this tool from starting a second watcher, leaking credentials, or weakening the output sanitizers.

## Security

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Never include credentials, tokens, or message contents in an issue.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE) © 2026 TheMapleBin
