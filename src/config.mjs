import os from "node:os";
import path from "node:path";

const DEFAULT_SERVICE_HOST = "127.0.0.1";
const DEFAULT_SERVICE_PORT = 17080;
const DEFAULT_PROXY_PORT = 15722;
const DEFAULT_UPSTREAM = "http://127.0.0.1:15721";

function integerFromEnv(value, fallback, { min, max, name }) {
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function booleanFromEnv(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) {
    return false;
  }
  throw new Error(`Expected a boolean value, received ${value}.`);
}

export function isLoopbackHost(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function resolveDefaultHome(env) {
  const localAppData = env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(localAppData, "CodexOpenClawNotifier");
}

function resolveDefaultSessions(env) {
  const userProfile = env.USERPROFILE || os.homedir();
  return path.join(userProfile, ".codex", "sessions");
}

export function loadConfig(env = process.env) {
  const serviceHost = env.CODEX_NOTIFY_HOST || DEFAULT_SERVICE_HOST;
  if (!isLoopbackHost(serviceHost)) {
    throw new Error("CODEX_NOTIFY_HOST must be a loopback address.");
  }

  const upstream = new URL(env.CODEX_NOTIFY_UPSTREAM || DEFAULT_UPSTREAM);
  if (upstream.protocol !== "http:" && upstream.protocol !== "https:") {
    throw new Error("CODEX_NOTIFY_UPSTREAM must use HTTP or HTTPS.");
  }
  if (!isLoopbackHost(upstream.hostname)) {
    throw new Error("CODEX_NOTIFY_UPSTREAM must remain loopback-only.");
  }

  const adapter = env.CODEX_NOTIFY_ADAPTER || "dry-run";
  if (!["dry-run", "openclaw"].includes(adapter)) {
    throw new Error("CODEX_NOTIFY_ADAPTER must be dry-run or openclaw.");
  }

  const home = path.resolve(env.CODEX_NOTIFY_HOME || resolveDefaultHome(env));
  const retryBaseMs = integerFromEnv(env.CODEX_NOTIFY_RETRY_BASE_MS, 1_000, {
    min: 100,
    max: 3_600_000,
    name: "CODEX_NOTIFY_RETRY_BASE_MS"
  });

  return Object.freeze({
    home,
    serviceHost,
    servicePort: integerFromEnv(env.CODEX_NOTIFY_PORT, DEFAULT_SERVICE_PORT, {
      min: 1,
      max: 65_535,
      name: "CODEX_NOTIFY_PORT"
    }),
    proxyPort: integerFromEnv(env.CODEX_NOTIFY_PROXY_PORT, DEFAULT_PROXY_PORT, {
      min: 1,
      max: 65_535,
      name: "CODEX_NOTIFY_PROXY_PORT"
    }),
    upstream,
    upstreamTimeoutMs: integerFromEnv(env.CODEX_NOTIFY_UPSTREAM_TIMEOUT_MS, 120_000, {
      min: 1_000,
      max: 900_000,
      name: "CODEX_NOTIFY_UPSTREAM_TIMEOUT_MS"
    }),
    adapter,
    retryBaseMs,
    retryMaxMs: integerFromEnv(env.CODEX_NOTIFY_RETRY_MAX_MS, 1_800_000, {
      min: retryBaseMs,
      max: 86_400_000,
      name: "CODEX_NOTIFY_RETRY_MAX_MS"
    }),
    maxAttempts: integerFromEnv(env.CODEX_NOTIFY_MAX_ATTEMPTS, 12, {
      min: 1,
      max: 100,
      name: "CODEX_NOTIFY_MAX_ATTEMPTS"
    }),
    pollIntervalMs: integerFromEnv(env.CODEX_NOTIFY_POLL_MS, 500, {
      min: 100,
      max: 60_000,
      name: "CODEX_NOTIFY_POLL_MS"
    }),
    stopHoldMs: integerFromEnv(env.CODEX_NOTIFY_STOP_HOLD_MS, 2_500, {
      min: 0,
      max: 60_000,
      name: "CODEX_NOTIFY_STOP_HOLD_MS"
    }),
    sessionsDir: path.resolve(env.CODEX_NOTIFY_SESSIONS_DIR || resolveDefaultSessions(env)),
    watcherEnabled: booleanFromEnv(env.CODEX_NOTIFY_WATCHER_ENABLED, false),
    apiProxyEnabled: booleanFromEnv(env.CODEX_NOTIFY_PROXY_ENABLED, false)
  });
}

export function serviceUrl(config) {
  return `http://${config.serviceHost}:${config.servicePort}`;
}
