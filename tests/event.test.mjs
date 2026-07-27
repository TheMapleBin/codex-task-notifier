import assert from "node:assert/strict";
import test from "node:test";

import { createEvent, FINAL_OUTPUT_MAX_LENGTH, formatEventForDelivery } from "../src/event.mjs";

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

test("delivery omits the output section when no assistant output exists", () => {
  const event = createEvent({ source: "session-watcher", kind: "task_error", turnId: "turn-error" });
  assert.doesNotMatch(formatEventForDelivery(event), /输出:/);
});
