import fs from "node:fs/promises";
import path from "node:path";

import { formatEventForDelivery } from "../event.mjs";

export function createDryRunAdapter(config) {
  const deliveriesFile = path.join(config.home, "dry-run-deliveries.jsonl");
  return Object.freeze({
    name: "dry-run",
    async send(event) {
      await fs.mkdir(config.home, { recursive: true });
      const delivery = {
        deliveredAt: new Date().toISOString(),
        adapter: "dry-run",
        event,
        message: formatEventForDelivery(event)
      };
      await fs.appendFile(deliveriesFile, `${JSON.stringify(delivery)}\n`, "utf8");
      return { adapter: "dry-run", file: deliveriesFile };
    }
  });
}
