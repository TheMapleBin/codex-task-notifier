---
name: cluster-67
description: "Skill for the Cluster_67 area of codex-task-notifier. 7 symbols across 1 files."
---

# Cluster_67

7 symbols | 1 files | Cohesion: 80%

## When to Use

- Working with code in `src/`
- Understanding how runCodexExec, JsonlParser work
- Modifying cluster_67-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/cli-wrapper.mjs` | JsonlParser, terminalFromRecord, normalizedExecArgs, exitCodeForSignal, terminalForExit (+2) |

## Entry Points

Start here when exploring this area:

- **`runCodexExec`** (Function) — `src/cli-wrapper.mjs:101`
- **`JsonlParser`** (Class) — `src/cli-wrapper.mjs:7`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `JsonlParser` | Class | `src/cli-wrapper.mjs` | 7 |
| `runCodexExec` | Function | `src/cli-wrapper.mjs` | 101 |
| `terminalFromRecord` | Function | `src/cli-wrapper.mjs` | 45 |
| `normalizedExecArgs` | Function | `src/cli-wrapper.mjs` | 73 |
| `exitCodeForSignal` | Function | `src/cli-wrapper.mjs` | 79 |
| `terminalForExit` | Function | `src/cli-wrapper.mjs` | 83 |
| `main` | Function | `src/cli-wrapper.mjs` | 150 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RunCodexExec → IsLoopbackHost` | cross_community | 3 |
| `RunCodexExec → ResolveDefaultHome` | cross_community | 3 |
| `RunCodexExec → IntegerFromEnv` | cross_community | 3 |
| `RunCodexExec → SecureValueFromEnv` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_66 | 1 calls |
| Tests | 1 calls |
| Cluster_53 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "runCodexExec"})` — see callers and callees
2. `gitnexus_query({query: "cluster_67"})` — find related execution flows
3. Read key files listed above for implementation details
