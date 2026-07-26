import crypto from "node:crypto";
import path from "node:path";

export const EVENT_SOURCES = new Set(["stop-hook", "cli-wrapper", "api-proxy", "session-watcher"]);
export const EVENT_KINDS = new Set([
  "turn_stopped",
  "turn_finished",
  "turn_interrupted",
  "api_error",
  "task_error",
  "delivery_error"
]);
export const ERROR_KINDS = new Set([
  "http_status",
  "connection_failed",
  "timeout",
  "exit_code",
  "stream_error",
  "unknown"
]);

const DEFAULT_SEVERITY = {
  turn_stopped: "info",
  turn_finished: "info",
  turn_interrupted: "warning",
  api_error: "error",
  task_error: "error",
  delivery_error: "warning"
};

function cleanText(value, maxLength) {
  if (value == null) {
    return null;
  }
  const normalized = String(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function asIsoTimestamp(value) {
  if (value == null) {
    return new Date().toISOString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("occurredAt must be an ISO-8601 timestamp.");
  }
  return date.toISOString();
}

function workspaceBaseName(value) {
  const cleaned = cleanText(value, 500);
  if (!cleaned) {
    return null;
  }
  return cleanText(path.basename(cleaned.replace(/[\\/]+$/, "")), 120) || null;
}

function idPart(value) {
  return cleanText(value, 160)?.replace(/[^a-zA-Z0-9_.:-]/g, "_") || null;
}

function computeId({ source, kind, correlationKey, occurredAt }) {
  const stableInput = correlationKey || `${source}:${kind}:${occurredAt}`;
  const digest = crypto.createHash("sha256").update(stableInput).digest("hex").slice(0, 24);
  return `${source}:${kind}:${digest}`;
}

function severityFor(kind, value) {
  if (value == null) {
    return DEFAULT_SEVERITY[kind];
  }
  if (!["info", "warning", "error"].includes(value)) {
    throw new Error("severity must be info, warning, or error.");
  }
  return value;
}

export function createEvent(input) {
  if (!input || typeof input !== "object") {
    throw new Error("An event object is required.");
  }

  const source = cleanText(input.source, 40);
  const kind = cleanText(input.kind, 40);
  if (!EVENT_SOURCES.has(source)) {
    throw new Error("Unsupported event source.");
  }
  if (!EVENT_KINDS.has(kind)) {
    throw new Error("Unsupported event kind.");
  }

  const httpStatus = input.httpStatus == null ? null : Number(input.httpStatus);
  if (httpStatus != null && (!Number.isInteger(httpStatus) || httpStatus < 100 || httpStatus > 599)) {
    throw new Error("httpStatus must be an HTTP status code.");
  }

  const errorKind = cleanText(input.errorKind, 40);
  if (errorKind != null && !ERROR_KINDS.has(errorKind)) {
    throw new Error("Unsupported errorKind.");
  }

  const occurredAt = asIsoTimestamp(input.occurredAt);
  const turnId = idPart(input.turnId);
  const requestId = idPart(input.requestId);
  const correlationKey = idPart(input.correlationKey) || (turnId ? `turn:${turnId}` : requestId ? `request:${requestId}` : null);
  const id = idPart(input.id) || computeId({ source, kind, correlationKey, occurredAt });

  return Object.freeze({
    schemaVersion: 1,
    id,
    source,
    kind,
    severity: severityFor(kind, cleanText(input.severity, 16)),
    occurredAt,
    workspace: workspaceBaseName(input.workspace),
    surface: ["desktop", "cli", "unknown"].includes(input.surface) ? input.surface : "unknown",
    turnId,
    requestId,
    correlationKey,
    httpStatus,
    errorKind,
    errorCode: cleanText(input.errorCode, 120)
  });
}

export function isTerminalOutcome(event) {
  return ["turn_finished", "turn_interrupted", "task_error"].includes(event.kind);
}

export function formatEventForDelivery(event) {
  const titles = {
    turn_stopped: "任务已停止，等待结果确认",
    turn_finished: "任务已完成",
    turn_interrupted: "任务被中断",
    api_error: "API 或网关错误",
    task_error: "任务执行失败",
    delivery_error: "通知投递失败"
  };
  const lines = [`[Codex] ${titles[event.kind] || "状态更新"}`];
  if (event.surface !== "unknown") lines.push(`端: ${event.surface}`);
  if (event.workspace) lines.push(`项目: ${event.workspace}`);
  if (event.httpStatus) lines.push(`HTTP: ${event.httpStatus}`);
  if (event.errorKind) lines.push(`错误类型: ${event.errorKind}`);
  if (event.errorCode) lines.push(`错误码: ${event.errorCode}`);
  if (event.turnId) lines.push(`任务: ${event.turnId.slice(-12)}`);
  lines.push(`时间: ${event.occurredAt}`);
  return lines.join("\n");
}
