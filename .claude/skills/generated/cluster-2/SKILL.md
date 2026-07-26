---
name: cluster-2
description: "Skill for the Cluster_2 area of codex-openclaw-notifier. 7 symbols across 1 files."
---

# Cluster_2

7 symbols | 1 files | Cohesion: 92%

## When to Use

- Working with code in `src/`
- Understanding how report, handler, upstreamRequest work
- Modifying cluster_2-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/api-proxy.mjs` | isLoopbackRemote, isTimeout, joinUpstreamUrl, sendProxyError, report (+2) |

## Entry Points

Start here when exploring this area:

- **`report`** (Function) — `src/api-proxy.mjs:37`
- **`handler`** (Function) — `src/api-proxy.mjs:44`
- **`upstreamRequest`** (Function) — `src/api-proxy.mjs:55`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `report` | Function | `src/api-proxy.mjs` | 37 |
| `handler` | Function | `src/api-proxy.mjs` | 44 |
| `upstreamRequest` | Function | `src/api-proxy.mjs` | 55 |
| `isLoopbackRemote` | Function | `src/api-proxy.mjs` | 6 |
| `isTimeout` | Function | `src/api-proxy.mjs` | 10 |
| `joinUpstreamUrl` | Function | `src/api-proxy.mjs` | 14 |
| `sendProxyError` | Function | `src/api-proxy.mjs` | 20 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Handler → CleanText` | cross_community | 5 |
| `Handler → AsIsoTimestamp` | cross_community | 4 |
| `Handler → ComputeId` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_7 | 1 calls |

## How to Explore

1. `context({name: "report"})` — see callers and callees
2. `query({search_query: "cluster_2"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
