---
name: cluster-66
description: "Skill for the Cluster_66 area of codex-task-notifier. 10 symbols across 1 files."
---

# Cluster_66

10 symbols | 1 files | Cohesion: 92%

## When to Use

- Working with code in `src/`
- Understanding how isLoopbackHost, loadConfig work
- Modifying cluster_66-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/config.mjs` | integerFromEnv, booleanFromEnv, secureValueFromEnv, isLoopbackHost, resolveDefaultHome (+5) |

## Entry Points

Start here when exploring this area:

- **`isLoopbackHost`** (Function) — `src/config.mjs:41`
- **`loadConfig`** (Function) — `src/config.mjs:69`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `isLoopbackHost` | Function | `src/config.mjs` | 41 |
| `loadConfig` | Function | `src/config.mjs` | 69 |
| `integerFromEnv` | Function | `src/config.mjs` | 8 |
| `booleanFromEnv` | Function | `src/config.mjs` | 20 |
| `secureValueFromEnv` | Function | `src/config.mjs` | 33 |
| `resolveDefaultHome` | Function | `src/config.mjs` | 46 |
| `resolveDefaultSessions` | Function | `src/config.mjs` | 51 |
| `resolveDefaultStateDatabase` | Function | `src/config.mjs` | 56 |
| `resolveDefaultWechatTestConfig` | Function | `src/config.mjs` | 61 |
| `resolveDefaultQQBotConfig` | Function | `src/config.mjs` | 65 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RunCodexExec → IsLoopbackHost` | cross_community | 3 |
| `RunCodexExec → ResolveDefaultHome` | cross_community | 3 |
| `RunCodexExec → IntegerFromEnv` | cross_community | 3 |
| `RunCodexExec → SecureValueFromEnv` | cross_community | 3 |
| `Main → IsLoopbackHost` | cross_community | 3 |
| `Main → ResolveDefaultHome` | cross_community | 3 |
| `Main → IntegerFromEnv` | cross_community | 3 |
| `Main → SecureValueFromEnv` | cross_community | 3 |

## How to Explore

1. `gitnexus_context({name: "isLoopbackHost"})` — see callers and callees
2. `gitnexus_query({query: "cluster_66"})` — find related execution flows
3. Read key files listed above for implementation details
