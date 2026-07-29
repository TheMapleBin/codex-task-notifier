---
name: cluster-53
description: "Skill for the Cluster_53 area of codex-task-notifier. 13 symbols across 6 files."
---

# Cluster_53

13 symbols | 6 files | Cohesion: 72%

## When to Use

- Working with code in `src/`
- Understanding how submit, isTerminalOutcome, sendEventToLocalService work
- Modifying cluster_53-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/outbox.mjs` | recordFileName, nowIso, writeJsonAtomic, init, enqueue (+1) |
| `src/event-client.mjs` | postJson, request, sendEventToLocalService |
| `src/notifier-service.mjs` | submit |
| `src/index.mjs` | onEvent |
| `src/event.mjs` | isTerminalOutcome |
| `src/config.mjs` | serviceUrl |

## Entry Points

Start here when exploring this area:

- **`submit`** (Function) — `src/notifier-service.mjs:63`
- **`isTerminalOutcome`** (Function) — `src/event.mjs:228`
- **`sendEventToLocalService`** (Function) — `src/event-client.mjs:37`
- **`serviceUrl`** (Function) — `src/config.mjs:191`
- **`init`** (Method) — `src/outbox.mjs:115`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `submit` | Function | `src/notifier-service.mjs` | 63 |
| `isTerminalOutcome` | Function | `src/event.mjs` | 228 |
| `sendEventToLocalService` | Function | `src/event-client.mjs` | 37 |
| `serviceUrl` | Function | `src/config.mjs` | 191 |
| `init` | Method | `src/outbox.mjs` | 115 |
| `enqueue` | Method | `src/outbox.mjs` | 124 |
| `stageIncoming` | Method | `src/outbox.mjs` | 149 |
| `recordFileName` | Function | `src/outbox.mjs` | 6 |
| `nowIso` | Function | `src/outbox.mjs` | 10 |
| `writeJsonAtomic` | Function | `src/outbox.mjs` | 35 |
| `onEvent` | Function | `src/index.mjs` | 28 |
| `postJson` | Function | `src/event-client.mjs` | 6 |
| `request` | Function | `src/event-client.mjs` | 9 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → CleanText` | cross_community | 5 |
| `Start → AsIsoTimestamp` | cross_community | 5 |
| `Start → ComputeId` | cross_community | 5 |
| `ImportIncoming → CleanText` | cross_community | 5 |
| `RunWatcher → RecordFileName` | cross_community | 5 |
| `#processDue → RecordFileName` | cross_community | 4 |
| `#processDue → NowIso` | cross_community | 4 |
| `#processDue → WriteJsonAtomic` | cross_community | 4 |
| `Start → NowIso` | cross_community | 4 |
| `Start → WriteJsonAtomic` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_65 | 3 calls |
| Cluster_54 | 1 calls |
| Cluster_36 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "submit"})` — see callers and callees
2. `gitnexus_query({query: "cluster_53"})` — find related execution flows
3. Read key files listed above for implementation details
