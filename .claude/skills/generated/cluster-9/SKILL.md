---
name: cluster-9
description: "Skill for the Cluster_9 area of codex-openclaw-notifier. 11 symbols across 1 files."
---

# Cluster_9

11 symbols | 1 files | Cohesion: 82%

## When to Use

- Working with code in `src/`
- Understanding how Outbox, enqueue, importIncoming work
- Modifying cluster_9-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/outbox.mjs` | recordFileName, nowIso, listJsonFiles, readJson, replaceJson (+6) |

## Entry Points

Start here when exploring this area:

- **`Outbox`** (Class) — `src/outbox.mjs:67`
- **`enqueue`** (Method) — `src/outbox.mjs:87`
- **`importIncoming`** (Method) — `src/outbox.mjs:118`
- **`supersedePending`** (Method) — `src/outbox.mjs:135`
- **`counts`** (Method) — `src/outbox.mjs:202`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `Outbox` | Class | `src/outbox.mjs` | 67 |
| `enqueue` | Method | `src/outbox.mjs` | 87 |
| `importIncoming` | Method | `src/outbox.mjs` | 118 |
| `supersedePending` | Method | `src/outbox.mjs` | 135 |
| `counts` | Method | `src/outbox.mjs` | 202 |
| `recordFileName` | Function | `src/outbox.mjs` | 6 |
| `nowIso` | Function | `src/outbox.mjs` | 10 |
| `listJsonFiles` | Function | `src/outbox.mjs` | 23 |
| `readJson` | Function | `src/outbox.mjs` | 50 |
| `replaceJson` | Function | `src/outbox.mjs` | 55 |
| `retryDelayMs` | Function | `src/outbox.mjs` | 62 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ImportIncoming → CleanText` | cross_community | 5 |
| `ImportIncoming → AsIsoTimestamp` | cross_community | 4 |
| `ImportIncoming → ComputeId` | cross_community | 4 |
| `ImportIncoming → RecordFileName` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_7 | 3 calls |
| Cluster_6 | 1 calls |

## How to Explore

1. `context({name: "Outbox"})` — see callers and callees
2. `query({search_query: "cluster_9"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
