# CLAUDE.md

**The canonical agent rules for this repository live in [AGENTS.md](AGENTS.md). Read it first.**

`AGENTS.md` holds the project overview, the repository conventions, and the
safety-critical **Notification Safety Gate**. Those rules are deliberately *not*
duplicated here so the two files cannot drift apart. If this file and `AGENTS.md`
ever disagree, `AGENTS.md` wins.

This file only adds the Claude-Code-specific GitNexus MCP workflow.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **codex-task-notifier** (1259 symbols, 2281 relationships, 106 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
| `gitnexus://repo/codex-task-notifier/context` | Codebase overview, check index freshness |
| `gitnexus://repo/codex-task-notifier/clusters` | All functional areas |
| `gitnexus://repo/codex-task-notifier/processes` | All execution flows |
| `gitnexus://repo/codex-task-notifier/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| Work in the Tests area (57 symbols) | `.claude/skills/generated/tests/SKILL.md` |
| Work in the Adapters area (54 symbols) | `.claude/skills/generated/adapters/SKILL.md` |
| Work in the Cluster_53 area (13 symbols) | `.claude/skills/generated/cluster-53/SKILL.md` |
| Work in the Cluster_37 area (11 symbols) | `.claude/skills/generated/cluster-37/SKILL.md` |
| Work in the Cluster_36 area (10 symbols) | `.claude/skills/generated/cluster-36/SKILL.md` |
| Work in the Cluster_66 area (10 symbols) | `.claude/skills/generated/cluster-66/SKILL.md` |
| Work in the Cluster_51 area (9 symbols) | `.claude/skills/generated/cluster-51/SKILL.md` |
| Work in the Cluster_54 area (9 symbols) | `.claude/skills/generated/cluster-54/SKILL.md` |
| Work in the Cluster_59 area (9 symbols) | `.claude/skills/generated/cluster-59/SKILL.md` |
| Work in the Cluster_55 area (7 symbols) | `.claude/skills/generated/cluster-55/SKILL.md` |
| Work in the Cluster_67 area (7 symbols) | `.claude/skills/generated/cluster-67/SKILL.md` |
| Work in the Cluster_68 area (7 symbols) | `.claude/skills/generated/cluster-68/SKILL.md` |
| Work in the Cluster_39 area (6 symbols) | `.claude/skills/generated/cluster-39/SKILL.md` |
| Work in the Cluster_56 area (5 symbols) | `.claude/skills/generated/cluster-56/SKILL.md` |
| Work in the Cluster_65 area (5 symbols) | `.claude/skills/generated/cluster-65/SKILL.md` |
| Work in the Cluster_63 area (4 symbols) | `.claude/skills/generated/cluster-63/SKILL.md` |
| Work in the Cluster_64 area (4 symbols) | `.claude/skills/generated/cluster-64/SKILL.md` |

<!-- gitnexus:end -->

## Reminder

Running `gitnexus_detect_changes()` is not a substitute for the Notification Safety
Gate in [AGENTS.md](AGENTS.md). Re-read that section before any change to the watcher,
the outbox, the sanitizers, the lifecycle, or a transport adapter.
