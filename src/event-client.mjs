import http from "node:http";

import { serviceUrl } from "./config.mjs";
import { createEvent } from "./event.mjs";
import { Outbox } from "./outbox.mjs";

function postJson(url, value, timeoutMs) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(value));
    const request = http.request(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": body.length
        },
        timeout: timeoutMs
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks).toString("utf8") });
          } else {
            reject(new Error(`Local notifier returned HTTP ${response.statusCode}.`));
          }
        });
      }
    );
    request.once("timeout", () => request.destroy(new Error("Local notifier request timed out.")));
    request.once("error", reject);
    request.end(body);
  });
}

export async function sendEventToLocalService(config, rawEvent, { timeoutMs = 750, fallback = true } = {}) {
  const event = createEvent(rawEvent);
  try {
    await postJson(`${serviceUrl(config)}/v1/events`, event, timeoutMs);
    return { accepted: true, transport: "http", id: event.id };
  } catch (error) {
    if (!fallback) throw error;
    const outbox = new Outbox(config);
    await outbox.init();
    await outbox.stageIncoming(event);
    return { accepted: true, transport: "incoming-fallback", id: event.id, cause: String(error.message || error) };
  }
}
