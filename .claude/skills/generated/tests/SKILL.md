---
name: tests
description: "Skill for the Tests area of codex-openclaw-notifier. 7 symbols across 5 files."
---

# Tests

7 symbols | 5 files | Cohesion: 86%

## When to Use

- Working with code in `src/`
- Understanding how createDryRunAdapter, createOpenClawAdapter, createNotifierService work
- Modifying tests-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/notifier-service.mjs` | selectAdapter, createNotifierService |
| `tests/helpers.mjs` | unusedPort, testConfig |
| `src/adapters/dry-run.mjs` | createDryRunAdapter |
| `src/adapters/openclaw.mjs` | createOpenClawAdapter |
| `tests/cli-wrapper.test.mjs` | startCaptureService |

## Entry Points

Start here when exploring this area:

- **`createDryRunAdapter`** (Function) — `src/adapters/dry-run.mjs:5`
- **`createOpenClawAdapter`** (Function) — `src/adapters/openclaw.mjs:3`
- **`createNotifierService`** (Function) — `src/notifier-service.mjs:52`
- **`unusedPort`** (Function) — `tests/helpers.mjs:9`
- **`testConfig`** (Function) — `tests/helpers.mjs:17`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createDryRunAdapter` | Function | `src/adapters/dry-run.mjs` | 5 |
| `createOpenClawAdapter` | Function | `src/adapters/openclaw.mjs` | 3 |
| `createNotifierService` | Function | `src/notifier-service.mjs` | 52 |
| `unusedPort` | Function | `tests/helpers.mjs` | 9 |
| `testConfig` | Function | `tests/helpers.mjs` | 17 |
| `selectAdapter` | Function | `src/notifier-service.mjs` | 48 |
| `startCaptureService` | Function | `tests/cli-wrapper.test.mjs` | 35 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → CreateOpenClawAdapter` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_9 | 1 calls |

## How to Explore

1. `context({name: "createDryRunAdapter"})` — see callers and callees
2. `query({search_query: "tests"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
