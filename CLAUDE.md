<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **codex-openclaw-notifier** (250 symbols, 618 relationships, 20 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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

This repository has a real WeChat transport test but does **not** have production Codex end-to-end acceptance yet. Before changing notification behavior, read `docs/claude-handoff.md`, `docs/implementation-plan.md`, and `docs/verified-openclaw-contract.md`.

- Preserve the existing OpenClaw installation, Gateway schedule, and both configured WeChat channels. Do not delete, recreate, re-login, re-scan a QR code, or add a Gateway/service/schedule.
- Never read, print, log, commit, or ask chat users to paste account IDs, full targets, tokens, cookies, QR material, prompts, source text, or request/response bodies. The verified adapter reads only the secure environment variables named in `docs/verified-openclaw-contract.md`.
- Do not change `C:\Users\TheMapleBin\.codex\config.toml`, `base_url`, or enable the `15722` proxy. Do not enable the Stop hook, CLI wrapper, or API proxy as a production path.
- Do not claim a real WeChat delivery from `dry-run`, tests, configured/enabled status, port/listener checks, or a zero exit code alone. A real acceptance case needs: event captured, outbox persisted, send command succeeded, and user confirmation of receipt.
- Stage 5 must produce controlled Desktop and CLI failure evidence before Stage 6 can start the single `npm run watch` production candidate. Keep the worktree cleanly scoped: inspect status/diff, stage only task files, commit locally, and do not push.
