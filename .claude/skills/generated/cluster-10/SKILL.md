---
name: cluster-10
description: "Skill for the Cluster_10 area of codex-openclaw-notifier. 4 symbols across 1 files."
---

# Cluster_10

4 symbols | 1 files | Cohesion: 55%

## When to Use

- Working with code in `src/`
- Understanding how #processDue work
- Modifying cluster_10-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/outbox.mjs` | nowIso, replaceJson, retryDelayMs, #processDue |

## Entry Points

Start here when exploring this area:

- **`#processDue`** (Method) — `src/outbox.mjs:161`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `#processDue` | Method | `src/outbox.mjs` | 161 |
| `nowIso` | Function | `src/outbox.mjs` | 10 |
| `replaceJson` | Function | `src/outbox.mjs` | 55 |
| `retryDelayMs` | Function | `src/outbox.mjs` | 62 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `#processDue → RecordFileName` | cross_community | 4 |
| `#processDue → NowIso` | cross_community | 4 |
| `#processDue → WriteJsonAtomic` | cross_community | 4 |
| `#processDue → CleanText` | cross_community | 4 |
| `#processDue → AsIsoTimestamp` | cross_community | 4 |
| `#processDue → ComputeId` | cross_community | 4 |
| `Start → NowIso` | cross_community | 4 |
| `OnEvent → NowIso` | cross_community | 4 |
| `#processDue → ListJsonFiles` | cross_community | 3 |
| `#processDue → ReadJson` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_11 | 3 calls |
| Cluster_15 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "#processDue"})` — see callers and callees
2. `gitnexus_query({query: "cluster_10"})` — find related execution flows
3. Read key files listed above for implementation details
