import fs from "node:fs/promises";
import path from "node:path";

const STATES = new Set(["starting", "connecting", "online", "backoff", "blocked", "stopped"]);
const ACTIVE_MESSAGING = new Set(["unknown", "allowed", "rejected"]);
const CODE_PATTERN = /^QQBOT_GATEWAY_[A-Z0-9_]{1,64}$/;

function normalizedTimestamp(value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return value;
}

function normalize(value) {
  if (!value || value.schemaVersion !== 1) return null;
  if (!STATES.has(value.state) || !ACTIVE_MESSAGING.has(value.activeMessaging)) return null;
  const updatedAt = normalizedTimestamp(value.updatedAt);
  if (!updatedAt) return null;
  const code = typeof value.code === "string" && CODE_PATTERN.test(value.code) ? value.code : null;
  return Object.freeze({
    schemaVersion: 1,
    state: value.state,
    activeMessaging: value.activeMessaging,
    updatedAt,
    code
  });
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, { encoding: "utf8", mode: 0o600 });
  await fs.rm(filePath, { force: true });
  await fs.rename(temporary, filePath);
}

export function createQQBotGatewayStatusStore({ statusPath }) {
  if (typeof statusPath !== "string" || !statusPath) {
    throw new Error("QQ Bot Gateway status path is required.");
  }
  const resolvedPath = path.resolve(statusPath);
  let writes = Promise.resolve();

  return Object.freeze({
    async read() {
      try {
        return normalize(JSON.parse(await fs.readFile(resolvedPath, "utf8")));
      } catch {
        return null;
      }
    },
    async write(value) {
      const status = normalize(value);
      if (!status) throw new Error("QQ Bot Gateway status is invalid.");
      writes = writes.catch(() => {}).then(() => writeJsonAtomic(resolvedPath, status));
      return writes;
    }
  });
}
