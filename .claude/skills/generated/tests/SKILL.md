---
name: tests
description: "Skill for the Tests area of codex-openclaw-notifier. 11 symbols across 5 files."
---

# Tests

11 symbols | 5 files | Cohesion: 86%

## When to Use

- Working with code in `tests/`
- Understanding how unusedPort, testConfig, startHttpServer work
- Modifying tests-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tests/helpers.mjs` | unusedPort, testConfig, startHttpServer, close, httpRequest (+1) |
| `tests/cli-wrapper.test.mjs` | startCaptureService, syntheticSpawn |
| `tests/openclaw-adapter.test.mjs` | openClawConfig |
| `src/api-proxy.mjs` | address |
| `src/cli-wrapper.mjs` | end |

## Entry Points

Start here when exploring this area:

- **`unusedPort`** (Function) — `tests/helpers.mjs:9`
- **`testConfig`** (Function) — `tests/helpers.mjs:17`
- **`startHttpServer`** (Function) — `tests/helpers.mjs:69`
- **`close`** (Function) — `tests/helpers.mjs:76`
- **`httpRequest`** (Function) — `tests/helpers.mjs:45`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `unusedPort` | Function | `tests/helpers.mjs` | 9 |
| `testConfig` | Function | `tests/helpers.mjs` | 17 |
| `startHttpServer` | Function | `tests/helpers.mjs` | 69 |
| `close` | Function | `tests/helpers.mjs` | 76 |
| `httpRequest` | Function | `tests/helpers.mjs` | 45 |
| `request` | Function | `tests/helpers.mjs` | 48 |
| `address` | Method | `src/api-proxy.mjs` | 123 |
| `end` | Method | `src/cli-wrapper.mjs` | 19 |
| `openClawConfig` | Function | `tests/openclaw-adapter.test.mjs` | 8 |
| `startCaptureService` | Function | `tests/cli-wrapper.test.mjs` | 35 |
| `syntheticSpawn` | Function | `tests/cli-wrapper.test.mjs` | 18 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Adapters | 1 calls |
| Cluster_13 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "unusedPort"})` — see callers and callees
2. `gitnexus_query({query: "tests"})` — find related execution flows
3. Read key files listed above for implementation details
