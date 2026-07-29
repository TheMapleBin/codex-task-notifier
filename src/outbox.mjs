import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { createEvent } from "./event.mjs";

function recordFileName(eventId) {
  return `${crypto.createHash("sha256").update(eventId).digest("hex")}.json`;
}

function nowIso() {
  return new Date().toISOString();
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listJsonFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(directory, entry.name));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    await fs.rename(temporaryPath, filePath);
    return true;
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    if (error.code === "EEXIST" || error.code === "EPERM") {
      return false;
    }
    throw error;
  }
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function replaceJson(filePath, value) {
  const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "wx" });
  await fs.rm(filePath, { force: true });
  await fs.rename(temporaryPath, filePath);
}

function retryDelayMs(record, config) {
  const exponent = Math.max(0, record.attempts - 1);
  return Math.min(config.retryMaxMs, config.retryBaseMs * 2 ** exponent);
}

const CONTEXT_BLOCKED_CODES = new Set(["ILINK_CONTEXT_REQUIRED", "ILINK_CONTEXT_EXPIRED"]);
const CONTEXT_BLOCKED_MESSAGES = new Set([
  "iLink has no active WeChat conversation; send the bot one message first.",
  "iLink conversation context expired; send the bot one message to refresh it."
]);

function isContextBlockedError(error) {
  return CONTEXT_BLOCKED_CODES.has(error?.code) || CONTEXT_BLOCKED_MESSAGES.has(String(error?.message || error));
}

function isContextBlockedRecord(record) {
  return CONTEXT_BLOCKED_CODES.has(record?.lastErrorCode) || CONTEXT_BLOCKED_MESSAGES.has(record?.lastError);
}

function safeErrorCode(error) {
  return typeof error?.code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code) ? error.code : null;
}

function retryDelayForError(record, config, error) {
  const retryAfterMs = Number(error?.retryAfterMs);
  if (Number.isInteger(retryAfterMs) && retryAfterMs >= 1_000) {
    return Math.min(config.retryMaxMs, retryAfterMs);
  }
  return retryDelayMs(record, config);
}

function belongsToActiveTransport(record, activeTransport) {
  // Records written before transport pinning existed were all created while
  // production used iLink. Keep that narrow compatibility path so an iLink
  // restart can still drain them, but never replay them through a newly chosen
  // transport such as QQ Bot.
  if (typeof record?.transport !== "string" || !record.transport) {
    return activeTransport === "ilink";
  }
  return record.transport === activeTransport;
}

export class Outbox {
  constructor(config) {
    this.config = config;
    this.root = path.join(config.home, "outbox");
    this.pendingDirectory = path.join(this.root, "pending");
    this.deliveredDirectory = path.join(this.root, "delivered");
    this.failedDirectory = path.join(this.root, "failed");
    this.incomingDirectory = path.join(config.home, "incoming");
    this.processing = null;
  }

  async init() {
    await Promise.all([
      fs.mkdir(this.pendingDirectory, { recursive: true }),
      fs.mkdir(this.deliveredDirectory, { recursive: true }),
      fs.mkdir(this.failedDirectory, { recursive: true }),
      fs.mkdir(this.incomingDirectory, { recursive: true })
    ]);
  }

  async enqueue(event, { notBefore = null } = {}) {
    const normalizedEvent = createEvent(event);
    const fileName = recordFileName(normalizedEvent.id);
    const destinations = [
      path.join(this.pendingDirectory, fileName),
      path.join(this.deliveredDirectory, fileName),
      path.join(this.failedDirectory, fileName)
    ];
    if ((await Promise.all(destinations.map(exists))).some(Boolean)) {
      return { accepted: false, reason: "duplicate", id: normalizedEvent.id };
    }

    const record = {
      schemaVersion: 2,
      transport: this.config.adapter,
      event: normalizedEvent,
      createdAt: nowIso(),
      attempts: 0,
      nextAttemptAt: (notBefore || new Date()).toISOString(),
      lastError: null
    };
    const written = await writeJsonAtomic(destinations[0], record);
    return { accepted: written, reason: written ? "queued" : "duplicate", id: normalizedEvent.id };
  }

  async stageIncoming(rawEvent) {
    await fs.mkdir(this.incomingDirectory, { recursive: true });
    const filePath = path.join(this.incomingDirectory, `${crypto.randomUUID()}.json`);
    await writeJsonAtomic(filePath, rawEvent);
    return filePath;
  }

