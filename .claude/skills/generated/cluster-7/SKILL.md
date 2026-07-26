---
name: cluster-7
description: "Skill for the Cluster_7 area of codex-openclaw-notifier. 7 symbols across 1 files."
---

# Cluster_7

7 symbols | 1 files | Cohesion: 70%

## When to Use

- Working with code in `src/`
- Understanding how createEvent work
- Modifying cluster_7-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/event.mjs` | cleanText, asIsoTimestamp, workspaceBaseName, idPart, computeId (+2) |

## Entry Points

Start here when exploring this area:

- **`createEvent`** (Function) — `src/event.mjs:80`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createEvent` | Function | `src/event.mjs` | 80 |
| `cleanText` | Function | `src/event.mjs` | 30 |
| `asIsoTimestamp` | Function | `src/event.mjs` | 41 |
| `workspaceBaseName` | Function | `src/event.mjs` | 52 |
| `idPart` | Function | `src/event.mjs` | 60 |
| `computeId` | Function | `src/event.mjs` | 64 |
| `severityFor` | Function | `src/event.mjs` | 70 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → CleanText` | cross_community | 5 |
| `Handler → CleanText` | cross_community | 5 |
| `ImportIncoming → CleanText` | cross_community | 5 |
| `Start → AsIsoTimestamp` | cross_community | 4 |
| `Start → ComputeId` | cross_community | 4 |
| `Handler → AsIsoTimestamp` | cross_community | 4 |
| `Handler → ComputeId` | cross_community | 4 |
| `SendEventToLocalService → CleanText` | cross_community | 4 |
| `ImportIncoming → AsIsoTimestamp` | cross_community | 4 |
| `ImportIncoming → ComputeId` | cross_community | 4 |

## How to Explore

1. `context({name: "createEvent"})` — see callers and callees
2. `query({search_query: "cluster_7"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
