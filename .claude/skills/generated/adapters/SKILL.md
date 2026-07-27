---
name: adapters
description: "Skill for the Adapters area of codex-openclaw-notifier. 13 symbols across 6 files."
---

# Adapters

13 symbols | 6 files | Cohesion: 90%

## When to Use

- Working with code in `src/`
- Understanding how createSessionWatcher, createNotifierService, createApiProxy work
- Modifying adapters-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/index.mjs` | installShutdown, runService, runProxy, runWatcher, main |
| `src/adapters/openclaw.mjs` | createOpenClawAdapter, executeOpenClaw, settle |
| `src/notifier-service.mjs` | selectAdapter, createNotifierService |
| `src/session-watcher.mjs` | createSessionWatcher |
| `src/api-proxy.mjs` | createApiProxy |
| `src/adapters/dry-run.mjs` | createDryRunAdapter |

## Entry Points

Start here when exploring this area:

- **`createSessionWatcher`** (Function) — `src/session-watcher.mjs:74`
- **`createNotifierService`** (Function) — `src/notifier-service.mjs:52`
- **`createApiProxy`** (Function) — `src/api-proxy.mjs:34`
- **`createOpenClawAdapter`** (Function) — `src/adapters/openclaw.mjs:47`
- **`createDryRunAdapter`** (Function) — `src/adapters/dry-run.mjs:5`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createSessionWatcher` | Function | `src/session-watcher.mjs` | 74 |
| `createNotifierService` | Function | `src/notifier-service.mjs` | 52 |
| `createApiProxy` | Function | `src/api-proxy.mjs` | 34 |
| `createOpenClawAdapter` | Function | `src/adapters/openclaw.mjs` | 47 |
| `createDryRunAdapter` | Function | `src/adapters/dry-run.mjs` | 5 |
| `selectAdapter` | Function | `src/notifier-service.mjs` | 48 |
| `installShutdown` | Function | `src/index.mjs` | 6 |
| `runService` | Function | `src/index.mjs` | 21 |
| `runProxy` | Function | `src/index.mjs` | 47 |
| `runWatcher` | Function | `src/index.mjs` | 54 |
| `main` | Function | `src/index.mjs` | 70 |
| `executeOpenClaw` | Function | `src/adapters/openclaw.mjs` | 4 |
| `settle` | Function | `src/adapters/openclaw.mjs` | 8 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → Outbox` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_12 | 1 calls |
| Cluster_13 | 1 calls |
| Cluster_17 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "createSessionWatcher"})` — see callers and callees
2. `gitnexus_query({query: "adapters"})` — find related execution flows
3. Read key files listed above for implementation details
