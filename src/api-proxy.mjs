import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";

import { createEvent } from "./event.mjs";

function isLoopbackRemote(address) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function isTimeout(error) {
  return error?.code === "ETIMEDOUT" || error?.code === "ESOCKETTIMEDOUT";
}

function joinUpstreamUrl(upstream, requestUrl) {
  const incoming = new URL(requestUrl, "http://loopback.invalid");
  const basePath = upstream.pathname.replace(/\/$/, "");
  return new URL(`${basePath}${incoming.pathname}${incoming.search}`, upstream);
}

function sendProxyError(response, statusCode) {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  const body = Buffer.from(JSON.stringify({ error: "upstream unavailable" }));
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store"
  });
  response.end(body);
}

export function createApiProxy(config, { onEvent = async () => {} } = {}) {
  let server = null;

  function report(eventInput) {
    const event = createEvent(eventInput);
    Promise.resolve(onEvent(event)).catch((error) => {
      process.stderr.write(`[codex-notify] event enqueue from proxy failed: ${String(error.message || error)}\n`);
    });
  }

  function handler(request, response) {
    if (!isLoopbackRemote(request.socket.remoteAddress)) {
      response.writeHead(403, { "content-type": "application/json" });
      response.end('{"error":"loopback only"}');
      return;
    }

    const requestId = crypto.randomUUID();
    const target = joinUpstreamUrl(config.upstream, request.url || "/");
    const transport = target.protocol === "https:" ? https : http;
    const headers = { ...request.headers, host: target.host };
    const upstreamRequest = transport.request(
      target,
      {
        method: request.method,
        headers
      },
      (upstreamResponse) => {
        const statusCode = upstreamResponse.statusCode || 502;
        response.writeHead(statusCode, upstreamResponse.headers);
        upstreamResponse.pipe(response);
        if (statusCode >= 400) {
          report({
            source: "api-proxy",
            kind: "api_error",
            severity: statusCode >= 500 ? "error" : "warning",
            occurredAt: new Date().toISOString(),
            surface: "unknown",
            requestId,
            httpStatus: statusCode,
            errorKind: "http_status",
            errorCode: `HTTP_${statusCode}`
          });
        }
      }
    );

    upstreamRequest.setTimeout(config.upstreamTimeoutMs, () => {
      const error = new Error("Upstream request timed out.");
      error.code = "ETIMEDOUT";
      upstreamRequest.destroy(error);
    });
    upstreamRequest.once("error", (error) => {
      const timedOut = isTimeout(error);
      report({
        source: "api-proxy",
        kind: "api_error",
        severity: "error",
        occurredAt: new Date().toISOString(),
        surface: "unknown",
        requestId,
        httpStatus: timedOut ? 504 : 502,
        errorKind: timedOut ? "timeout" : "connection_failed",
        errorCode: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_CONNECTION_FAILED"
      });
      sendProxyError(response, timedOut ? 504 : 502);
    });
    request.once("error", () => upstreamRequest.destroy());
    request.pipe(upstreamRequest);
  }

  async function start() {
    server = http.createServer(handler);
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.proxyPort, config.serviceHost, resolve);
    });
    return api;
  }

  async function close() {
    if (!server) return;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    server = null;
  }

  const api = Object.freeze({
    start,
    close,
    get address() {
      return server?.address() || null;
    }
  });
  return api;
}
