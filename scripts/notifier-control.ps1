param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Configure', 'Start', 'Stop', 'Status')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Security

function Get-ControlPaths {
    $root = if ($env:CODEX_NOTIFY_CONTROL_HOME) {
        [System.IO.Path]::GetFullPath($env:CODEX_NOTIFY_CONTROL_HOME)
    } elseif ($env:LOCALAPPDATA) {
        Join-Path $env:LOCALAPPDATA 'CodexOpenClawNotifier'
    } else {
        Join-Path $env:USERPROFILE 'AppData\Local\CodexOpenClawNotifier'
    }
    [pscustomobject]@{
        Root = $root
        SecureDirectory = Join-Path $root 'secure'
        ConfigPath = Join-Path $root 'secure\openclaw.dpapi.json'
        RuntimeHome = Join-Path $root 'live'
        RunDirectory = Join-Path $root 'run'
        PidPath = Join-Path $root 'run\watcher.pid.json'
        LogDirectory = Join-Path $root 'logs'
        StdoutPath = Join-Path $root 'logs\watcher.out.log'
        StderrPath = Join-Path $root 'logs\watcher.err.log'
    }
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
    Set-Acl -LiteralPath $Path -AclObject $acl
}

function Write-JsonAtomic {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][object]$Value
    )
    $directory = Split-Path -Parent $Path
    [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    $temporary = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($temporary, (($Value | ConvertTo-Json -Compress) + [Environment]::NewLine), $encoding)
    Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Get-DpapiEntropy {
    [Text.Encoding]::UTF8.GetBytes('CodexOpenClawNotifier/v1')
}

function Protect-SecureValue {
    param([Parameter(Mandatory = $true)][Security.SecureString]$Value)
    $pointer = [IntPtr]::Zero
    $plainText = $null
    $bytes = $null
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
        $plainText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        $bytes = [Text.Encoding]::UTF8.GetBytes($plainText)
        $protected = [Security.Cryptography.ProtectedData]::Protect(
            $bytes,
            (Get-DpapiEntropy),
            [Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        [Convert]::ToBase64String($protected)
    } finally {
        if ($null -ne $bytes) { [Array]::Clear($bytes, 0, $bytes.Length) }
        $plainText = $null
        if ($pointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        }
    }
}

function Unprotect-Value {
    param([Parameter(Mandatory = $true)][string]$Value)
    $protected = [Convert]::FromBase64String($Value)
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect(
        $protected,
        (Get-DpapiEntropy),
        [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    try {
        [Text.Encoding]::UTF8.GetString($bytes)
    } finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
    }
}

function Get-PidRecord {
    param([Parameter(Mandatory = $true)][object]$Paths)
    if (-not (Test-Path -LiteralPath $Paths.PidPath)) { return $null }
    try {
        Get-Content -LiteralPath $Paths.PidPath -Raw | ConvertFrom-Json
    } catch {
        Remove-Item -LiteralPath $Paths.PidPath -Force -ErrorAction SilentlyContinue
        $null
    }
}

function Get-WatcherProcess {
    param(
        [Parameter(Mandatory = $true)][object]$Paths,
        [Parameter(Mandatory = $true)][string]$RepositoryRoot
    )
    $record = Get-PidRecord -Paths $Paths
    if ($null -eq $record -or $null -eq $record.pid) { return $null }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$record.pid)" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        Remove-Item -LiteralPath $Paths.PidPath -Force -ErrorAction SilentlyContinue
        return $null
    }
    $commandLine = [string]$process.CommandLine
    $expectedScript = Join-Path $RepositoryRoot 'src\index.mjs'
    if ($commandLine.IndexOf($expectedScript, [StringComparison]::OrdinalIgnoreCase) -lt 0 -or $commandLine -notmatch '(?:^|\s)watch(?:\s|$)') {
        Remove-Item -LiteralPath $Paths.PidPath -Force -ErrorAction SilentlyContinue
        return $null
    }
    $process
}

function Invoke-Configure {
    param([Parameter(Mandatory = $true)][object]$Paths)
    $account = Read-Host 'OpenClaw account (stored with Windows DPAPI)' -AsSecureString
    $target = Read-Host 'OpenClaw full target (stored with Windows DPAPI)' -AsSecureString
    if ($account.Length -eq 0 -or $target.Length -eq 0) {
        throw 'Account and target are required.'
    }
    Set-PrivateDirectoryAcl -Path $Paths.SecureDirectory
    $record = [ordered]@{
        schemaVersion = 1
        protectedFor = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        account = Protect-SecureValue $account
        target = Protect-SecureValue $target
        updatedAt = [DateTime]::UtcNow.ToString('o')
    }
    Write-JsonAtomic -Path $Paths.ConfigPath -Value $record
    Write-Host 'Configuration saved for the current Windows user.'
}

function Invoke-Start {
    param(
        [Parameter(Mandatory = $true)][object]$Paths,
        [Parameter(Mandatory = $true)][string]$RepositoryRoot
    )
    $running = Get-WatcherProcess -Paths $Paths -RepositoryRoot $RepositoryRoot
    if ($null -ne $running) {
        Write-Host "Notifier is already running (PID $($running.ProcessId))."
        return
    }
    if (-not (Test-Path -LiteralPath $Paths.ConfigPath)) {
        throw 'Notifier is not configured. Run configure-notifier.cmd once.'
    }
    $config = Get-Content -LiteralPath $Paths.ConfigPath -Raw | ConvertFrom-Json
    if ($config.schemaVersion -ne 1 -or -not $config.account -or -not $config.target) {
        throw 'Notifier configuration is invalid. Run configure-notifier.cmd again.'
    }
    $node = Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $indexPath = Join-Path $RepositoryRoot 'src\index.mjs'
    if (-not (Test-Path -LiteralPath $indexPath)) { throw 'Notifier runtime was not found.' }

    [System.IO.Directory]::CreateDirectory($Paths.RuntimeHome) | Out-Null
    [System.IO.Directory]::CreateDirectory($Paths.RunDirectory) | Out-Null
    [System.IO.Directory]::CreateDirectory($Paths.LogDirectory) | Out-Null

    $account = $null
    $target = $null
    $names = @('CODEX_NOTIFY_ADAPTER', 'CODEX_NOTIFY_OPENCLAW_ACCOUNT', 'CODEX_NOTIFY_OPENCLAW_TARGET', 'CODEX_NOTIFY_HOME')
    $previous = @{}
    foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
    try {
        $account = Unprotect-Value ([string]$config.account)
        $target = Unprotect-Value ([string]$config.target)
        $env:CODEX_NOTIFY_ADAPTER = 'openclaw'
        $env:CODEX_NOTIFY_OPENCLAW_ACCOUNT = $account
        $env:CODEX_NOTIFY_OPENCLAW_TARGET = $target
        $env:CODEX_NOTIFY_HOME = $Paths.RuntimeHome
        $process = Start-Process -FilePath $node.Source -ArgumentList @($indexPath, 'watch') -WorkingDirectory $RepositoryRoot -WindowStyle Hidden -RedirectStandardOutput $Paths.StdoutPath -RedirectStandardError $Paths.StderrPath -PassThru
    } finally {
        foreach ($name in $names) {
            [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
        }
        $account = $null
        $target = $null
    }
    Start-Sleep -Milliseconds 750
    $process.Refresh()
    if ($process.HasExited) {
        throw "Notifier exited during startup. Check $($Paths.StderrPath)."
    }
    Write-JsonAtomic -Path $Paths.PidPath -Value ([ordered]@{
        schemaVersion = 1
        pid = $process.Id
        startedAt = [DateTime]::UtcNow.ToString('o')
        repositoryRoot = $RepositoryRoot
    })
    Write-Host "Notifier started (PID $($process.Id))."
}

function Invoke-Stop {
    param(
        [Parameter(Mandatory = $true)][object]$Paths,
        [Parameter(Mandatory = $true)][string]$RepositoryRoot
    )
    $process = Get-WatcherProcess -Paths $Paths -RepositoryRoot $RepositoryRoot
    if ($null -eq $process) {
        Write-Host 'Notifier is not running.'
        return
    }
    Stop-Process -Id $process.ProcessId -Force
    Remove-Item -LiteralPath $Paths.PidPath -Force -ErrorAction SilentlyContinue
    Write-Host 'Notifier stopped.'
}

function Get-JsonCount {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return 0 }
    @(Get-ChildItem -LiteralPath $Path -File -Filter '*.json' -ErrorAction SilentlyContinue).Count
}

function Invoke-Status {
    param(
        [Parameter(Mandatory = $true)][object]$Paths,
        [Parameter(Mandatory = $true)][string]$RepositoryRoot
    )
    $process = Get-WatcherProcess -Paths $Paths -RepositoryRoot $RepositoryRoot
    Write-Host "Configured: $(if (Test-Path -LiteralPath $Paths.ConfigPath) { 'yes' } else { 'no' })"
    Write-Host "Running: $(if ($null -ne $process) { 'yes' } else { 'no' })"
    if ($null -ne $process) { Write-Host "PID: $($process.ProcessId)" }
    Write-Host "Pending: $(Get-JsonCount (Join-Path $Paths.RuntimeHome 'outbox\pending'))"
    Write-Host "Delivered: $(Get-JsonCount (Join-Path $Paths.RuntimeHome 'outbox\delivered'))"
    Write-Host "Failed: $(Get-JsonCount (Join-Path $Paths.RuntimeHome 'outbox\failed'))"
    Write-Host "Logs: $($Paths.LogDirectory)"
}

$paths = Get-ControlPaths
$repositoryRoot = Split-Path -Parent $PSScriptRoot

try {
    switch ($Action) {
        'Configure' { Invoke-Configure -Paths $paths }
        'Start' { Invoke-Start -Paths $paths -RepositoryRoot $repositoryRoot }
        'Stop' { Invoke-Stop -Paths $paths -RepositoryRoot $repositoryRoot }
        'Status' { Invoke-Status -Paths $paths -RepositoryRoot $repositoryRoot }
    }
} catch {
    [Console]::Error.WriteLine("Notifier control failed: $($_.Exception.Message)")
    exit 1
}
