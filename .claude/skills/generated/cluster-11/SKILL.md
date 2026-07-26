---
name: cluster-11
description: "Skill for the Cluster_11 area of codex-openclaw-notifier. 6 symbols across 1 files."
---

# Cluster_11

6 symbols | 1 files | Cohesion: 91%

## When to Use

- Working with code in `src/`
- Understanding how scanOnce, start work
- Modifying cluster_11-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/session-watcher.mjs` | findRolloutFiles, parseHttpStatus, errorCode, terminalEvent, scanOnce (+1) |

## Entry Points

Start here when exploring this area:

- **`scanOnce`** (Function) — `src/session-watcher.mjs:74`
- **`start`** (Function) — `src/session-watcher.mjs:125`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `scanOnce` | Function | `src/session-watcher.mjs` | 74 |
| `start` | Function | `src/session-watcher.mjs` | 125 |
| `findRolloutFiles` | Function | `src/session-watcher.mjs` | 5 |
| `parseHttpStatus` | Function | `src/session-watcher.mjs` | 21 |
| `errorCode` | Function | `src/session-watcher.mjs` | 27 |
| `terminalEvent` | Function | `src/session-watcher.mjs` | 31 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_7 | 1 calls |

## How to Explore

1. `context({name: "scanOnce"})` — see callers and callees
2. `query({search_query: "cluster_11"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
