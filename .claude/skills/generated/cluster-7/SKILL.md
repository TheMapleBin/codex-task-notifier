---
name: cluster-7
description: "Skill for the Cluster_7 area of codex-openclaw-notifier. 8 symbols across 1 files."
---

# Cluster_7

8 symbols | 1 files | Cohesion: 95%

## When to Use

- Working with code in `src/`
- Understanding how updateContext, primeExisting, scanOnce work
- Modifying cluster_7-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/session-watcher.mjs` | findRolloutFiles, parseHttpStatus, errorKind, terminalEvent, updateContext (+3) |

## Entry Points

Start here when exploring this area:

- **`updateContext`** (Function) — `src/session-watcher.mjs:79`
- **`primeExisting`** (Function) — `src/session-watcher.mjs:85`
- **`scanOnce`** (Function) — `src/session-watcher.mjs:103`
- **`start`** (Function) — `src/session-watcher.mjs:151`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `updateContext` | Function | `src/session-watcher.mjs` | 79 |
| `primeExisting` | Function | `src/session-watcher.mjs` | 85 |
| `scanOnce` | Function | `src/session-watcher.mjs` | 103 |
| `start` | Function | `src/session-watcher.mjs` | 151 |
| `findRolloutFiles` | Function | `src/session-watcher.mjs` | 5 |
| `parseHttpStatus` | Function | `src/session-watcher.mjs` | 21 |
| `errorKind` | Function | `src/session-watcher.mjs` | 27 |
| `terminalEvent` | Function | `src/session-watcher.mjs` | 37 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → CleanText` | cross_community | 5 |
| `Start → ParseHttpStatus` | intra_community | 4 |
| `Start → ErrorKind` | intra_community | 4 |
| `Start → AsIsoTimestamp` | cross_community | 4 |
| `Start → ComputeId` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_15 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "updateContext"})` — see callers and callees
2. `gitnexus_query({query: "cluster_7"})` — find related execution flows
3. Read key files listed above for implementation details
