import assert from "node:assert/strict";
import test from "node:test";

import { createEvent, formatEventForDelivery } from "../src/event.mjs";

test("event contract keeps only approved metadata", () => {
  const event = createEvent({
    source: "api-proxy",
    kind: "api_error",
    workspace: "C:\\private\\firmware-project\\",
    requestId: "request-123",
    httpStatus: 503,
    errorKind: "http_status",
    authorization: "secret",
    prompt: "private prompt",
    responseBody: "private response"
  });

  assert.equal(event.workspace, "firmware-project");
  assert.equal(event.httpStatus, 503);
  assert.equal("authorization" in event, false);
  assert.equal("prompt" in event, false);
  assert.equal("responseBody" in event, false);
  assert.match(formatEventForDelivery(event), /HTTP: 503/);
  assert.doesNotMatch(formatEventForDelivery(event), /private|secret/i);
});

test("event contract rejects unsupported sources and errors", () => {
  assert.throws(() => createEvent({ source: "webhook", kind: "api_error" }), /Unsupported event source/);
  assert.throws(() => createEvent({ source: "api-proxy", kind: "api_error", errorKind: "raw_message" }), /Unsupported errorKind/);
});
