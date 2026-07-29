---
name: cluster-64
description: "Skill for the Cluster_64 area of codex-task-notifier. 4 symbols across 1 files."
---

# Cluster_64

4 symbols | 1 files | Cohesion: 67%

## When to Use

- Working with code in `src/`
- Understanding how redactSensitiveText, stripInternalMetadata, safeFinalOutput work
- Modifying cluster_64-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/event.mjs` | redactSensitiveText, stripInternalMetadata, safeFinalOutput, safeTaskName |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `redactSensitiveText` | Function | `src/event.mjs` | 44 |
| `stripInternalMetadata` | Function | `src/event.mjs` | 56 |
| `safeFinalOutput` | Function | `src/event.mjs` | 86 |
| `safeTaskName` | Function | `src/event.mjs` | 100 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_63 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "redactSensitiveText"})` — see callers and callees
2. `gitnexus_query({query: "cluster_64"})` — find related execution flows
3. Read key files listed above for implementation details
