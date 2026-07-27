---
name: cluster-11
description: "Skill for the Cluster_11 area of codex-openclaw-notifier. 5 symbols across 1 files."
---

# Cluster_11

5 symbols | 1 files | Cohesion: 56%

## When to Use

- Working with code in `src/`
- Understanding how importIncoming, supersedePending, counts work
- Modifying cluster_11-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/outbox.mjs` | listJsonFiles, readJson, importIncoming, supersedePending, counts |

## Entry Points

Start here when exploring this area:

- **`importIncoming`** (Method) — `src/outbox.mjs:118`
- **`supersedePending`** (Method) — `src/outbox.mjs:135`
- **`counts`** (Method) — `src/outbox.mjs:202`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `importIncoming` | Method | `src/outbox.mjs` | 118 |
| `supersedePending` | Method | `src/outbox.mjs` | 135 |
| `counts` | Method | `src/outbox.mjs` | 202 |
| `listJsonFiles` | Function | `src/outbox.mjs` | 23 |
| `readJson` | Function | `src/outbox.mjs` | 50 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → CleanText` | cross_community | 5 |
| `Start → AsIsoTimestamp` | cross_community | 5 |
| `Start → ComputeId` | cross_community | 5 |
| `ImportIncoming → CleanText` | cross_community | 5 |
| `#processDue → RecordFileName` | cross_community | 4 |
| `#processDue → NowIso` | cross_community | 4 |
| `#processDue → WriteJsonAtomic` | cross_community | 4 |
| `#processDue → CleanText` | cross_community | 4 |
| `#processDue → AsIsoTimestamp` | cross_community | 4 |
| `#processDue → ComputeId` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_9 | 1 calls |
| Cluster_15 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "importIncoming"})` — see callers and callees
2. `gitnexus_query({query: "cluster_11"})` — find related execution flows
3. Read key files listed above for implementation details
