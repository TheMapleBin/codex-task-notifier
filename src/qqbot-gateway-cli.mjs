import { createQQBotConfigStore } from "./qqbot-config.mjs";
import { createQQBotGateway } from "./qqbot-gateway.mjs";
import { createQQBotGatewayStatusStore } from "./qqbot-gateway-status.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (typeof value !== "string" || !value) throw new Error("QQBOT_GATEWAY_ARGUMENT_INVALID");
  return value;
}

function safeCode(error) {
  return typeof error?.code === "string" && /^QQBOT_GATEWAY_[A-Z0-9_]{1,64}$/.test(error.code)
    ? error.code
    : "QQBOT_GATEWAY_FAILED";
}

let gateway = null;

try {
  const configPath = option("--config-path");
  const statusPath = option("--status-path");
  if (!configPath || !statusPath) throw new Error("QQBOT_GATEWAY_ARGUMENT_INVALID");
  const configStore = createQQBotConfigStore({ configPath });
  const statusStore = createQQBotGatewayStatusStore({ statusPath });
  gateway = createQQBotGateway({
    credentials: () => configStore.read(),
    onStatus: (status) => statusStore.write(status)
  });
  const stop = () => gateway?.stop();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  const result = await gateway.run();
  if (result.state === "blocked") {
    process.stderr.write(`${result.code}\n`);
    process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`${safeCode(error)}\n`);
  process.exitCode = 1;
}