  async importIncoming() {
    let imported = 0;
    for (const filePath of await listJsonFiles(this.incomingDirectory)) {
      try {
        const rawEvent = await readJson(filePath);
        await this.enqueue(createEvent(rawEvent));
        await fs.rm(filePath, { force: true });
        imported += 1;
      } catch {
        // Incoming files are untrusted local fallback input. Drop malformed data
        // rather than preserving a possible secret in a diagnostic artifact.
        await fs.rm(filePath, { force: true });
      }
    }
    return imported;
  }

  async supersedePending(correlationKey, kinds = ["turn_stopped"]) {
    if (!correlationKey) return 0;
    let removed = 0;
    for (const filePath of await listJsonFiles(this.pendingDirectory)) {
      try {
        const record = await readJson(filePath);
        if (record.event?.correlationKey === correlationKey && kinds.includes(record.event?.kind)) {
          await fs.rm(filePath, { force: true });
          removed += 1;
        }
      } catch {
        // A malformed pending file cannot be safely dispatched. Move it aside.
        await this.#moveToFailed(filePath, { malformed: true });
      }
    }
    return removed;
  }

  async wakeContextPending(now = new Date()) {
    const nextAttemptAt = now.toISOString();
    let woken = 0;
    for (const filePath of await listJsonFiles(this.pendingDirectory)) {
      try {
        const record = await readJson(filePath);
        if (!belongsToActiveTransport(record, this.config.adapter)) continue;
        if (!isContextBlockedRecord(record)) continue;
        if (new Date(record.nextAttemptAt).getTime() <= now.getTime()) continue;
        await replaceJson(filePath, { ...record, nextAttemptAt });
        woken += 1;
      } catch {
        await this.#moveToFailed(filePath, { malformed: true });
      }
    }
    return woken;
  }

  async processDue(adapter, now = new Date()) {
    if (this.processing) return this.processing;
    this.processing = this.#processDue(adapter, now).finally(() => {
      this.processing = null;
    });
    return this.processing;
  }

  async #processDue(adapter, now) {
    await this.importIncoming();
    let delivered = 0;
    for (const filePath of await listJsonFiles(this.pendingDirectory)) {
      let record;
      try {
        record = await readJson(filePath);
        record.event = createEvent(record.event);
      } catch {
        await this.#moveToFailed(filePath, { malformed: true });
        continue;
      }

      if (!belongsToActiveTransport(record, this.config.adapter)) continue;

      if (new Date(record.nextAttemptAt).getTime() > now.getTime()) continue;
      if (record.attempts >= this.config.maxAttempts) {
        await this.#moveToFailed(filePath, { ...record, terminalReason: "max_attempts" });
        continue;
      }

      try {
        const result = await adapter.send(record.event);
        const deliveredRecord = {
          ...record,
          deliveredAt: nowIso(),
          delivery: result ?? null
        };
        await this.#move(filePath, path.join(this.deliveredDirectory, path.basename(filePath)), deliveredRecord);
        delivered += 1;
      } catch (error) {
        const contextBlocked = isContextBlockedError(error);
        const attempts = contextBlocked ? record.attempts : record.attempts + 1;
        const updated = {
          ...record,
          attempts,
          nextAttemptAt: new Date(now.getTime() + (contextBlocked ? this.config.retryMaxMs : retryDelayForError({ ...record, attempts }, this.config, error))).toISOString(),
          lastErrorCode: safeErrorCode(error),
          lastError: String(error?.message || error).slice(0, 160)
        };
        if (error?.retryable === false) {
          await this.#moveToFailed(filePath, { ...updated, terminalReason: "non_retryable" });
          continue;
        }
        await replaceJson(filePath, updated);
      }
    }
    return delivered;
  }

  async counts() {
    const [pending, delivered, failed, incoming] = await Promise.all([
      listJsonFiles(this.pendingDirectory),
      listJsonFiles(this.deliveredDirectory),
      listJsonFiles(this.failedDirectory),
      listJsonFiles(this.incomingDirectory)
    ]);
    return { pending: pending.length, delivered: delivered.length, failed: failed.length, incoming: incoming.length };
  }

  async #moveToFailed(filePath, record) {
    await this.#move(filePath, path.join(this.failedDirectory, path.basename(filePath)), record);
  }

  async #move(sourcePath, destinationPath, value) {
    if (value !== undefined) {
      const temporaryPath = `${destinationPath}.${crypto.randomUUID()}.tmp`;
      await fs.writeFile(temporaryPath, `${JSON.stringify(value)}\n`, "utf8");
      await fs.rm(destinationPath, { force: true });
      await fs.rename(temporaryPath, destinationPath);
      await fs.rm(sourcePath, { force: true });
      return;
    }
    await fs.rename(sourcePath, destinationPath);
  }
}
