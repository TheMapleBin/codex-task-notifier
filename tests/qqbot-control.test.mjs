import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const controlScript = fileURLToPath(new URL("../scripts/qqbot-control.ps1", import.meta.url));

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const child = spawn("pwsh.exe", ["-NoProfile", "-Command", script], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

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

test("QQ Bot process streams preserve UTF-8 under a GBK console", { skip: process.platform !== "win32" }, async () => {
  const script = String.raw`
$node = (Get-Command node.exe -CommandType Application | Select-Object -First 1).Source
$expectedHex = 'e9809ae79fa5'
$expectedText = [Text.Encoding]::UTF8.GetString([Convert]::FromHexString($expectedHex))
$previousInput = [Console]::InputEncoding
$previousOutput = [Console]::OutputEncoding
try {
  $gbk = [Text.Encoding]::GetEncoding(936)
  [Console]::InputEncoding = $gbk
  [Console]::OutputEncoding = $gbk
  $utf8 = [Text.UTF8Encoding]::new($false)

  $inputInfo = [Diagnostics.ProcessStartInfo]::new()
  $inputInfo.FileName = $node
  $inputInfo.UseShellExecute = $false
  $inputInfo.RedirectStandardInput = $true
  $inputInfo.RedirectStandardOutput = $true
  $inputInfo.StandardInputEncoding = $utf8
  $inputInfo.StandardOutputEncoding = $utf8
  $inputInfo.ArgumentList.Add('-e')
  $inputInfo.ArgumentList.Add('process.stdin.once("data", (chunk) => process.stdout.write(chunk.toString("hex")))')
  $input = [Diagnostics.Process]::Start($inputInfo)
  $input.StandardInput.Write($expectedText)
  $input.StandardInput.Close()
  $inputHex = $input.StandardOutput.ReadToEnd().Trim()
  $input.WaitForExit()
  if ($input.ExitCode -ne 0 -or $inputHex -ne $expectedHex) { throw 'UTF8_STDIN_FAILED' }
  $input.Dispose()

  $outputInfo = [Diagnostics.ProcessStartInfo]::new()
  $outputInfo.FileName = $node
  $outputInfo.UseShellExecute = $false
  $outputInfo.RedirectStandardOutput = $true
  $outputInfo.RedirectStandardError = $true
  $outputInfo.StandardOutputEncoding = $utf8
  $outputInfo.StandardErrorEncoding = $utf8
  $outputInfo.ArgumentList.Add('-e')
  $outputInfo.ArgumentList.Add('const text = Buffer.from("e9809ae79fa5", "hex"); process.stdout.write(text); process.stderr.write(text)')
  $output = [Diagnostics.Process]::Start($outputInfo)
  $stdout = $output.StandardOutput.ReadToEnd()
  $stderr = $output.StandardError.ReadToEnd()
  $output.WaitForExit()
  if ($output.ExitCode -ne 0 -or $stdout -ne $expectedText -or $stderr -ne $expectedText) { throw 'UTF8_OUTPUT_FAILED' }
  $output.Dispose()
  Write-Output 'UTF8_BRIDGE_OK'
} finally {
  [Console]::InputEncoding = $previousInput
  [Console]::OutputEncoding = $previousOutput
}`;
  const result = await runPowerShell(script);
  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), "UTF8_BRIDGE_OK");
});
