import { bindQQBot } from "./qqbot-bind.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

try {
  const input = JSON.parse(await readStdin());
  const openId = await bindQQBot(input, {
    timeoutMs: Number.isInteger(input?.timeoutMs) ? input.timeoutMs : 300_000,
    onReady: () => process.stdout.write('{"state":"ready"}\n')
  });
  process.stdout.write(`${JSON.stringify({ ok: true, openId })}\n`);
} catch (error) {
  const code = typeof error?.code === "string" && /^QQBOT_BIND_[A-Z0-9_]{1,64}$/.test(error.code)
    ? error.code
    : "QQBOT_BIND_FAILED";
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}
