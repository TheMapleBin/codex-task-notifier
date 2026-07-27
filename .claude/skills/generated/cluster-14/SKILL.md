---
name: cluster-14
description: "Skill for the Cluster_14 area of codex-openclaw-notifier. 4 symbols across 1 files."
---

# Cluster_14

4 symbols | 1 files | Cohesion: 60%

## When to Use

- Working with code in `src/`
- Understanding how cleanText, workspaceBaseName, idPart work
- Modifying cluster_14-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/event.mjs` | cleanText, workspaceBaseName, idPart, safeErrorCode |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `cleanText` | Function | `src/event.mjs` | 30 |
| `workspaceBaseName` | Function | `src/event.mjs` | 52 |
| `idPart` | Function | `src/event.mjs` | 60 |
| `safeErrorCode` | Function | `src/event.mjs` | 89 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Handler → CleanText` | cross_community | 5 |
| `Start → CleanText` | cross_community | 5 |
| `Start → CleanText` | cross_community | 5 |
| `ImportIncoming → CleanText` | cross_community | 5 |
| `#processDue → CleanText` | cross_community | 4 |
| `SendEventToLocalService → CleanText` | cross_community | 4 |
| `OnEvent → CleanText` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "cleanText"})` — see callers and callees
2. `gitnexus_query({query: "cluster_14"})` — find related execution flows
3. Read key files listed above for implementation details
