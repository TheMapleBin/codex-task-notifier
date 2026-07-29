---
name: cluster-37
description: "Skill for the Cluster_37 area of codex-task-notifier. 11 symbols across 1 files."
---

# Cluster_37

11 symbols | 1 files | Cohesion: 93%

## When to Use

- Working with code in `src/`
- Understanding how updateContext, initialState, primeExisting work
- Modifying cluster_37-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/session-watcher.mjs` | findRolloutFiles, parseHttpStatus, errorKind, assistantOutput, isSubagentSession (+6) |

## Entry Points

Start here when exploring this area:

- **`updateContext`** (Function) — `src/session-watcher.mjs:100`
- **`initialState`** (Function) — `src/session-watcher.mjs:122`
- **`primeExisting`** (Function) — `src/session-watcher.mjs:136`
- **`scanOnce`** (Function) — `src/session-watcher.mjs:154`
- **`start`** (Function) — `src/session-watcher.mjs:212`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `updateContext` | Function | `src/session-watcher.mjs` | 100 |
| `initialState` | Function | `src/session-watcher.mjs` | 122 |
| `primeExisting` | Function | `src/session-watcher.mjs` | 136 |
| `scanOnce` | Function | `src/session-watcher.mjs` | 154 |
| `start` | Function | `src/session-watcher.mjs` | 212 |
| `findRolloutFiles` | Function | `src/session-watcher.mjs` | 5 |
| `parseHttpStatus` | Function | `src/session-watcher.mjs` | 21 |
| `errorKind` | Function | `src/session-watcher.mjs` | 27 |
| `assistantOutput` | Function | `src/session-watcher.mjs` | 37 |
| `isSubagentSession` | Function | `src/session-watcher.mjs` | 47 |
| `terminalEvent` | Function | `src/session-watcher.mjs` | 56 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → IsSubagentSession` | intra_community | 4 |
| `Start → AssistantOutput` | intra_community | 4 |
| `Start → FindRolloutFiles` | intra_community | 3 |
| `Start → InitialState` | intra_community | 3 |
| `Start → Get` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Adapters | 1 calls |
| Cluster_65 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "updateContext"})` — see callers and callees
2. `gitnexus_query({query: "cluster_37"})` — find related execution flows
3. Read key files listed above for implementation details
