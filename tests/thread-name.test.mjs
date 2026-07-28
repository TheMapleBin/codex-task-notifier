import assert from "node:assert/strict";
import test from "node:test";

import { selectSafeThreadName } from "../src/thread-name.mjs";

test("thread name resolver prefers an explicit user-visible name", () => {
  assert.equal(selectSafeThreadName({ name: "发布验收", title: "raw prompt", preview: "raw prompt", first_user_message: "raw prompt" }), "发布验收");
});

test("thread name resolver falls back to the Codex thread title", () => {
  assert.equal(selectSafeThreadName({ name: null, title: "线程任务标题", preview: "线程任务标题", first_user_message: "线程任务标题" }), "线程任务标题");
  assert.equal(selectSafeThreadName({ name: null, title: "生成的简短标题", preview: "raw prompt", first_user_message: "raw prompt" }), "生成的简短标题");
});
