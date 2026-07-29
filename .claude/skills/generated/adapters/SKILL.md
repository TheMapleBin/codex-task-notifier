---
name: adapters
description: "Skill for the Adapters area of codex-task-notifier. 54 symbols across 14 files."
---

# Adapters

54 symbols | 14 files | Cohesion: 90%

## When to Use

- Working with code in `src/`
- Understanding how createWechatTestAccountConfigStore, normalizeSettings, getSettings work
- Modifying adapters-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/adapters/qqbot.mjs` | required, normalizeSettings, getSettings, sendWithToken, credentials (+10) |
| `src/adapters/ilink.mjs` | headers, requestJson, sessionSnapshot, persistSession, restoreSession (+6) |
| `src/adapters/wechat-test-account.mjs` | formatTemplateValue, required, failureCode, requestJson, normalizeSettings (+5) |
| `src/ilink-session-state.mjs` | read, write, createIlinkSessionStore |
| `src/wechat-test-account-config.mjs` | createWechatTestAccountConfigStore, read |
| `src/event.mjs` | formatEventForDelivery, formatDuration |
| `tests/qqbot-adapter.test.mjs` | get, gatewayFactory |
| `src/qqbot-gateway.mjs` | timer, waitUntilOnline |
| `src/qqbot-gateway-status.mjs` | createQQBotGatewayStatusStore, write |
| `src/qqbot-config.mjs` | createQQBotConfigStore |

## Entry Points

Start here when exploring this area:

- **`createWechatTestAccountConfigStore`** (Function) — `src/wechat-test-account-config.mjs:63`
- **`normalizeSettings`** (Function) — `src/adapters/wechat-test-account.mjs:66`
- **`getSettings`** (Function) — `src/adapters/wechat-test-account.mjs:75`
- **`getAccessToken`** (Function) — `src/adapters/wechat-test-account.mjs:93`
- **`sendWithToken`** (Function) — `src/adapters/wechat-test-account.mjs:109`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createWechatTestAccountConfigStore` | Function | `src/wechat-test-account-config.mjs` | 63 |
| `normalizeSettings` | Function | `src/adapters/wechat-test-account.mjs` | 66 |
| `getSettings` | Function | `src/adapters/wechat-test-account.mjs` | 75 |
| `getAccessToken` | Function | `src/adapters/wechat-test-account.mjs` | 93 |
| `sendWithToken` | Function | `src/adapters/wechat-test-account.mjs` | 109 |
| `sessionSnapshot` | Function | `src/adapters/ilink.mjs` | 87 |
| `persistSession` | Function | `src/adapters/ilink.mjs` | 97 |
| `restoreSession` | Function | `src/adapters/ilink.mjs` | 112 |
| `pollOnce` | Function | `src/adapters/ilink.mjs` | 135 |
| `pollLoop` | Function | `src/adapters/ilink.mjs` | 166 |
| `createQQBotConfigStore` | Function | `src/qqbot-config.mjs` | 62 |
| `formatEventForDelivery` | Function | `src/event.mjs` | 232 |
| `normalizeSettings` | Function | `src/adapters/qqbot.mjs` | 104 |
| `getSettings` | Function | `src/adapters/qqbot.mjs` | 112 |
| `sendWithToken` | Function | `src/adapters/qqbot.mjs` | 159 |
| `credentials` | Function | `src/adapters/qqbot.mjs` | 184 |
| `getAccessToken` | Function | `src/adapters/qqbot.mjs` | 130 |
| `createIlinkSessionStore` | Function | `src/ilink-session-state.mjs` | 67 |
| `createWechatTestAccountAdapter` | Function | `src/adapters/wechat-test-account.mjs` | 53 |
| `createIlinkAdapter` | Function | `src/adapters/ilink.mjs` | 64 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EnsureGatewayOnline → Failure` | cross_community | 7 |
| `EnsureGatewayStarted → Cleanup` | cross_community | 6 |
| `SendWithToken → Get` | cross_community | 5 |
| `EnsureGatewayOnline → ResolveOnlineWaiters` | cross_community | 5 |
| `EnsureGatewayOnline → Deferred` | cross_community | 5 |
| `EnsureGatewayOnline → SleepImpl` | cross_community | 5 |
| `RunService → CreateIlinkSessionStore` | cross_community | 5 |
| `RunService → ValidateBaseUrl` | cross_community | 5 |
| `RunService → InitialContext` | cross_community | 5 |
| `RunWatcher → CreateIlinkSessionStore` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Tests | 2 calls |
| Cluster_39 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "createWechatTestAccountConfigStore"})` — see callers and callees
2. `gitnexus_query({query: "adapters"})` — find related execution flows
3. Read key files listed above for implementation details
