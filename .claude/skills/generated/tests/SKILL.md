---
name: tests
description: "Skill for the Tests area of codex-task-notifier. 57 symbols across 11 files."
---

# Tests

57 symbols | 11 files | Cohesion: 89%

## When to Use

- Working with code in `tests/`
- Understanding how resolveOnlineWaiters, report, waitBackoff work
- Modifying tests-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tests/qqbot-gateway.test.mjs` | sleepImpl, constructor, emit, send, close (+9) |
| `src/qqbot-gateway.mjs` | safeCode, deferred, resolveOnlineWaiters, report, waitBackoff (+9) |
| `tests/qqbot-bind.test.mjs` | constructor, constructor, emit, send, response (+3) |
| `tests/helpers.mjs` | unusedPort, testConfig, startHttpServer, close, httpRequest (+1) |
| `tests/qqbot-adapter.test.mjs` | createOnlineGatewayFactory, createAdapter, response, fetchImpl |
| `tests/cli-wrapper.test.mjs` | text, startCaptureService, syntheticSpawn |
| `src/adapters/qqbot.mjs` | createQQBotAdapter, close |
| `tests/wechat-test-account-adapter.test.mjs` | response, fetchImpl |
| `tests/ilink-adapter.test.mjs` | response, fetchImpl |
| `src/api-proxy.mjs` | address |

## Entry Points

Start here when exploring this area:

- **`resolveOnlineWaiters`** (Function) — `src/qqbot-gateway.mjs:120`
- **`report`** (Function) — `src/qqbot-gateway.mjs:129`
- **`waitBackoff`** (Function) — `src/qqbot-gateway.mjs:298`
- **`run`** (Function) — `src/qqbot-gateway.mjs:308`
- **`setActiveMessaging`** (Function) — `src/qqbot-gateway.mjs:358`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `resolveOnlineWaiters` | Function | `src/qqbot-gateway.mjs` | 120 |
| `report` | Function | `src/qqbot-gateway.mjs` | 129 |
| `waitBackoff` | Function | `src/qqbot-gateway.mjs` | 298 |
| `run` | Function | `src/qqbot-gateway.mjs` | 308 |
| `setActiveMessaging` | Function | `src/qqbot-gateway.mjs` | 358 |
| `stop` | Function | `src/qqbot-gateway.mjs` | 364 |
| `gatewayConnection` | Function | `src/qqbot-gateway.mjs` | 163 |
| `cleanup` | Function | `src/qqbot-gateway.mjs` | 191 |
| `finish` | Function | `src/qqbot-gateway.mjs` | 199 |
| `fail` | Function | `src/qqbot-gateway.mjs` | 206 |
| `startHeartbeat` | Function | `src/qqbot-gateway.mjs` | 210 |
| `unusedPort` | Function | `tests/helpers.mjs` | 9 |
| `testConfig` | Function | `tests/helpers.mjs` | 17 |
| `startHttpServer` | Function | `tests/helpers.mjs` | 62 |
| `close` | Function | `tests/helpers.mjs` | 69 |
| `createQQBotAdapter` | Function | `src/adapters/qqbot.mjs` | 82 |
| `httpRequest` | Function | `tests/helpers.mjs` | 38 |
| `request` | Function | `tests/helpers.mjs` | 41 |
| `address` | Method | `src/api-proxy.mjs` | 123 |
| `close` | Method | `src/adapters/qqbot.mjs` | 250 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EnsureGatewayOnline → Failure` | cross_community | 7 |
| `EnsureGatewayStarted → Cleanup` | cross_community | 6 |
| `EnsureGatewayOnline → ResolveOnlineWaiters` | cross_community | 5 |
| `EnsureGatewayOnline → Deferred` | cross_community | 5 |
| `EnsureGatewayOnline → SleepImpl` | cross_community | 5 |
| `EnsureGatewayOnline → SafeCode` | cross_community | 4 |
| `RunService → CreateQQBotAdapter` | cross_community | 4 |
| `RunWatcher → CreateQQBotAdapter` | cross_community | 4 |
| `StartHeartbeat → Cleanup` | intra_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_39 | 8 calls |
| Cluster_36 | 1 calls |
| Cluster_56 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "resolveOnlineWaiters"})` — see callers and callees
2. `gitnexus_query({query: "tests"})` — find related execution flows
3. Read key files listed above for implementation details
