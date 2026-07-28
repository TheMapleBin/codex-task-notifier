import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const controlScript = fileURLToPath(new URL("../scripts/qqbot-control.ps1", import.meta.url));

test("QQ Bot smoke payload is explicitly written to Node as UTF-8", async () => {
  const source = await readFile(controlScript, "utf8");
  const invokeTest = source.slice(source.indexOf("function Invoke-Test {"), source.indexOf("function Invoke-Status {"));
  const startIndex = invokeTest.indexOf("[Diagnostics.Process]::Start($startInfo)");

  assert.ok(invokeTest.length > 0, "QQ Bot control must contain Invoke-Test");
  for (const property of ["StandardInputEncoding", "StandardOutputEncoding", "StandardErrorEncoding"]) {
    const encodingIndex = invokeTest.indexOf(`$startInfo.${property} = $utf8`);
    assert.ok(encodingIndex >= 0, `Invoke-Test must set ${property} to UTF-8`);
    assert.ok(encodingIndex < startIndex, `${property} must be set before starting Node`);
  }
});
