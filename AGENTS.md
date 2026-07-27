<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **codex-openclaw-notifier** (455 symbols, 885 relationships, 39 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

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
| Work in the Adapters area (13 symbols) | `.claude/skills/generated/adapters/SKILL.md` |
| Work in the Tests area (11 symbols) | `.claude/skills/generated/tests/SKILL.md` |
| Work in the Cluster_7 area (8 symbols) | `.claude/skills/generated/cluster-7/SKILL.md` |
| Work in the Cluster_9 area (7 symbols) | `.claude/skills/generated/cluster-9/SKILL.md` |
| Work in the Cluster_17 area (7 symbols) | `.claude/skills/generated/cluster-17/SKILL.md` |
| Work in the Cluster_18 area (7 symbols) | `.claude/skills/generated/cluster-18/SKILL.md` |
| Work in the Cluster_19 area (7 symbols) | `.claude/skills/generated/cluster-19/SKILL.md` |
| Work in the Cluster_12 area (6 symbols) | `.claude/skills/generated/cluster-12/SKILL.md` |
| Work in the Cluster_13 area (6 symbols) | `.claude/skills/generated/cluster-13/SKILL.md` |
| Work in the Cluster_11 area (5 symbols) | `.claude/skills/generated/cluster-11/SKILL.md` |
| Work in the Cluster_15 area (5 symbols) | `.claude/skills/generated/cluster-15/SKILL.md` |
| Work in the Cluster_10 area (4 symbols) | `.claude/skills/generated/cluster-10/SKILL.md` |
| Work in the Cluster_14 area (4 symbols) | `.claude/skills/generated/cluster-14/SKILL.md` |

<!-- gitnexus:end -->

## Notification Safety Gate

This repository has a real WeChat transport test but does **not** have production Codex end-to-end acceptance yet. Before changing notification behavior, read `docs/claude-handoff.md`, `docs/implementation-plan.md`, and `docs/verified-openclaw-contract.md`.

- Preserve the existing OpenClaw installation, Gateway schedule, and both configured WeChat channels. Do not delete, recreate, re-login, re-scan a QR code, or add a Gateway/service/schedule.
- Never read, print, log, commit, or ask chat users to paste account IDs, full targets, tokens, cookies, QR material, prompts, source text, or request/response bodies. The verified adapter reads only the secure environment variables named in `docs/verified-openclaw-contract.md`.
- Do not change `C:\Users\TheMapleBin\.codex\config.toml`, `base_url`, or enable the `15722` proxy. Do not enable the Stop hook, CLI wrapper, or API proxy as a production path.
- Do not claim a real WeChat delivery from `dry-run`, tests, configured/enabled status, port/listener checks, or a zero exit code alone. A real acceptance case needs: event captured, outbox persisted, send command succeeded, and user confirmation of receipt.
- Stage 5 must produce controlled Desktop and CLI failure evidence before Stage 6 can start the single `npm run watch` production candidate. Keep the worktree cleanly scoped: inspect status/diff, stage only task files, commit locally, and do not push.
