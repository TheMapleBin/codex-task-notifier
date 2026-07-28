param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Read', 'Write')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Security

function Get-StatePath {
    $root = if ($env:CODEX_NOTIFY_CONTROL_HOME) {
        [System.IO.Path]::GetFullPath($env:CODEX_NOTIFY_CONTROL_HOME)
    } elseif ($env:LOCALAPPDATA) {
        Join-Path $env:LOCALAPPDATA 'CodexWeChatNotifier'
    } else {
        Join-Path $env:USERPROFILE 'AppData\Local\CodexWeChatNotifier'
    }
    Join-Path $root 'secure\weixin-ilink-session.dpapi.json'
}

function Get-Entropy {
    [Text.Encoding]::UTF8.GetBytes('CodexWeChatNotifier/iLinkSession/v1')
}

function Set-PrivateDirectoryAcl {
    param([Parameter(Mandatory = $true)][string]$Path)
    [System.IO.Directory]::CreateDirectory($Path) | Out-Null
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = [System.Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($identity)
    $acl.SetAccessRuleProtection($true, $false)
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
        $identity,
        [System.Security.AccessControl.FileSystemRights]::FullControl,
        [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit',
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow
    )
    $acl.AddAccessRule($rule)
    $directoryInfo = [System.IO.DirectoryInfo]::new($Path)
    if ($directoryInfo.PSObject.Methods.Name -contains 'SetAccessControl') {
        $directoryInfo.SetAccessControl($acl)
    } else {
        [System.IO.FileSystemAclExtensions]::SetAccessControl($directoryInfo, $acl)
    }
}

function Write-JsonAtomic {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][object]$Value
    )
    $temporary = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($temporary, (($Value | ConvertTo-Json -Compress) + [Environment]::NewLine), $encoding)
    Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Assert-OptionalString {
    param(
        [AllowNull()][object]$Value,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][int]$MaximumLength
    )
    if ($null -eq $Value) { return }
    if ($Value -isnot [string] -or $Value.Length -gt $MaximumLength) {
        throw "Invalid iLink session field: $Name"
    }
}

function Invoke-Write {
    param([Parameter(Mandatory = $true)][string]$Path)
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw) -or $raw.Length -gt 65536) { throw 'Invalid iLink session payload.' }
    $state = $raw | ConvertFrom-Json
    if ($state.schemaVersion -ne 1) { throw 'Invalid iLink session schema.' }
    Assert-OptionalString $state.wechatUin 'wechatUin' 512
    Assert-OptionalString $state.cursor 'cursor' 16384
    Assert-OptionalString $state.toUserId 'toUserId' 4096
    Assert-OptionalString $state.contextToken 'contextToken' 16384

    $normalized = [ordered]@{
        schemaVersion = 1
        wechatUin = $state.wechatUin
        cursor = $state.cursor
        toUserId = $state.toUserId
        contextToken = $state.contextToken
        updatedAt = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($normalized)
    try {
        $protected = [Security.Cryptography.ProtectedData]::Protect(
            $bytes,
            (Get-Entropy),
            [Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        $directory = Split-Path -Parent $Path
        Set-PrivateDirectoryAcl -Path $directory
        Write-JsonAtomic -Path $Path -Value ([ordered]@{
            schemaVersion = 1
            protectedFor = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
            protectedData = [Convert]::ToBase64String($protected)
            updatedAt = [DateTime]::UtcNow.ToString('o')
        })
    } finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
        $normalized = $null
        $raw = $null
    }
}

function Invoke-Read {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        [Console]::Out.Write('{}')
        return
    }
    $record = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    if ($record.schemaVersion -ne 1 -or -not $record.protectedData) { throw 'Invalid protected iLink session state.' }
    $protected = [Convert]::FromBase64String([string]$record.protectedData)
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect(
        $protected,
        (Get-Entropy),
        [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    try {
        [Console]::Out.Write([Text.Encoding]::UTF8.GetString($bytes))
    } finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
    }
}

try {
    $statePath = Get-StatePath
    if ($Action -eq 'Write') { Invoke-Write -Path $statePath } else { Invoke-Read -Path $statePath }
} catch {
    [Console]::Error.WriteLine('iLink session state operation failed.')
    exit 1
}
