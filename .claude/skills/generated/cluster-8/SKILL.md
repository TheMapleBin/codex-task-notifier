---
name: cluster-8
description: "Skill for the Cluster_8 area of codex-openclaw-notifier. 7 symbols across 2 files."
---

# Cluster_8

7 symbols | 2 files | Cohesion: 92%

## When to Use

- Working with code in `src/`
- Understanding how isTerminalOutcome, submit, tick work
- Modifying cluster_8-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/notifier-service.mjs` | isLoopbackRemote, sendJson, readJsonBody, submit, tick (+1) |
| `src/event.mjs` | isTerminalOutcome |

## Entry Points

Start here when exploring this area:

- **`isTerminalOutcome`** (Function) — `src/event.mjs:128`
- **`submit`** (Function) — `src/notifier-service.mjs:57`
- **`tick`** (Function) — `src/notifier-service.mjs:68`
- **`start`** (Function) — `src/notifier-service.mjs:77`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `isTerminalOutcome` | Function | `src/event.mjs` | 128 |
| `submit` | Function | `src/notifier-service.mjs` | 57 |
| `tick` | Function | `src/notifier-service.mjs` | 68 |
| `start` | Function | `src/notifier-service.mjs` | 77 |
| `isLoopbackRemote` | Function | `src/notifier-service.mjs` | 9 |
| `sendJson` | Function | `src/notifier-service.mjs` | 14 |
| `readJsonBody` | Function | `src/notifier-service.mjs` | 24 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → CleanText` | cross_community | 5 |
| `Start → AsIsoTimestamp` | cross_community | 4 |
| `Start → ComputeId` | cross_community | 4 |
| `Start → IsTerminalOutcome` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_7 | 1 calls |

## How to Explore

1. `context({name: "isTerminalOutcome"})` — see callers and callees
2. `query({search_query: "cluster_8"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
