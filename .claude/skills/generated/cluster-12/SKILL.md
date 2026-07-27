---
name: cluster-12
description: "Skill for the Cluster_12 area of codex-openclaw-notifier. 6 symbols across 3 files."
---

# Cluster_12

6 symbols | 3 files | Cohesion: 63%

## When to Use

- Working with code in `src/`
- Understanding how sendEventToLocalService, serviceUrl, Outbox work
- Modifying cluster_12-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/event-client.mjs` | postJson, request, sendEventToLocalService |
| `src/outbox.mjs` | Outbox, init |
| `src/config.mjs` | serviceUrl |

## Entry Points

Start here when exploring this area:

- **`sendEventToLocalService`** (Function) — `src/event-client.mjs:37`
- **`serviceUrl`** (Function) — `src/config.mjs:140`
- **`Outbox`** (Class) — `src/outbox.mjs:67`
- **`init`** (Method) — `src/outbox.mjs:78`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `Outbox` | Class | `src/outbox.mjs` | 67 |
| `sendEventToLocalService` | Function | `src/event-client.mjs` | 37 |
| `serviceUrl` | Function | `src/config.mjs` | 140 |
| `init` | Method | `src/outbox.mjs` | 78 |
| `postJson` | Function | `src/event-client.mjs` | 6 |
| `request` | Function | `src/event-client.mjs` | 9 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SendEventToLocalService → CleanText` | cross_community | 4 |
| `Main → Outbox` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_15 | 1 calls |
| Cluster_9 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "sendEventToLocalService"})` — see callers and callees
2. `gitnexus_query({query: "cluster_12"})` — find related execution flows
3. Read key files listed above for implementation details
