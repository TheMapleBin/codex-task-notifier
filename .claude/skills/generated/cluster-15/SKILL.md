---
name: cluster-15
description: "Skill for the Cluster_15 area of codex-openclaw-notifier. 5 symbols across 1 files."
---

# Cluster_15

5 symbols | 1 files | Cohesion: 42%

## When to Use

- Working with code in `src/`
- Understanding how createEvent work
- Modifying cluster_15-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/event.mjs` | asIsoTimestamp, computeId, severityFor, durationMs, createEvent |

## Entry Points

Start here when exploring this area:

- **`createEvent`** (Function) — `src/event.mjs:111`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createEvent` | Function | `src/event.mjs` | 111 |
| `asIsoTimestamp` | Function | `src/event.mjs` | 41 |
| `computeId` | Function | `src/event.mjs` | 64 |
| `severityFor` | Function | `src/event.mjs` | 70 |
| `durationMs` | Function | `src/event.mjs` | 80 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Handler → CleanText` | cross_community | 5 |
| `Start → CleanText` | cross_community | 5 |
| `Start → AsIsoTimestamp` | cross_community | 5 |
| `Start → ComputeId` | cross_community | 5 |
| `Start → CleanText` | cross_community | 5 |
| `ImportIncoming → CleanText` | cross_community | 5 |
| `#processDue → CleanText` | cross_community | 4 |
| `#processDue → AsIsoTimestamp` | cross_community | 4 |
| `#processDue → ComputeId` | cross_community | 4 |
| `Handler → AsIsoTimestamp` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_14 | 4 calls |

## How to Explore

1. `gitnexus_context({name: "createEvent"})` — see callers and callees
2. `gitnexus_query({query: "cluster_15"})` — find related execution flows
3. Read key files listed above for implementation details
