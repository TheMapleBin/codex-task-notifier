# Pull request

## Summary

<!-- What does this change do, in one or two sentences? -->

## Motivation / linked issue

<!-- Why is this needed? Link the issue, e.g. "Closes #12". -->

## Type of change

<!-- Check all that apply. -->

- [ ] Bug fix (no behavior change beyond fixing the defect)
- [ ] New feature
- [ ] Documentation only
- [ ] Tests only
- [ ] Refactor / internal cleanup (no behavior change)
- [ ] Build, CI, or repository housekeeping

## Verification

Run both gates locally on Windows with Node.js >= 22.5 and paste the real output.
Do not describe the result — paste it.

`npm run check`:

```text
(paste output here)
```

`npm test`:

```text
(paste output here)
```

Manual verification (optional, describe what you exercised and how):

<!--
Never paste notification bodies, Codex prompts, assistant output, rollout JSONL
content, outbox records, tokens, OpenIDs, or user IDs. Describe behavior instead.
-->

## Checklist

- [ ] Tests were added or updated for the changed behavior (`tests/`, run with `npm test`).
- [ ] Documentation was updated where affected (`README.md`, `README.zh-CN.md`, `docs/`, `commands/README.md`, `CHANGELOG.md`).
- [ ] No new runtime dependencies. `package.json` still has no `dependencies` and no lockfile was added.
- [ ] No secrets in the diff: no tokens, AppID/AppSecret, OpenIDs, user IDs, cookies, QR material, Codex prompts, assistant output, rollout JSONL content, or outbox records.
- [ ] No second watcher, service, proxy, or scheduled task is introduced. `CodexWeChatNotifierLifecycle` remains the only schedule and exactly one watcher can run.
- [ ] Sanitizers and the 2400-character output cap are unchanged, or the change is covered by a new regression test.
- [ ] Credentials and session state stay DPAPI-encrypted, never written as plaintext and never passed on a command line.
- [ ] Subagent, review, and nested-agent terminal outcomes are still filtered out; only root user tasks notify.
- [ ] No unaccepted scenario is claimed as verified (controllable Desktop/API error, CLI non-zero/API error, user interruption, QQ Gateway/API offline recovery, full Windows cold-boot recovery).
