# Security Policy

## Reporting a vulnerability

Use GitHub's private vulnerability reporting feature when it is available. Do not open a public issue containing credentials, message bodies, rollout contents, or local runtime state.

Include only the minimum reproduction steps and sanitized error codes. Never attach any of the following:

- QQ Bot AppSecret, access token, OpenID, or Gateway payload
- WeChat/iLink token, context token, user ID, cookie, or QR credential
- `*.dpapi.json` files from `%LOCALAPPDATA%\CodexWeChatNotifier`
- Codex prompts, assistant output, rollout JSONL, outbox records, or notification logs

Revoke affected platform credentials before sharing a sanitized report if exposure is suspected.

## Supported version

Security fixes are applied to the latest commit on `main`. This project is currently a Windows-focused local tool and has not published versioned releases.
