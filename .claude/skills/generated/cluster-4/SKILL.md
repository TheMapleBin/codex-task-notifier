---
name: cluster-4
description: "Skill for the Cluster_4 area of codex-openclaw-notifier. 9 symbols across 1 files."
---

# Cluster_4

9 symbols | 1 files | Cohesion: 89%

## When to Use

- Working with code in `src/`
- Understanding how runCodexExec, JsonlParser, push work
- Modifying cluster_4-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/cli-wrapper.mjs` | JsonlParser, push, end, terminalFromRecord, normalizedExecArgs (+4) |

## Entry Points

Start here when exploring this area:

- **`runCodexExec`** (Function) — `src/cli-wrapper.mjs:88`
- **`JsonlParser`** (Class) — `src/cli-wrapper.mjs:7`
- **`push`** (Method) — `src/cli-wrapper.mjs:14`
- **`end`** (Method) — `src/cli-wrapper.mjs:19`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `JsonlParser` | Class | `src/cli-wrapper.mjs` | 7 |
| `runCodexExec` | Function | `src/cli-wrapper.mjs` | 88 |
| `push` | Method | `src/cli-wrapper.mjs` | 14 |
| `end` | Method | `src/cli-wrapper.mjs` | 19 |
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
| `RunCodexExec → ResolveDefaultSessions` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_5 | 1 calls |
| Cluster_6 | 1 calls |

## How to Explore

1. `context({name: "runCodexExec"})` — see callers and callees
2. `query({search_query: "cluster_4"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
