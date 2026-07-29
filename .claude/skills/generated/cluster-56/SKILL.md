---
name: cluster-56
description: "Skill for the Cluster_56 area of codex-task-notifier. 5 symbols across 2 files."
---

# Cluster_56

5 symbols | 2 files | Cohesion: 53%

## When to Use

- Working with code in `src/`
- Understanding how start, counts work
- Modifying cluster_56-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/notifier-service.mjs` | isLoopbackRemote, sendJson, readJsonBody, start |
| `src/outbox.mjs` | counts |

## Entry Points

Start here when exploring this area:

- **`start`** (Function) — `src/notifier-service.mjs:90`
- **`counts`** (Method) — `src/outbox.mjs:267`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `start` | Function | `src/notifier-service.mjs` | 90 |
| `counts` | Method | `src/outbox.mjs` | 267 |
| `isLoopbackRemote` | Function | `src/notifier-service.mjs` | 11 |
| `sendJson` | Function | `src/notifier-service.mjs` | 16 |
| `readJsonBody` | Function | `src/notifier-service.mjs` | 26 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → CleanText` | cross_community | 5 |
| `Start → AsIsoTimestamp` | cross_community | 5 |
| `Start → ComputeId` | cross_community | 5 |
| `RunWatcher → RecordFileName` | cross_community | 5 |
| `Start → NowIso` | cross_community | 4 |
| `Start → WriteJsonAtomic` | cross_community | 4 |
| `RunWatcher → ListJsonFiles` | cross_community | 4 |
| `RunWatcher → ReadJson` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_54 | 2 calls |
| Cluster_53 | 2 calls |
| Cluster_55 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "start"})` — see callers and callees
2. `gitnexus_query({query: "cluster_56"})` — find related execution flows
3. Read key files listed above for implementation details
