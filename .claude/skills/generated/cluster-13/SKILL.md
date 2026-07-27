---
name: cluster-13
description: "Skill for the Cluster_13 area of codex-openclaw-notifier. 6 symbols across 2 files."
---

# Cluster_13

6 symbols | 2 files | Cohesion: 63%

## When to Use

- Working with code in `src/`
- Understanding how tick, start, processDue work
- Modifying cluster_13-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/notifier-service.mjs` | isLoopbackRemote, sendJson, readJsonBody, tick, start |
| `src/outbox.mjs` | processDue |

## Entry Points

Start here when exploring this area:

- **`tick`** (Function) — `src/notifier-service.mjs:68`
- **`start`** (Function) — `src/notifier-service.mjs:77`
- **`processDue`** (Method) — `src/outbox.mjs:153`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `tick` | Function | `src/notifier-service.mjs` | 68 |
| `start` | Function | `src/notifier-service.mjs` | 77 |
| `processDue` | Method | `src/outbox.mjs` | 153 |
| `isLoopbackRemote` | Function | `src/notifier-service.mjs` | 9 |
| `sendJson` | Function | `src/notifier-service.mjs` | 14 |
| `readJsonBody` | Function | `src/notifier-service.mjs` | 24 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → CleanText` | cross_community | 5 |
| `Start → AsIsoTimestamp` | cross_community | 5 |
| `Start → ComputeId` | cross_community | 5 |
| `Start → RecordFileName` | cross_community | 4 |
| `Start → NowIso` | cross_community | 4 |
| `Start → WriteJsonAtomic` | cross_community | 4 |
| `Start → ListJsonFiles` | cross_community | 3 |
| `Start → ReadJson` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_11 | 2 calls |
| Cluster_12 | 1 calls |
| Cluster_9 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "tick"})` — see callers and callees
2. `gitnexus_query({query: "cluster_13"})` — find related execution flows
3. Read key files listed above for implementation details
