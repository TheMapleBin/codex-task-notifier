# Contributing to codex-task-notifier

Thanks for your interest. This is a small, security-sensitive, Windows-only tool that
watches Codex task rollouts and pushes terminal outcomes to a chat client. Please read
this whole file before opening a pull request — several of the rules below are hard
constraints, not preferences.

## Prerequisites

- Windows 10 or Windows 11 (the watcher, the DPAPI layer, and the lifecycle scripts are Windows-only).
- Node.js >= 22.5 (enforced by the `engines` field in `package.json`).
- No `npm install` step. The project has **zero runtime dependencies** and no dev dependencies;
  everything runs on the Node standard library.

## Getting started

```powershell
git clone https://github.com/TheMapleBin/codex-task-notifier.git
cd codex-task-notifier
npm run check
npm test
```

`npm run check` runs `node --check` over every `.mjs` in `src/` and `tests/` (modules under
`scripts/` are not part of that gate).
`npm test` runs the `node --test` suite. Both must pass before you push.

## Project layout

See the layout section in [README.md](README.md) for the top-level map, and
[docs/README.md](docs/README.md) for the documentation index (architecture, acceptance
records, transport contracts, handoff constraints). Windows entry points are catalogued in
[commands/README.md](commands/README.md).

## Development workflow

1. Branch from `main`.
2. Keep commits small and scoped to one concern.
3. Use Conventional Commits. The existing history uses `feat:`, `fix:`, `docs:`, `test:`,
   and `chore:` — run `git log --oneline -15` and match the style you find there.
4. Update the relevant document under `docs/` in the same change when behavior, a contract,
   or an acceptance state changes.
5. Never claim an acceptance case is complete unless a real client receipt was confirmed;
   the outstanding cases are tracked in `docs/live-acceptance.md`.

## Testing

- Tests use the built-in `node:test` runner. There is no external test framework.
- Layout is one `tests/<area>.test.mjs` per module (for example `tests/outbox.test.mjs`,
  `tests/session-watcher.test.mjs`, `tests/qqbot-adapter.test.mjs`).
- Every behavior change needs a test. Bug fixes need a regression test that fails before the fix.
- Run a single file with `node --test tests/outbox.test.mjs`.
- Run everything with `npm test`.

## Style

- ESM only, `.mjs` extension, standard-library imports.
- Line endings are declared in `.gitattributes`, which applies on checkout: **LF** for `.mjs`,
  `.json`, `.md`, `.yml`/`.yaml`; **CRLF** for `.ps1` and `.cmd`. A working tree created before
  that rule was added can still hold LF copies of the PowerShell and batch files — that is
  expected, so do not hand-convert them or "normalize" line endings as part of a change.
- **No runtime dependencies may be added. Ever.** This is a hard rule, not a style choice:
  the tool runs continuously on a developer machine, handles chat-platform credentials and
  assistant output, and stores state encrypted with DPAPI. A zero-dependency tree means the
  supply-chain surface is exactly the Node runtime, and the whole program stays auditable by
  reading this repository. A pull request that adds a dependency will be rejected regardless
  of how useful the package is.

## Safety rules for contributors

These protect the person running the tool. Violating them is grounds for closing a PR outright.

- **Never commit secrets or user content.** No QQ Bot AppID/AppSecret/access token/OpenID,
  no WeChat or iLink token, context token, user ID, cookie, or QR material, no Codex prompts
  or assistant output, no rollout JSONL, no outbox records, and no `*.dpapi.json` files from
  `%LOCALAPPDATA%\CodexWeChatNotifier`. Do not paste them into issues, tests, fixtures, or logs.
- **Exactly one watcher may ever run.** Do not add a second watcher, a gateway service, a
  background service, an HTTP proxy, a Codex hook, a CLI injection wrapper, or another
  scheduled task. The only approved schedule is `CodexWeChatNotifierLifecycle`.
- **Do not weaken the output sanitizers.** The citation/rollout metadata stripping, the
  allowlisted trailing Codex UI directive removal (`::git-commit`, `::created-thread`,
  `::code-comment`), the credential masking, and the 2400-character output cap all passed real
  client acceptance. Do not lower the cap or relax a filter without a new regression test that
  demonstrates why the old behavior was wrong.
- **Do not notify subagents.** Only root tasks the user created are notified; the subagent
  and nested-agent filters must stay in place.
- Keep runtime state encrypted. Nothing sensitive may be written as plaintext or passed on a
  command line.

## Pull request checklist

- [ ] `npm run check` passes
- [ ] `npm test` passes
- [ ] Tests added or updated for the behavior change
- [ ] Docs updated (`README.md`, `README.zh-CN.md`, or the relevant file under `docs/`)
- [ ] No new runtime or dev dependencies
- [ ] No secrets, tokens, IDs, message bodies, or rollout content anywhere in the diff
- [ ] CI is green on `windows-latest`

## Reporting a security issue

Do **not** open a public issue. Follow [SECURITY.md](SECURITY.md) and use GitHub's private
vulnerability reporting at
<https://github.com/TheMapleBin/codex-task-notifier/security/advisories/new>. Send only
sanitized reproduction steps and error codes, and revoke any credential you believe was exposed.
