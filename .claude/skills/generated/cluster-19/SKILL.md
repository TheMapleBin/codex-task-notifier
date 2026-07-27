---
name: cluster-19
description: "Skill for the Cluster_19 area of codex-openclaw-notifier. 7 symbols across 1 files."
---

# Cluster_19

7 symbols | 1 files | Cohesion: 92%

## When to Use

- Working with code in `src/`
- Understanding how report, handler, upstreamRequest work
- Modifying cluster_19-related functionality

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
| Cluster_15 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "report"})` — see callers and callees
2. `gitnexus_query({query: "cluster_19"})` — find related execution flows
3. Read key files listed above for implementation details
