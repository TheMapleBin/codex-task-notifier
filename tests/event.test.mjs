import assert from "node:assert/strict";
import test from "node:test";

import { createEvent, FINAL_OUTPUT_MAX_LENGTH, formatEventForDelivery, TASK_NAME_MAX_LENGTH } from "../src/event.mjs";

test("event contract keeps only approved metadata", () => {
  const event = createEvent({
    source: "api-proxy",
    kind: "api_error",
    workspace: "C:\\private\\firmware-project\\",
    requestId: "request-123",
    httpStatus: 503,
    errorKind: "http_status",
    durationMs: 65_000,
    errorCode: "private-prompt",
    authorization: "secret",
    prompt: "private prompt",
    responseBody: "private response"
  });

  assert.equal(event.workspace, "firmware-project");
  assert.equal(event.httpStatus, 503);
  assert.equal(event.durationMs, 65_000);
  assert.equal(event.errorCode, null);
  assert.equal("authorization" in event, false);
  assert.equal("prompt" in event, false);
  assert.equal("responseBody" in event, false);
  assert.match(formatEventForDelivery(event), /HTTP: 503/);
  assert.match(formatEventForDelivery(event), /耗时: 1分5秒/);
  assert.match(formatEventForDelivery(event), /来源: api-proxy/);
  assert.doesNotMatch(formatEventForDelivery(event), /private|secret/i);
});

test("event contract formats a sanitized task name and uses a safe fallback", () => {
  const named = createEvent({
    source: "session-watcher",
    kind: "turn_finished",
    turnId: "turn-named",
    taskName: `发布检查 token=private-value ${"x".repeat(200)}`
  });
  assert.ok(Array.from(named.taskName).length <= TASK_NAME_MAX_LENGTH);
  assert.doesNotMatch(named.taskName, /private-value/);
  assert.match(formatEventForDelivery(named), /名称: 发布检查 token=\[REDACTED\]/);

  const unnamed = createEvent({ source: "session-watcher", kind: "turn_finished", turnId: "turn-unnamed" });
  assert.match(formatEventForDelivery(unnamed), /名称: 未命名任务/);
});

test("event contract rejects unsupported sources and errors", () => {
  assert.throws(() => createEvent({ source: "webhook", kind: "api_error" }), /Unsupported event source/);
  assert.throws(() => createEvent({ source: "api-proxy", kind: "api_error", errorKind: "raw_message" }), /Unsupported errorKind/);
});

test("event contract sanitizes and truncates the final assistant output", () => {
  const event = createEvent({
    source: "session-watcher",
    kind: "turn_finished",
    turnId: "turn-output",
    finalOutput: `第一行\r\nAuthorization: Bearer secret-value\napi_key=sk-1234567890abcdef\nCookie: session=private\u0000\n${"x".repeat(2_000)}`,
    prompt: "must not survive",
    responseBody: "must not survive either"
  });

  assert.equal(Array.from(event.finalOutput).length, FINAL_OUTPUT_MAX_LENGTH);
  assert.match(event.finalOutput, /^第一行\nAuthorization: \[REDACTED\]/);
  assert.match(event.finalOutput, /api_key=\[REDACTED\]/);
  assert.match(event.finalOutput, /Cookie: \[REDACTED\]/);
  assert.doesNotMatch(event.finalOutput, /secret-value|sk-1234567890abcdef|session=private|\u0000/);
  assert.equal("prompt" in event, false);
  assert.equal("responseBody" in event, false);

  const formatted = formatEventForDelivery(event);
  assert.match(formatted, /输出:\n第一行\nAuthorization:/);
});

test("event contract removes internal memory citations from final assistant output", () => {
  const event = createEvent({
    source: "session-watcher",
    kind: "turn_finished",
    turnId: "turn-internal-metadata",
    finalOutput: `用户可见结论。\n\n<oai-mem-citation>\n<citation_entries>\nMEMORY.md:1-2|note=[internal]\n</citation_entries>\n<rollout_ids>\ninternal-id\n</rollout_ids>\n</oai-mem-citation>`
  });

  assert.equal(event.finalOutput, "用户可见结论。");
  assert.doesNotMatch(formatEventForDelivery(event), /oai-mem-citation|MEMORY\.md|rollout_ids/);
});

test("event contract preserves unrelated XML-like text", () => {
  const event = createEvent({
    source: "session-watcher",
    kind: "turn_finished",
    turnId: "turn-user-markup",
    finalOutput: "保留 <details>普通内容</details>。"
  });
  assert.equal(event.finalOutput, "保留 <details>普通内容</details>。");
});

test("delivery omits the output section when no assistant output exists", () => {
  const event = createEvent({ source: "session-watcher", kind: "task_error", turnId: "turn-error" });
  assert.doesNotMatch(formatEventForDelivery(event), /输出:/);
});
