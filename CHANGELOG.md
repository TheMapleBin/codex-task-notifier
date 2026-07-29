# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **No release has been tagged yet.** `package.json` declares version `0.1.0`, but there is no
> git tag and no published package. Until the first tag exists, every entry below is unreleased
> and the authoritative history is the commit log on `main`. Entries here are reconstructed from
> real commits and from the acceptance records under `docs/`.

## [Unreleased]

Nothing has been tagged, so this section is the whole history of the project. The notifier was
built 2026-07-27 through 2026-07-29; the most recent work is open-sourcing and repository hygiene,
which did not change the notification pipeline. Production transport is QQ Bot, confirmed by real
client receipts; WeChat iLink, the WeChat official-account test account, and a dry-run adapter are
kept for rollback.

### Added

- Core pipeline: config loading, durable outbox with retry and terminal states, event
  normalization, and a session watcher that reads Codex rollout JSONL to detect terminal task
  outcomes. Zero runtime dependencies, `node:test` suite from the first commit.
- Notification payload with source, project, task name, status, duration, short task id, and
  sanitized error class or HTTP status.
- Sanitized final assistant message in the notification.
- Task name resolution that prefers the explicit `threads.name` from the Codex database and falls
  back to the Codex UI `threads.title`, then applies length limits.
- WeChat iLink direct transport with a verified interface contract (`docs/verified-ilink-contract.md`)
  and a lightweight session keepalive.
- DPAPI-encrypted iLink runtime session store (stable UIN, update cursor, latest context) so the
  watcher can restart without rebinding.
- WeChat official-account test-account transport as a trial and then rollback path, with its own
  verified contract document.
- Direct QQ Bot transport: one-time binding tool, configuration and control scripts, adapter, and
  a smoke tool.
- Native in-process QQ Bot Gateway presence (`docs/qqbot-native-gateway.md`) so the single watcher
  can hold the WebSocket session required for active messages.
- Lightweight one-click Windows control commands for start, stop, status, and transport selection.
- Lifecycle supervisor plus the single `CodexWeChatNotifierLifecycle` scheduled task installed at
  logon.
- Acceptance and handoff documentation: `docs/live-acceptance.md`, `docs/implementation-plan.md`,
  `docs/claude-handoff.md`, `docs/codex-setup.md`, `docs/qqbot-migration-plan.md`.
- GitHub Actions CI (`.github/workflows/ci.yml`) running `npm run check` then `npm test` on
  `windows-latest` with Node 22, on pushes to `main` and on pull requests.
- `SECURITY.md` with private vulnerability reporting rules and an explicit list of material that
  must never be attached to a report.
- `.gitattributes` pinning LF for `.mjs`/`.json`/`.md`/`.yml` and CRLF for `.ps1`/`.cmd`.
- `commands/` directory collecting the Windows double-click entry points and diagnostic scripts,
  with `commands/README.md`; five two-line root `.cmd` shims kept for the everyday commands.
- `docs/README.md` documentation index.
- MIT `LICENSE` (copyright 2026 TheMapleBin).
- English `README.md` as the primary document plus `README.zh-CN.md` translation.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), issue and pull request
  templates, and a Dependabot configuration.

### Changed

- Production transport moved from the initial OpenClaw-based bridge to WeChat iLink, then to the
  WeChat official-account test account, then back to iLink after template cards truncated long
  fields, and finally to QQ Bot on 2026-07-29. OpenClaw was never production-enabled.
- Lifecycle changed from an always-resident watcher to a supervisor that starts the watcher when
  any `codex.exe` is running and stops it 30 seconds after all Codex processes exit.
- Outbox entries are pinned to the transport that enqueued them, so switching transports cannot
  replay historical pending notifications through the new channel.
- Pending terminal outcomes are coalesced by correlation key, so only the newest state for one
  task consumes a refreshed session context.
- Notification output limit raised to 2400 characters after real client display checks.

### Fixed

- Watch mode exited immediately because its interval timer was unreferenced.
- `.cmd` wrappers could not be spawned directly on Windows; shim execution made safe.
- Subagent, review, and nested-agent terminal outcomes are filtered out; only root tasks the user
  created are notified.
- Notification tail sanitizing for complete, orphaned, and HTML-escaped citation and rollout
  metadata, applied before the length cap.
- Trailing standalone Codex UI directives (`::git-commit`, `::created-thread`, `::code-comment`)
  are removed from the end of the output while ordinary `::` text in the body is preserved.
- Pending notifications whose session context had expired are woken immediately instead of waiting
  for the next retry window.
- UTF-8 is preserved end to end for QQ Bot notifications and for the PowerShell process streams.
- A QQ Bot send is only treated as delivered when the API returns a message receipt.
- Lifecycle and test-account tooling prefer PowerShell 7, with a compatibility path for the
  older PowerShell ACL API.
- WeChat notification connection kept resident during a session instead of reconnecting per send.
- Adapter HTTPS requests no longer have their timeouts cancelled prematurely, so a stalled QQ Bot
  or WeChat test-account request fails fast instead of hanging the send.

### Security

- Runtime configuration and session state are encrypted with DPAPI per Windows user under
  `%LOCALAPPDATA%\CodexWeChatNotifier`; secrets are never written as plaintext and never passed on
  a command line.
- Tokens, cookies, authorization headers, passwords, and secrets are masked in task names, error
  details, and notification output.
- Exactly one watcher is permitted; no second gateway, service, HTTP proxy, Codex hook, or extra
  scheduled task is installed.

### Known issues

- `npm test` is intermittently red. `tests/service.test.mjs` — "notification worker keeps only
  the latest pending terminal event for one task" — failed once in three consecutive full runs
  (`delivered.length` was 2, expected 1). The same file passes 5/5 when run in isolation with
  `node --test tests/service.test.mjs`.

  This is a race in the test harness, not a defect in the coalescing logic. `tests/helpers.mjs`
  sets `pollIntervalMs: 10`, and `start({ listen: false })` deliberately keeps the dispatch timer
  ref'd. When all test files run concurrently, the event loop can stall for more than 10 ms
  between the two `submit()` calls, so a background `tick()` dispatches the first terminal event
  before the second one is enqueued; `supersedePending` then finds nothing pending to supersede.

  The narrow window is real but not test-only: coalescing supersedes *pending* outbox records,
  and a terminal outcome that has already been dispatched cannot be recalled. In production the
  poll interval defaults to 500 ms (`src/config.mjs`), so two terminal events for the same
  correlation key would have to arrive within one poll window to produce a duplicate
  notification. No duplicate has been observed in the acceptance runs recorded in
  `docs/live-acceptance.md`. Not yet fixed, because a fix touches `tests/` and the coalescing
  invariant is covered by the Notification Safety Gate in `AGENTS.md`.

### Not accepted

The following cases are explicitly **not** verified and must not be reported as working: Desktop
or API controllable-error notification, CLI non-zero exit or API-error notification, user
interruption, QQ Gateway/API offline-then-recovery delivery, and a full Windows cold-boot
recovery. See `docs/live-acceptance.md`.

[Unreleased]: https://github.com/TheMapleBin/codex-task-notifier/commits/main
