param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Configure', 'Status', 'Test')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Security

function Get-Paths {
    $root = if ($env:CODEX_NOTIFY_CONTROL_HOME) {
        [System.IO.Path]::GetFullPath($env:CODEX_NOTIFY_CONTROL_HOME)
    } elseif ($env:LOCALAPPDATA) {
        Join-Path $env:LOCALAPPDATA 'CodexWeChatNotifier'
    } else {
        Join-Path $env:USERPROFILE 'AppData\Local\CodexWeChatNotifier'
    }
    [pscustomobject]@{
        SecureDirectory = Join-Path $root 'secure'
        ConfigPath = Join-Path $root 'secure\wechat-test-account.dpapi.json'
    }
}

function Set-PrivateDirectoryAcl {
    param([Parameter(Mandatory = $true)][string]$Path)
    [System.IO.Directory]::CreateDirectory($Path) | Out-Null
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = [System.Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($identity)
    $acl.SetAccessRuleProtection($true, $false)
    $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new(
        $identity,
        [System.Security.AccessControl.FileSystemRights]::FullControl,
        [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit',
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow
    ))
    $directoryInfo = [System.IO.DirectoryInfo]::new($Path)
    if ($directoryInfo.PSObject.Methods.Name -contains 'SetAccessControl') {
        $directoryInfo.SetAccessControl($acl)
    } elseif ('System.IO.FileSystemAclExtensions' -as [type]) {
        [System.IO.FileSystemAclExtensions]::SetAccessControl($directoryInfo, $acl)
    } else {
        throw 'This PowerShell runtime cannot apply a private directory ACL.'
    }
}

function Write-JsonAtomic {
    param([string]$Path, [object]$Value)
    $temporary = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
    [System.IO.File]::WriteAllText($temporary, (($Value | ConvertTo-Json -Compress) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Get-DpapiEntropy { [Text.Encoding]::UTF8.GetBytes('CodexWeChatNotifier/v1') }

function Protect-SecureValue {
    param([Parameter(Mandatory = $true)][Security.SecureString]$Value)
    $pointer = [IntPtr]::Zero
    $plainText = $null
    $bytes = $null
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
        $plainText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        $bytes = [Text.Encoding]::UTF8.GetBytes($plainText)
        [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect(
            $bytes, (Get-DpapiEntropy), [Security.Cryptography.DataProtectionScope]::CurrentUser
        ))
    } finally {
        if ($null -ne $bytes) { [Array]::Clear($bytes, 0, $bytes.Length) }
        $plainText = $null
        if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    }
}

function Unprotect-Value {
    param([Parameter(Mandatory = $true)][string]$Value)
    $protected = [Convert]::FromBase64String($Value)
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect(
        $protected, (Get-DpapiEntropy), [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    try { [Text.Encoding]::UTF8.GetString($bytes) } finally { [Array]::Clear($bytes, 0, $bytes.Length) }
}

function Read-RequiredSecret {
    param([Parameter(Mandatory = $true)][string]$Prompt)
    $value = Read-Host $Prompt -AsSecureString
    if ($value.Length -eq 0) { throw "$Prompt is required." }
    $value
}

function Invoke-Configure {
    param([Parameter(Mandatory = $true)][object]$Paths)
    Write-Host 'In the WeChat test-account page, create a template whose body is exactly:'
    Write-Host '通知内容：{{content.DATA}}'
    Write-Host 'Values entered below are encrypted for the current Windows user and are not printed.'
    $appId = Read-RequiredSecret 'AppID'
    $appSecret = Read-RequiredSecret 'AppSecret'
    $openId = Read-RequiredSecret 'Recipient OpenID'
    $templateId = Read-RequiredSecret 'Template ID'
    Set-PrivateDirectoryAcl -Path $Paths.SecureDirectory
    Write-JsonAtomic -Path $Paths.ConfigPath -Value ([ordered]@{
        schemaVersion = 1
        transport = 'wechat-test-account'
        protectedFor = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        appId = Protect-SecureValue $appId
        appSecret = Protect-SecureValue $appSecret
        openId = Protect-SecureValue $openId
        templateId = Protect-SecureValue $templateId
        updatedAt = [DateTime]::UtcNow.ToString('o')
    })
    Write-Host 'WeChat test-account configuration saved for the current Windows user.'
}

function Get-Config {
    param([Parameter(Mandatory = $true)][object]$Paths)
    if (-not (Test-Path -LiteralPath $Paths.ConfigPath)) { throw 'WeChat test account is not configured.' }
    $config = Get-Content -LiteralPath $Paths.ConfigPath -Raw | ConvertFrom-Json
    if ($config.schemaVersion -ne 1 -or $config.transport -ne 'wechat-test-account') { throw 'WeChat test-account configuration is invalid.' }
    $config
}

function Invoke-Test {
    param([Parameter(Mandatory = $true)][object]$Paths, [Parameter(Mandatory = $true)][string]$RepositoryRoot)
    $config = Get-Config -Paths $Paths
    $node = Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $smokePath = Join-Path $RepositoryRoot 'src\wechat-test-account-smoke.mjs'
    $values = $null
    $process = $null
    try {
        $values = [ordered]@{
            appId = Unprotect-Value ([string]$config.appId)
            appSecret = Unprotect-Value ([string]$config.appSecret)
            openId = Unprotect-Value ([string]$config.openId)
            templateId = Unprotect-Value ([string]$config.templateId)
            timeoutMs = 30000
        }
        $timestamp = [DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss')
        $payload = [ordered]@{
            config = @{ wechatTestAccount = $values }
            event = [ordered]@{
                source = 'session-watcher'
                kind = 'turn_finished'
                occurredAt = [DateTime]::UtcNow.ToString('o')
                workspace = 'codex-openclaw-notifier'
                taskName = '微信公众号测试号链路测试'
                surface = 'desktop'
                turnId = "wechat-test-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
                durationMs = 0
                finalOutput = "Codex 通知链路测试 + $timestamp"
            }
        } | ConvertTo-Json -Depth 8 -Compress
        $startInfo = [Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = $node.Source
        $startInfo.Arguments = ('"{0}"' -f $smokePath.Replace('"', '\"'))
        $startInfo.WorkingDirectory = $RepositoryRoot
        $startInfo.UseShellExecute = $false
        $startInfo.CreateNoWindow = $true
        $startInfo.RedirectStandardInput = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $process = [Diagnostics.Process]::Start($startInfo)
        $process.StandardInput.WriteLine($payload)
        $process.StandardInput.Close()
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) { throw $stderr.Trim() }
        $result = $stdout | ConvertFrom-Json
        if (-not $result.ok -or $result.transport -ne 'wechat-test-account') { throw 'WeChat test-account smoke test returned an invalid result.' }
        Write-Host "WeChat test-account send command succeeded at $timestamp."
    } finally {
        $values = $null
        $payload = $null
        if ($null -ne $process) { $process.Dispose() }
    }
}

function Invoke-Status {
    param([Parameter(Mandatory = $true)][object]$Paths)
    Write-Host "Configured: $(if (Test-Path -LiteralPath $Paths.ConfigPath) { 'yes' } else { 'no' })"
    Write-Host 'Transport: WeChat Official Account test account (trial only)'
    Write-Host 'Production watcher: unchanged'
}

$paths = Get-Paths
$repositoryRoot = Split-Path -Parent $PSScriptRoot
try {
    switch ($Action) {
        'Configure' { Invoke-Configure -Paths $paths }
        'Status' { Invoke-Status -Paths $paths }
        'Test' { Invoke-Test -Paths $paths -RepositoryRoot $repositoryRoot }
    }
} catch {
    [Console]::Error.WriteLine("WeChat test-account control failed: $($_.Exception.Message)")
    exit 1
}
