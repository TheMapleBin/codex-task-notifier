import { createApiProxy } from "./api-proxy.mjs";
import { loadConfig } from "./config.mjs";
import { sendEventToLocalService } from "./event-client.mjs";
import { createNotifierService } from "./notifier-service.mjs";
import { createSessionWatcher } from "./session-watcher.mjs";

function installShutdown(close) {
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    try {
      await close();
    } finally {
      process.exitCode = 0;
    }
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

async function runService(config) {
  const service = createNotifierService(config);
  await service.start();
  const resources = [service];

  if (config.apiProxyEnabled) {
    const proxy = createApiProxy(config, { onEvent: (event) => service.submit(event) });
    await proxy.start();
    resources.push(proxy);
  }
  if (config.watcherEnabled) {
    const watcher = createSessionWatcher({
      sessionsDir: config.sessionsDir,
      pollIntervalMs: config.pollIntervalMs,
      onEvent: (event) => service.submit(event)
    });
    await watcher.start();
    resources.push(watcher);
  }

  process.stdout.write(`[codex-notify] service listening on ${config.serviceHost}:${config.servicePort} (${config.adapter})\n`);
  installShutdown(async () => {
    for (const resource of resources.reverse()) await resource.close();
  });
}

async function runProxy(config) {
  const proxy = createApiProxy(config, { onEvent: (event) => sendEventToLocalService(config, event) });
  await proxy.start();
  process.stdout.write(`[codex-notify] proxy listening on ${config.serviceHost}:${config.proxyPort}\n`);
  installShutdown(() => proxy.close());
}

async function runWatcher(config) {
  const watcher = createSessionWatcher({
    sessionsDir: config.sessionsDir,
    pollIntervalMs: config.pollIntervalMs,
    onEvent: (event) => sendEventToLocalService(config, event)
  });
  await watcher.start();
  process.stdout.write(`[codex-notify] watching ${config.sessionsDir}\n`);
  installShutdown(() => watcher.close());
}

async function main() {
  const config = loadConfig();
  const command = process.argv[2] || "service";
  if (command === "service") return runService(config);
  if (command === "proxy") return runProxy(config);
  if (command === "watch") return runWatcher(config);
  throw new Error(`Unknown command: ${command}. Use service, proxy, or watch.`);
}

main().catch((error) => {
  process.stderr.write(`[codex-notify] ${String(error.message || error)}\n`);
  process.exitCode = 1;
});
