import assert from "node:assert/strict";
import test from "node:test";

import { createApiProxy } from "../src/api-proxy.mjs";
import { httpRequest, startHttpServer, temporaryDirectory, testConfig, unusedPort } from "./helpers.mjs";

test("proxy preserves upstream 503 and emits a sanitized API event", async () => {
  const upstream = await startHttpServer((_request, response) => {
    response.writeHead(503, { "content-type": "application/json", "x-upstream": "test" });
    response.end('{"error":"provider unavailable"}');
  });
  const events = [];
  const proxyPort = await unusedPort();
  const config = testConfig(await temporaryDirectory(), {
    proxyPort,
    upstream: new URL(`http://127.0.0.1:${upstream.port}`)
  });
  const proxy = createApiProxy(config, { onEvent: async (event) => events.push(event) });
  await proxy.start();
  try {
    const response = await httpRequest(`http://127.0.0.1:${proxyPort}/v1/responses`, { method: "POST", body: "{}" });
    assert.equal(response.statusCode, 503);
    assert.equal(response.body, '{"error":"provider unavailable"}');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(events.length, 1);
    assert.equal(events[0].httpStatus, 503);
    assert.equal(events[0].errorCode, "HTTP_503");
  } finally {
    await proxy.close();
    await upstream.close();
  }
});

test("proxy reports an unreachable local upstream without exposing transport detail", async () => {
  const events = [];
  const proxyPort = await unusedPort();
  const unreachablePort = await unusedPort();
  const config = testConfig(await temporaryDirectory(), {
    proxyPort,
    upstream: new URL(`http://127.0.0.1:${unreachablePort}`)
  });
  const proxy = createApiProxy(config, { onEvent: async (event) => events.push(event) });
  await proxy.start();
  try {
    const response = await httpRequest(`http://127.0.0.1:${proxyPort}/v1/responses`, { method: "POST", body: "{}" });
    assert.equal(response.statusCode, 502);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(events[0].errorKind, "connection_failed");
    assert.equal(events[0].errorCode, "UPSTREAM_CONNECTION_FAILED");
  } finally {
    await proxy.close();
  }
});

test("proxy converts an upstream timeout into a sanitized 504 event", async () => {
  const upstream = await startHttpServer(() => {
    // Keep the connection open until the proxy-side timeout destroys it.
  });
  const events = [];
  const proxyPort = await unusedPort();
  const config = testConfig(await temporaryDirectory(), {
    proxyPort,
    upstream: new URL(`http://127.0.0.1:${upstream.port}`),
    upstreamTimeoutMs: 50
  });
  const proxy = createApiProxy(config, { onEvent: async (event) => events.push(event) });
  await proxy.start();
  try {
    const response = await httpRequest(`http://127.0.0.1:${proxyPort}/v1/responses`, { method: "POST", body: "{}" });
    assert.equal(response.statusCode, 504);
    assert.equal(response.body, '{"error":"upstream unavailable"}');
    assert.equal(events.length, 1);
    assert.equal(events[0].errorKind, "timeout");
    assert.equal(events[0].errorCode, "UPSTREAM_TIMEOUT");
  } finally {
    await proxy.close();
    await upstream.close();
  }
});
