---
name: cluster-5
description: "Skill for the Cluster_5 area of codex-openclaw-notifier. 6 symbols across 1 files."
---

# Cluster_5

6 symbols | 1 files | Cohesion: 83%

## When to Use

- Working with code in `src/`
- Understanding how isLoopbackHost, loadConfig work
- Modifying cluster_5-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/config.mjs` | integerFromEnv, booleanFromEnv, isLoopbackHost, resolveDefaultHome, resolveDefaultSessions (+1) |

## Entry Points

Start here when exploring this area:

- **`isLoopbackHost`** (Function) — `src/config.mjs:33`
- **`loadConfig`** (Function) — `src/config.mjs:48`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `isLoopbackHost` | Function | `src/config.mjs` | 33 |
| `loadConfig` | Function | `src/config.mjs` | 48 |
| `integerFromEnv` | Function | `src/config.mjs` | 8 |
| `booleanFromEnv` | Function | `src/config.mjs` | 20 |
| `resolveDefaultHome` | Function | `src/config.mjs` | 38 |
| `resolveDefaultSessions` | Function | `src/config.mjs` | 43 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RunCodexExec → IsLoopbackHost` | cross_community | 3 |
| `RunCodexExec → ResolveDefaultHome` | cross_community | 3 |
| `RunCodexExec → IntegerFromEnv` | cross_community | 3 |
| `RunCodexExec → ResolveDefaultSessions` | cross_community | 3 |

## How to Explore

1. `context({name: "isLoopbackHost"})` — see callers and callees
2. `query({search_query: "cluster_5"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
