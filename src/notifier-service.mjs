import http from "node:http";

import { createIlinkAdapter } from "./adapters/ilink.mjs";
import { createDryRunAdapter } from "./adapters/dry-run.mjs";
import { createEvent, isTerminalOutcome } from "./event.mjs";
import { Outbox } from "./outbox.mjs";

const MAX_EVENT_BYTES = 64 * 1024;

function isLoopbackRemote(address) {
  if (!address) return false;
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function sendJson(response, statusCode, value) {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store"
  });
  response.end(body);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_EVENT_BYTES) {
        reject(Object.assign(new Error("Event is too large."), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.once("error", reject);
    request.once("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Request body must be JSON."), { statusCode: 400 }));
      }
    });
  });
}

function selectAdapter(config) {
  if (config.adapter === "ilink") return createIlinkAdapter(config);
  return createDryRunAdapter(config);
}

export function createNotifierService(config, { adapter = selectAdapter(config), outbox = new Outbox(config) } = {}) {
  let server = null;
  let timer = null;
  let closing = false;

  async function submit(rawEvent) {
    const event = createEvent(rawEvent);
    if (isTerminalOutcome(event)) {
      await outbox.supersedePending(event.correlationKey, ["turn_stopped", "turn_finished", "turn_interrupted", "task_error"]);
    }
    const notBefore = event.kind === "turn_stopped" && config.stopHoldMs > 0
      ? new Date(Date.now() + config.stopHoldMs)
      : null;
    return outbox.enqueue(event, { notBefore });
  }

  async function tick() {
    try {
      await outbox.processDue(adapter);
    } catch (error) {
      // The queue already retains dispatch failures. Keep the local service alive.
      process.stderr.write(`[codex-notify] dispatch loop: ${String(error.message || error)}\n`);
    }
  }

  async function start({ listen = true } = {}) {
    await outbox.init();
    await outbox.importIncoming();
    await adapter.start?.();

    if (listen) {
      server = http.createServer(async (request, response) => {
      if (!isLoopbackRemote(request.socket.remoteAddress)) {
        sendJson(response, 403, { error: "loopback only" });
        return;
      }
      const url = new URL(request.url, "http://localhost");
      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { ok: true, adapter: adapter.name, ...(await outbox.counts()) });
        return;
      }
      if (request.method !== "POST" || url.pathname !== "/v1/events") {
        sendJson(response, 404, { error: "not found" });
        return;
      }
      try {
        const result = await submit(await readJsonBody(request));
        sendJson(response, result.accepted ? 202 : 200, { ok: true, ...result });
      } catch (error) {
        sendJson(response, error.statusCode || 400, { error: "invalid event" });
      }
      });

      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.servicePort, config.serviceHost, resolve);
      });
    }
    timer = setInterval(tick, config.pollIntervalMs);
    // Keep the timer ref'd when running without an HTTP listener (watch mode)
    // so the process stays alive. When a listener is open it already holds a
    // ref on the event loop, so unref is safe there.
    if (listen) timer.unref();
    await tick();
    return api;
  }

  async function close() {
    closing = true;
    if (timer) clearInterval(timer);
    timer = null;
    if (server) {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      server = null;
    }
    await adapter.close?.();
  }

  const api = Object.freeze({
    start,
    close,
    submit,
    tick,
    get outbox() {
      return outbox;
    },
    get isClosing() {
      return closing;
    }
  });
  return api;
}
