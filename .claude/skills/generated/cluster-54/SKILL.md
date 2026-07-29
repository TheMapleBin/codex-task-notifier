---
name: cluster-54
description: "Skill for the Cluster_54 area of codex-task-notifier. 9 symbols across 1 files."
---

# Cluster_54

9 symbols | 1 files | Cohesion: 67%

## When to Use

- Working with code in `src/`
- Understanding how importIncoming, supersedePending, #processDue work
- Modifying cluster_54-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/outbox.mjs` | listJsonFiles, readJson, retryDelayMs, isContextBlockedError, safeErrorCode (+4) |

## Entry Points

Start here when exploring this area:

- **`importIncoming`** (Method) — `src/outbox.mjs:156`
- **`supersedePending`** (Method) — `src/outbox.mjs:173`
- **`#processDue`** (Method) — `src/outbox.mjs:217`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `importIncoming` | Method | `src/outbox.mjs` | 156 |
| `supersedePending` | Method | `src/outbox.mjs` | 173 |
| `#processDue` | Method | `src/outbox.mjs` | 217 |
| `listJsonFiles` | Function | `src/outbox.mjs` | 23 |
| `readJson` | Function | `src/outbox.mjs` | 50 |
| `retryDelayMs` | Function | `src/outbox.mjs` | 62 |
| `isContextBlockedError` | Function | `src/outbox.mjs` | 73 |
| `safeErrorCode` | Function | `src/outbox.mjs` | 81 |
| `retryDelayForError` | Function | `src/outbox.mjs` | 85 |

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
| `#processDue → CleanText` | cross_community | 4 |
| `#processDue → AsIsoTimestamp` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_53 | 2 calls |
| Cluster_65 | 2 calls |
| Cluster_55 | 2 calls |

## How to Explore

1. `gitnexus_context({name: "importIncoming"})` — see callers and callees
2. `gitnexus_query({query: "cluster_54"})` — find related execution flows
3. Read key files listed above for implementation details
