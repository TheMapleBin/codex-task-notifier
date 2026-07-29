---
name: cluster-51
description: "Skill for the Cluster_51 area of codex-task-notifier. 9 symbols across 1 files."
---

# Cluster_51

9 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how bindQQBot, finish, startHeartbeat work
- Modifying cluster_51-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/qqbot-bind.mjs` | failure, required, responseFailure, closeFailure, requestJson (+4) |

## Entry Points

Start here when exploring this area:

- **`bindQQBot`** (Function) — `src/qqbot-bind.mjs:66`
- **`finish`** (Function) — `src/qqbot-bind.mjs:101`
- **`startHeartbeat`** (Function) — `src/qqbot-bind.mjs:111`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `bindQQBot` | Function | `src/qqbot-bind.mjs` | 66 |
| `finish` | Function | `src/qqbot-bind.mjs` | 101 |
| `startHeartbeat` | Function | `src/qqbot-bind.mjs` | 111 |
| `failure` | Function | `src/qqbot-bind.mjs` | 4 |
| `required` | Function | `src/qqbot-bind.mjs` | 11 |
| `responseFailure` | Function | `src/qqbot-bind.mjs` | 16 |
| `closeFailure` | Function | `src/qqbot-bind.mjs` | 26 |
| `requestJson` | Function | `src/qqbot-bind.mjs` | 33 |
| `socketMessageText` | Function | `src/qqbot-bind.mjs` | 58 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `BindQQBot → Failure` | intra_community | 4 |

## How to Explore

1. `gitnexus_context({name: "bindQQBot"})` — see callers and callees
2. `gitnexus_query({query: "cluster_51"})` — find related execution flows
3. Read key files listed above for implementation details
