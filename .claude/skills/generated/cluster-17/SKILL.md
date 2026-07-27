---
name: cluster-17
description: "Skill for the Cluster_17 area of codex-openclaw-notifier. 7 symbols across 1 files."
---

# Cluster_17

7 symbols | 1 files | Cohesion: 86%

## When to Use

- Working with code in `src/`
- Understanding how isLoopbackHost, loadConfig work
- Modifying cluster_17-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/config.mjs` | integerFromEnv, booleanFromEnv, secureValueFromEnv, isLoopbackHost, resolveDefaultHome (+2) |

## Entry Points

Start here when exploring this area:

- **`isLoopbackHost`** (Function) — `src/config.mjs:41`
- **`loadConfig`** (Function) — `src/config.mjs:56`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `isLoopbackHost` | Function | `src/config.mjs` | 41 |
| `loadConfig` | Function | `src/config.mjs` | 56 |
| `integerFromEnv` | Function | `src/config.mjs` | 8 |
| `booleanFromEnv` | Function | `src/config.mjs` | 20 |
| `secureValueFromEnv` | Function | `src/config.mjs` | 33 |
| `resolveDefaultHome` | Function | `src/config.mjs` | 46 |
| `resolveDefaultSessions` | Function | `src/config.mjs` | 51 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RunCodexExec → IsLoopbackHost` | cross_community | 3 |
| `RunCodexExec → ResolveDefaultHome` | cross_community | 3 |
| `RunCodexExec → IntegerFromEnv` | cross_community | 3 |
| `RunCodexExec → SecureValueFromEnv` | cross_community | 3 |

## How to Explore

1. `gitnexus_context({name: "isLoopbackHost"})` — see callers and callees
2. `gitnexus_query({query: "cluster_17"})` — find related execution flows
3. Read key files listed above for implementation details
