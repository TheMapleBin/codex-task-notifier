---
name: cluster-36
description: "Skill for the Cluster_36 area of codex-task-notifier. 10 symbols across 6 files."
---

# Cluster_36

10 symbols | 6 files | Cohesion: 86%

## When to Use

- Working with code in `src/`
- Understanding how createThreadNameResolver, createSessionWatcher, createNotifierService work
- Modifying cluster_36-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/index.mjs` | installShutdown, runService, runProxy, runWatcher, main |
| `src/thread-name.mjs` | createThreadNameResolver |
| `src/session-watcher.mjs` | createSessionWatcher |
| `src/outbox.mjs` | Outbox |
| `src/notifier-service.mjs` | createNotifierService |
| `src/api-proxy.mjs` | createApiProxy |

## Entry Points

Start here when exploring this area:

- **`createThreadNameResolver`** (Function) — `src/thread-name.mjs:12`
- **`createSessionWatcher`** (Function) — `src/session-watcher.mjs:95`
- **`createNotifierService`** (Function) — `src/notifier-service.mjs:57`
- **`createApiProxy`** (Function) — `src/api-proxy.mjs:34`
- **`Outbox`** (Class) — `src/outbox.mjs:104`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `Outbox` | Class | `src/outbox.mjs` | 104 |
| `createThreadNameResolver` | Function | `src/thread-name.mjs` | 12 |
| `createSessionWatcher` | Function | `src/session-watcher.mjs` | 95 |
| `createNotifierService` | Function | `src/notifier-service.mjs` | 57 |
| `createApiProxy` | Function | `src/api-proxy.mjs` | 34 |
| `installShutdown` | Function | `src/index.mjs` | 7 |
| `runService` | Function | `src/index.mjs` | 22 |
| `runProxy` | Function | `src/index.mjs` | 49 |
| `runWatcher` | Function | `src/index.mjs` | 56 |
| `main` | Function | `src/index.mjs` | 73 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RunService → CreateIlinkSessionStore` | cross_community | 5 |
| `RunService → ValidateBaseUrl` | cross_community | 5 |
| `RunService → InitialContext` | cross_community | 5 |
| `RunWatcher → CreateIlinkSessionStore` | cross_community | 5 |
| `RunWatcher → ValidateBaseUrl` | cross_community | 5 |
| `RunWatcher → InitialContext` | cross_community | 5 |
| `RunWatcher → RecordFileName` | cross_community | 5 |
| `Main → Outbox` | intra_community | 4 |
| `RunService → CreateWechatTestAccountAdapter` | cross_community | 4 |
| `RunService → CreateQQBotAdapter` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Adapters | 1 calls |
| Cluster_56 | 1 calls |
| Cluster_66 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "createThreadNameResolver"})` — see callers and callees
2. `gitnexus_query({query: "cluster_36"})` — find related execution flows
3. Read key files listed above for implementation details
