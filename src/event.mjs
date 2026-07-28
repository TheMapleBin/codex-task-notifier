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

export const FINAL_OUTPUT_MAX_LENGTH = 2_400;
export const TASK_NAME_MAX_LENGTH = 120;

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

function redactSensitiveText(value) {
  return value
    .replace(/\b(authorization|cookie)(\s*:\s*)[^\n]*/gi, "$1$2[REDACTED]")
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+\/-]+=*/gi, "$1 [REDACTED]")
    .replace(/\b(sk-[A-Za-z0-9_-]{10,})\b/g, "[REDACTED]")
    .replace(/\b(eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,})\b/g, "[REDACTED]")
    .replace(
      /(\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|context[_-]?token|token|password|secret)\b\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;\n]+)/gi,
      "$1[REDACTED]"
    );
}

function stripInternalMetadata(value) {
  const withoutCompleteBlocks = String(value)
    .replace(/<oai-mem-citation\b[^>]*>[\s\S]*?<\/oai-mem-citation\s*>/gi, "")
    .replace(/&lt;oai-mem-citation\b[\s\S]*?&lt;\/oai-mem-citation\s*&gt;/gi, "");
  const orphanMarkers = [
    /<\s*oai-mem-citation\b/i,
    /<\s*citation_entries\s*>/i,
    /<\s*rollout_ids\s*>/i,
    /&lt;\s*oai-mem-citation\b/i,
    /&lt;\s*citation_entries\s*&gt;/i,
    /&lt;\s*rollout_ids\s*&gt;/i,
    /(?:^|\n)\s*MEMORY\.md:\d+(?:-\d+)?\|note=\[/im,
    /(?:^|\n)\s*(?:citation_entries|rollout_ids)\s*:?[ \t]*(?:\n|$)/im
  ];
  let cutoff = withoutCompleteBlocks.length;
  for (const marker of orphanMarkers) {
    const match = marker.exec(withoutCompleteBlocks);
    if (match && match.index < cutoff) cutoff = match.index;
  }
  return withoutCompleteBlocks.slice(0, cutoff);
}

function safeFinalOutput(value) {
  if (value == null) return null;
  const withoutInternalMetadata = stripInternalMetadata(value);
  const normalized = redactSensitiveText(withoutInternalMetadata
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""))
    .trim();
  if (!normalized) return null;
  const characters = Array.from(normalized);
  if (characters.length <= FINAL_OUTPUT_MAX_LENGTH) return normalized;
  return `${characters.slice(0, FINAL_OUTPUT_MAX_LENGTH - 3).join("")}...`;
}

function safeTaskName(value) {
  const cleaned = cleanText(value, TASK_NAME_MAX_LENGTH * 4);
  if (!cleaned) return null;
  const characters = Array.from(redactSensitiveText(cleaned));
  return characters.slice(0, TASK_NAME_MAX_LENGTH).join("");
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

function durationMs(value) {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2_592_000_000) {
    throw new Error("durationMs must be between 0 and 2592000000.");
  }
  return parsed;
}

function safeErrorCode(value) {
  const normalized = cleanText(value, 40);
  if (!normalized) return null;
  const upper = normalized.toUpperCase();
  if ([
    "USER_INTERRUPTED",
    "INTERRUPTED",
    "ABORTED",
    "CANCELLED",
    "CODEX_TASK_ERROR",
    "CODEX_SPAWN_FAILED",
    "OTHER",
    "UPSTREAM_CONNECTION_FAILED",
    "UPSTREAM_TIMEOUT",
    "SIGHUP",
    "SIGINT",
    "SIGTERM"
  ].includes(upper)) return upper;
  if (/^(EXIT_\d{1,3}|HTTP_[45]\d{2})$/.test(upper)) return upper;
  return null;
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
    taskName: safeTaskName(input.taskName),
    surface: ["desktop", "cli", "unknown"].includes(input.surface) ? input.surface : "unknown",
    turnId,
    requestId,
    correlationKey,
    httpStatus,
    errorKind,
    errorCode: safeErrorCode(input.errorCode),
    durationMs: durationMs(input.durationMs),
    finalOutput: safeFinalOutput(input.finalOutput)
  });
}

export function isTerminalOutcome(event) {
  return ["turn_finished", "turn_interrupted", "task_error"].includes(event.kind);
}

export function formatEventForDelivery(event) {
  const titles = {
    turn_stopped: "已停止",
    turn_finished: "已完成",
    turn_interrupted: "已中断",
    api_error: "API 错误",
    task_error: "执行失败",
    delivery_error: "投递失败"
  };
  const lines = ["[Codex]", `来源: ${event.source}`];
  if (event.workspace) lines.push(`项目: ${event.workspace}`);
  lines.push(`名称: ${event.taskName || "未命名任务"}`);
  lines.push(`状态: ${titles[event.kind] || "状态更新"}`);
  if (event.durationMs != null) lines.push(`耗时: ${formatDuration(event.durationMs)}`);
  if (event.turnId) lines.push(`任务: ${event.turnId.slice(-12)}`);
  if (event.httpStatus) lines.push(`HTTP: ${event.httpStatus}`);
  if (event.errorKind) lines.push(`错误类型: ${event.errorKind}`);
  if (event.finalOutput) lines.push("输出:", event.finalOutput);
  return lines.join("\n");
}

function formatDuration(value) {
  if (value < 1_000) return "<1秒";
  const seconds = Math.floor(value / 1_000);
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours}小时`);
  if (minutes) parts.push(`${minutes}分`);
  if (remainingSeconds || parts.length === 0) parts.push(`${remainingSeconds}秒`);
  return parts.join("");
}
