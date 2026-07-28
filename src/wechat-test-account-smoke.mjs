import { createWechatTestAccountAdapter } from "./adapters/wechat-test-account.mjs";
import { createEvent } from "./event.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

try {
  const input = JSON.parse(await readStdin());
  const adapter = createWechatTestAccountAdapter(input.config);
  const result = await adapter.send(createEvent(input.event));
  process.stdout.write(`${JSON.stringify({ ok: true, transport: result.transport })}\n`);
} catch (error) {
  process.stderr.write(`${String(error.message || error)}\n`);
  process.exitCode = 1;
}
