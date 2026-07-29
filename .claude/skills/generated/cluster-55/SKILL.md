---
name: cluster-55
description: "Skill for the Cluster_55 area of codex-task-notifier. 7 symbols across 2 files."
---

# Cluster_55

7 symbols | 2 files | Cohesion: 71%

## When to Use

- Working with code in `src/`
- Understanding how tick, onContextRefreshed, wakeContextPending work
- Modifying cluster_55-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/outbox.mjs` | replaceJson, isContextBlockedRecord, belongsToActiveTransport, wakeContextPending, processDue |
| `src/notifier-service.mjs` | tick, onContextRefreshed |

## Entry Points

Start here when exploring this area:

- **`tick`** (Function) — `src/notifier-service.mjs:74`
- **`onContextRefreshed`** (Function) — `src/notifier-service.mjs:83`
- **`wakeContextPending`** (Method) — `src/outbox.mjs:191`
- **`processDue`** (Method) — `src/outbox.mjs:209`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `tick` | Function | `src/notifier-service.mjs` | 74 |
| `onContextRefreshed` | Function | `src/notifier-service.mjs` | 83 |
| `wakeContextPending` | Method | `src/outbox.mjs` | 191 |
| `processDue` | Method | `src/outbox.mjs` | 209 |
| `replaceJson` | Function | `src/outbox.mjs` | 55 |
| `isContextBlockedRecord` | Function | `src/outbox.mjs` | 77 |
| `belongsToActiveTransport` | Function | `src/outbox.mjs` | 93 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `OnContextRefreshed → ListJsonFiles` | cross_community | 3 |
| `OnContextRefreshed → ReadJson` | cross_community | 3 |
| `OnContextRefreshed → BelongsToActiveTransport` | intra_community | 3 |
| `OnContextRefreshed → IsContextBlockedRecord` | intra_community | 3 |
| `OnContextRefreshed → ProcessDue` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_54 | 2 calls |

## How to Explore

1. `gitnexus_context({name: "tick"})` — see callers and callees
2. `gitnexus_query({query: "cluster_55"})` — find related execution flows
3. Read key files listed above for implementation details
