---
name: cluster-59
description: "Skill for the Cluster_59 area of codex-task-notifier. 9 symbols across 1 files."
---

# Cluster_59

9 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how writeJsonAtomic, appendLog, processExists work
- Modifying cluster_59-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lifecycle-supervisor.mjs` | writeJsonAtomic, appendLog, processExists, claimSingleInstance, fixtureStates (+4) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `writeJsonAtomic` | Function | `src/lifecycle-supervisor.mjs` | 28 |
| `appendLog` | Function | `src/lifecycle-supervisor.mjs` | 36 |
| `processExists` | Function | `src/lifecycle-supervisor.mjs` | 41 |
| `claimSingleInstance` | Function | `src/lifecycle-supervisor.mjs` | 51 |
| `fixtureStates` | Function | `src/lifecycle-supervisor.mjs` | 62 |
| `codexActive` | Function | `src/lifecycle-supervisor.mjs` | 69 |
| `control` | Function | `src/lifecycle-supervisor.mjs` | 79 |
| `sleep` | Function | `src/lifecycle-supervisor.mjs` | 102 |
| `main` | Function | `src/lifecycle-supervisor.mjs` | 106 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → ProcessExists` | intra_community | 3 |
| `Main → WriteJsonAtomic` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "writeJsonAtomic"})` — see callers and callees
2. `gitnexus_query({query: "cluster_59"})` — find related execution flows
3. Read key files listed above for implementation details
