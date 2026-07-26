---
name: cluster-6
description: "Skill for the Cluster_6 area of codex-openclaw-notifier. 7 symbols across 4 files."
---

# Cluster_6

7 symbols | 4 files | Cohesion: 75%

## When to Use

- Working with code in `src/`
- Understanding how serviceUrl, sendEventToLocalService, init work
- Modifying cluster_6-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/outbox.mjs` | writeJsonAtomic, init, stageIncoming |
| `src/event-client.mjs` | postJson, sendEventToLocalService |
| `src/config.mjs` | serviceUrl |
| `src/index.mjs` | onEvent |

## Entry Points

Start here when exploring this area:

- **`serviceUrl`** (Function) — `src/config.mjs:121`
- **`sendEventToLocalService`** (Function) — `src/event-client.mjs:37`
- **`init`** (Method) — `src/outbox.mjs:78`
- **`stageIncoming`** (Method) — `src/outbox.mjs:111`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `serviceUrl` | Function | `src/config.mjs` | 121 |
| `sendEventToLocalService` | Function | `src/event-client.mjs` | 37 |
| `init` | Method | `src/outbox.mjs` | 78 |
| `stageIncoming` | Method | `src/outbox.mjs` | 111 |
| `postJson` | Function | `src/event-client.mjs` | 6 |
| `onEvent` | Function | `src/index.mjs` | 27 |
| `writeJsonAtomic` | Function | `src/outbox.mjs` | 35 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SendEventToLocalService → CleanText` | cross_community | 4 |
| `SendEventToLocalService → WriteJsonAtomic` | intra_community | 3 |
| `SendEventToLocalService → AsIsoTimestamp` | cross_community | 3 |
| `SendEventToLocalService → ComputeId` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_7 | 1 calls |
| Cluster_9 | 1 calls |

## How to Explore

1. `context({name: "serviceUrl"})` — see callers and callees
2. `query({search_query: "cluster_6"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
