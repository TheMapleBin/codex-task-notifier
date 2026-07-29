import { createQQBotAdapter } from "./adapters/qqbot.mjs";
import { createEvent } from "./event.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

try {
  const input = JSON.parse(await readStdin());
  const adapter = createQQBotAdapter(input.config);
  try {
    await adapter.start();
    const result = await adapter.send(createEvent(input.event));
    process.stdout.write(`${JSON.stringify({ ok: true, transport: result.transport, messageIdReceipt: Boolean(result.messageId) })}\n`);
  } finally {
    await adapter.close();
  }
} catch (error) {
  process.stderr.write(`${String(error.message || error)}\n`);
  process.exitCode = 1;
}
