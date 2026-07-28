<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **codex-openclaw-notifier** (269 symbols, 664 relationships, 22 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/codex-openclaw-notifier/context` | Codebase overview, check index freshness |
| `gitnexus://repo/codex-openclaw-notifier/clusters` | All functional areas |
| `gitnexus://repo/codex-openclaw-notifier/processes` | All execution flows |
| `gitnexus://repo/codex-openclaw-notifier/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

## Notification Safety Gate

The current production path is one watcher with a built-in Tencent WeChat iLink adapter. Direct iLink delivery and final assistant output were user-confirmed on 2026-07-28. Read `docs/claude-handoff.md`, `docs/implementation-plan.md`, and `docs/verified-ilink-contract.md` before changes.

- Check `notifier-status.cmd` before starting anything. Never run a second watcher, Gateway, service, proxy, or schedule.
- Never read, print, log, commit, or request bot tokens, context tokens, user IDs, QR material, prompts, messages, source text, or request/response bodies.
- Task names use explicit `threads.name` first, then the Codex UI `threads.title`; always apply length limits and credential redaction.
- Do not change `C:\Users\TheMapleBin\.codex\config.toml`, `base_url`, or enable `15722`, Stop hook, production CLI wrapper, or API proxy.
- A real acceptance case still requires event capture, outbox persistence, successful send, and user confirmation. API error, interruption, and offline recovery cases remain incomplete.
- Keep changes scoped: inspect status/diff, stage only task files, commit locally, do not push, and refresh GitNexus after the commit.
