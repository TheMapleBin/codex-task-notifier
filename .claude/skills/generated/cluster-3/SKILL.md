---
name: cluster-3
description: "Skill for the Cluster_3 area of codex-openclaw-notifier. 7 symbols across 3 files."
---

# Cluster_3

7 symbols | 3 files | Cohesion: 91%

## When to Use

- Working with code in `src/`
- Understanding how createApiProxy, createSessionWatcher work
- Modifying cluster_3-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/index.mjs` | installShutdown, runService, runProxy, runWatcher, main |
| `src/api-proxy.mjs` | createApiProxy |
| `src/session-watcher.mjs` | createSessionWatcher |

## Entry Points

Start here when exploring this area:

- **`createApiProxy`** (Function) — `src/api-proxy.mjs:34`
- **`createSessionWatcher`** (Function) — `src/session-watcher.mjs:69`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createApiProxy` | Function | `src/api-proxy.mjs` | 34 |
| `createSessionWatcher` | Function | `src/session-watcher.mjs` | 69 |
| `installShutdown` | Function | `src/index.mjs` | 6 |
| `runService` | Function | `src/index.mjs` | 21 |
| `runProxy` | Function | `src/index.mjs` | 47 |
| `runWatcher` | Function | `src/index.mjs` | 54 |
| `main` | Function | `src/index.mjs` | 65 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → CreateOpenClawAdapter` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Tests | 1 calls |
| Cluster_5 | 1 calls |

## How to Explore

1. `context({name: "createApiProxy"})` — see callers and callees
2. `query({search_query: "cluster_3"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
