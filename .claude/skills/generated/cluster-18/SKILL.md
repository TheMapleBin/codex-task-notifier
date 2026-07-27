---
name: cluster-18
description: "Skill for the Cluster_18 area of codex-openclaw-notifier. 7 symbols across 1 files."
---

# Cluster_18

7 symbols | 1 files | Cohesion: 80%

## When to Use

- Working with code in `src/`
- Understanding how runCodexExec, JsonlParser work
- Modifying cluster_18-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/cli-wrapper.mjs` | JsonlParser, terminalFromRecord, normalizedExecArgs, exitCodeForSignal, terminalForExit (+2) |

## Entry Points

Start here when exploring this area:

- **`runCodexExec`** (Function) — `src/cli-wrapper.mjs:88`
- **`JsonlParser`** (Class) — `src/cli-wrapper.mjs:7`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `JsonlParser` | Class | `src/cli-wrapper.mjs` | 7 |
| `runCodexExec` | Function | `src/cli-wrapper.mjs` | 88 |
| `terminalFromRecord` | Function | `src/cli-wrapper.mjs` | 45 |
| `normalizedExecArgs` | Function | `src/cli-wrapper.mjs` | 60 |
| `exitCodeForSignal` | Function | `src/cli-wrapper.mjs` | 66 |
| `terminalForExit` | Function | `src/cli-wrapper.mjs` | 70 |
| `main` | Function | `src/cli-wrapper.mjs` | 136 |

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
| Cluster_17 | 1 calls |
| Tests | 1 calls |
| Cluster_12 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "runCodexExec"})` — see callers and callees
2. `gitnexus_query({query: "cluster_18"})` — find related execution flows
3. Read key files listed above for implementation details
