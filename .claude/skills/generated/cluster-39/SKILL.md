---
name: cluster-39
description: "Skill for the Cluster_39 area of codex-task-notifier. 6 symbols across 1 files."
---

# Cluster_39

6 symbols | 1 files | Cohesion: 61%

## When to Use

- Working with code in `src/`
- Understanding how currentCredentials work
- Modifying cluster_39-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/qqbot-gateway.mjs` | failure, required, responseFailure, closeFailure, requestJson (+1) |

## Entry Points

Start here when exploring this area:

- **`currentCredentials`** (Function) — `src/qqbot-gateway.mjs:150`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `currentCredentials` | Function | `src/qqbot-gateway.mjs` | 150 |
| `failure` | Function | `src/qqbot-gateway.mjs` | 7 |
| `required` | Function | `src/qqbot-gateway.mjs` | 14 |
| `responseFailure` | Function | `src/qqbot-gateway.mjs` | 27 |
| `closeFailure` | Function | `src/qqbot-gateway.mjs` | 37 |
| `requestJson` | Function | `src/qqbot-gateway.mjs` | 44 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EnsureGatewayOnline → Failure` | cross_community | 7 |

## How to Explore

1. `gitnexus_context({name: "currentCredentials"})` — see callers and callees
2. `gitnexus_query({query: "cluster_39"})` — find related execution flows
3. Read key files listed above for implementation details
