import assert from "node:assert/strict";
import test from "node:test";

import { JsonlParser } from "../src/cli-wrapper.mjs";

test("CLI JSONL parser accepts records split across arbitrary chunks", () => {
  const records = [];
  const parser = new JsonlParser((record) => records.push(record));
  parser.push(Buffer.from('{"type":"thread.'));
  parser.push(Buffer.from('started","thread_id":"abc"}\n{"type":"turn.completed"}'));
  parser.push(Buffer.from('\n'));
  parser.end();
  assert.deepEqual(records, [
    { type: "thread.started", thread_id: "abc" },
    { type: "turn.completed" }
  ]);
});
