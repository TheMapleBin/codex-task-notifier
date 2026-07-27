import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

export async function temporaryDirectory(prefix = "codex-notify-") {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function unusedPort() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

export function testConfig(home, overrides = {}) {
  return {
    home,
    serviceHost: "127.0.0.1",
    servicePort: 17080,
    proxyPort: 15722,
    upstream: new URL("http://127.0.0.1:15721"),
    upstreamTimeoutMs: 1_000,
    adapter: "dry-run",
    openclaw: {
      command: "openclaw",
      channel: "openclaw-weixin",
      account: "test-account",
      target: "test-peer@test-account",
      timeoutMs: 1_000
    },
    retryBaseMs: 1,
    retryMaxMs: 10,
    maxAttempts: 3,
    pollIntervalMs: 10,
    stopHoldMs: 0,
    sessionsDir: path.join(home, "sessions"),
    watcherEnabled: false,
    apiProxyEnabled: false,
    ...overrides
  };
}

export function httpRequest(url, { method = "GET", body = null, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.from(body);
    const request = http.request(url, {
      method,
      headers: {
        ...(payload ? { "content-length": payload.length } : {}),
        ...headers
      }
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        statusCode: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    request.once("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

export async function startHttpServer(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    server,
    port,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}
