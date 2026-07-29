# AGENTS.md

This file is the **single canonical source of agent instructions** for this repository.
Any AI coding agent working here must read it before touching files.

Tool-specific add-ons live in their own files and must not restate the rules below:

| File | Scope |
|------|-------|
| `AGENTS.md` (this file) | Canonical rules for every agent |
| `CLAUDE.md` | Claude Code only: GitNexus MCP tool names, resources, and skill files |

If a tool-specific file ever disagrees with this one, **this file wins**.

## Project in one paragraph

`codex-task-notifier` is a Windows-only notifier that reports terminal outcomes of
Codex Desktop/CLI tasks to a chat client. The pipeline is: Codex rollout JSONL ->
Node watcher (with an in-process native QQ Gateway) -> durable outbox -> QQ Bot
HTTPS API. There is no separate gateway service, no HTTP proxy, no Codex hook, and
no CLI injection. Requirements are Windows 10/11 and Node.js >= 22.5, with zero
runtime npm dependencies (stdlib only).

## Code intelligence

This project is indexed by GitNexus as **codex-task-notifier** (1208 symbols, 2205
relationships, 101 execution flows). Use the index instead of blind grepping when you
need callers, callees, or execution flows.

- Run impact analysis before editing any symbol, and report the blast radius (direct callers, affected processes, risk level) to the user.
- Warn the user if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- Check the affected scope (changed symbols and execution flows) before committing.
- Never rename symbols with find-and-replace — use the call-graph-aware rename.
- For security review, list taint findings (source -> sink flows) for the target symbol; this requires an index built with `analyze --pdg`.
- For regression review, compare the changed scope against a base ref (`base_ref: "main"`) rather than only the working tree.
- If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in a terminal first.

Claude Code users: the exact MCP tool names, MCP resources, and skill files are listed
in `CLAUDE.md`.

## Repository conventions

Contributor-facing rules — branching, commit style, verification steps, pull request
expectations — live in `CONTRIBUTING.md`. This file does not repeat them; read both.

- `README.md` is the English primary README. `README.zh-CN.md` is the Chinese translation. Keep the two in sync whenever you change either.
- Documentation under `docs/` is written in Chinese and indexed by `docs/README.md`. Do not translate the existing Chinese docs.
- Verify with `npm run check` (a `node --check` syntax gate over every `.mjs` in `src/` and `tests/`), then `npm test` (`node --test`). Note that the suite starts isolated watcher subprocesses; see the Development section of `README.md`.
- Keep the repo layout as-is: `commands/` (Windows double-click entry points and diagnostics), `docs/` (architecture, acceptance, handoff), `scripts/` (PowerShell config/lifecycle/DPAPI layer, plus the Node syntax gate `check-syntax.mjs`), `src/` (watcher, outbox, event sanitizing, transports), `src/adapters/` (transport adapters), `tests/` (Node behavior tests). The five two-line root `.cmd` shims stay by user decision.
- Markdown, `.mjs`, `.json`, and YAML files use LF line endings. `.gitattributes` declares `eol=crlf` for `.cmd` and `.ps1`, which materializes on checkout; copies in a working tree created before that rule may still be LF, and must not be hand-converted.
- Never add a runtime npm dependency.

## Notification Safety Gate

The current production path is one watcher with a built-in native QQ Gateway and the
QQ Bot HTTPS adapter; QQ Bot delivery was user-confirmed on 2026-07-29 after two real
active-message acceptances. The previous production path was one watcher with a
built-in Tencent WeChat iLink adapter; direct iLink delivery and final assistant output
were user-confirmed on 2026-07-28, and iLink is now retained only as rollback. Read
`docs/claude-handoff.md`, `docs/implementation-plan.md`, `docs/qqbot-native-gateway.md`,
and `docs/verified-ilink-contract.md` before changes.

Some bullets below are still phrased in iLink/WeChat terms because that is the transport
on which they were verified. They remain binding — they state invariants of the retained
rollback path, and the equivalent invariant holds for the QQ Bot path — but do not read
them as evidence that iLink is still production. It is not; QQ Bot is.

- Check `notifier-status.cmd` and `auto-notifier-status.cmd` before starting anything. Never run a second watcher, Gateway, service, proxy, or lifecycle schedule.
- The only approved schedule is `CodexWeChatNotifierLifecycle`, installed by `enable-auto-notifier.cmd`; it may manage only the existing watcher.
- Never read, print, log, commit, or request bot tokens, context tokens, user IDs, QR material, prompts, messages, source text, or request/response bodies.
- Task names use explicit `threads.name` first, then the Codex UI `threads.title`; always apply length limits and credential redaction.
- Never notify subagent completion; filter session metadata carrying parent thread, subagent thread source, agent path, or subagent source markers.
- Sanitize complete, orphaned, and HTML-escaped citation/rollout metadata before applying the final-output length limit. Also remove only allowlisted Codex UI directives (`::git-commit`, `::created-thread`, `::code-comment`) when they are standalone trailing lines; preserve ordinary `::` text in the body.
- The 2400-character output and metadata-tail sanitizer passed real WeChat display acceptance; do not reduce the limit or remove these filters without a new regression case.
- Keep the lightweight supervisor-driven lifecycle: start the watcher when any `codex.exe` is active and stop it 30 seconds after all Codex processes exit.
- Coalesce pending terminal outcomes by correlation key so only the newest state for one task consumes a refreshed iLink context.
- Preserve the DPAPI-encrypted iLink runtime session store. Stable UIN, cursor, user ID, and context must never be persisted as plaintext or passed on a command line.
- Process-level watcher restart recovery passed real WeChat acceptance; a full Windows cold boot remains unverified and must not be reported as complete.
- Do not change the watcher back to unconditional residency; the user explicitly chose Codex-following start/stop after encrypted session recovery passed.
- Do not change `%USERPROFILE%\.codex\config.toml`, `base_url`, or enable `15722`, Stop hook, production CLI wrapper, or API proxy.
- A real acceptance case still requires event capture, outbox persistence, successful send, and user confirmation. API error, interruption, and offline recovery cases remain incomplete.
- Keep changes scoped: inspect status/diff, stage only task files, commit locally, do not push, and refresh GitNexus after the commit.

### Not yet accepted

Never describe any of these as done, working, or verified:

- Desktop/API controllable-error case.
- CLI non-zero exit / API-error case.
- User-interruption case.
- QQ Gateway / QQ API offline-recovery case.
- Full Windows cold-boot recovery.
