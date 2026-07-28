param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Security

function Get-DpapiEntropy { [Text.Encoding]::UTF8.GetBytes('CodexWeChatNotifier/v1') }

function Unprotect-Value {
    param([Parameter(Mandatory = $true)][string]$Value)
    $protected = [Convert]::FromBase64String($Value)
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect(
        $protected, (Get-DpapiEntropy), [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    try { [Text.Encoding]::UTF8.GetString($bytes) } finally { [Array]::Clear($bytes, 0, $bytes.Length) }
}

try {
    $resolved = [System.IO.Path]::GetFullPath($ConfigPath)
    if (-not (Test-Path -LiteralPath $resolved)) { throw 'Configuration was not found.' }
    $record = Get-Content -LiteralPath $resolved -Raw | ConvertFrom-Json
    if ($record.schemaVersion -ne 1 -or $record.transport -ne 'wechat-test-account') { throw 'Configuration is invalid.' }
    $values = [ordered]@{
        schemaVersion = 1
        appId = Unprotect-Value ([string]$record.appId)
        appSecret = Unprotect-Value ([string]$record.appSecret)
        openId = Unprotect-Value ([string]$record.openId)
        templateId = Unprotect-Value ([string]$record.templateId)
    }
    [Console]::Out.Write(($values | ConvertTo-Json -Compress))
} catch {
    [Console]::Error.WriteLine('WeChat test-account configuration read failed.')
    exit 1
}
