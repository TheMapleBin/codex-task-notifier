import assert from "node:assert/strict";
import test from "node:test";

import { createNotifierService } from "../src/notifier-service.mjs";
import { httpRequest, temporaryDirectory, testConfig, unusedPort } from "./helpers.mjs";

test("notification service accepts loopback events and dispatches them", async () => {
  const home = await temporaryDirectory();
  const servicePort = await unusedPort();
  const delivered = [];
  const service = createNotifierService(testConfig(home, { servicePort }), {
    adapter: { name: "capture", send: async (event) => delivered.push(event) }
  });
  await service.start();
  try {
    const response = await httpRequest(`http://127.0.0.1:${servicePort}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "cli-wrapper", kind: "turn_finished", surface: "cli", turnId: "turn-service" })
    });
    assert.equal(response.statusCode, 202);
    await service.tick();
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].kind, "turn_finished");
    const health = await httpRequest(`http://127.0.0.1:${servicePort}/health`);
    assert.equal(health.statusCode, 200);
  } finally {
    await service.close();
  }
});
