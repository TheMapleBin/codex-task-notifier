param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Enable', 'Disable', 'Status')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$taskName = 'CodexWeChatNotifierLifecycle'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$controlScript = Join-Path $PSScriptRoot 'notifier-control.ps1'
$launcherScript = Join-Path $repositoryRoot 'src\lifecycle-supervisor.mjs'
$controlRoot = if ($env:CODEX_NOTIFY_CONTROL_HOME) {
    [System.IO.Path]::GetFullPath($env:CODEX_NOTIFY_CONTROL_HOME)
} elseif ($env:LOCALAPPDATA) {
    Join-Path $env:LOCALAPPDATA 'CodexWeChatNotifier'
} else {
    Join-Path $env:USERPROFILE 'AppData\Local\CodexWeChatNotifier'
}
$pidPath = Join-Path $controlRoot 'run\lifecycle.pid.json'
$logPath = Join-Path $controlRoot 'logs\lifecycle.log'

function Get-LifecycleLauncher {
    if (-not (Test-Path -LiteralPath $pidPath)) { return $null }
    try {
        $record = Get-Content -LiteralPath $pidPath -Raw | ConvertFrom-Json
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$record.pid)" -ErrorAction SilentlyContinue
        if ($null -eq $process) { return $null }
        if ([string]$process.CommandLine -notlike "*$launcherScript*") { return $null }
        $process
    } catch {
        $null
    }
}

function Stop-ExistingLifecycle {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($null -ne $task) { Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue }
    $process = Get-LifecycleLauncher
    if ($null -ne $process) { Stop-Process -Id $process.ProcessId -Force }
    Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

function Invoke-NotifierStop {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $controlScript -Action Stop
    if ($LASTEXITCODE -ne 0) { throw 'Failed to stop the notifier watcher.' }
}

function Invoke-Enable {
    $configPath = Join-Path $controlRoot 'secure\weixin-ilink.dpapi.json'
    if (-not (Test-Path -LiteralPath $configPath)) { throw 'Notifier is not configured. Run configure-notifier.cmd once.' }
    if (-not (Test-Path -LiteralPath $launcherScript)) { throw 'Lifecycle launcher runtime was not found.' }
    Stop-ExistingLifecycle
    $node = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $scheduledAction = New-ScheduledTaskAction -Execute $node -Argument "`"$launcherScript`"" -WorkingDirectory $repositoryRoot
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    Register-ScheduledTask -TaskName $taskName -Action $scheduledAction -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName $taskName
    Write-Host 'Automatic resident Codex notifier enabled.'
}

function Invoke-Disable {
    Stop-ExistingLifecycle
    if ($null -ne (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue)) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    Invoke-NotifierStop
    Write-Host 'Automatic resident Codex notifier disabled.'
}

function Invoke-Status {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    $process = Get-LifecycleLauncher
    Write-Host "Automatic: $(if ($null -ne $task) { 'enabled' } else { 'disabled' })"
    Write-Host 'Mode: resident watcher (no persistent supervisor)'
    Write-Host "Launcher: $(if ($null -ne $process) { 'running' } else { 'idle' })"
    if ($null -ne $process) { Write-Host "Launcher PID: $($process.ProcessId)" }
    if ($null -ne $task) { Write-Host "Scheduled task: $taskName ($($task.State))" }
    Write-Host "Log: $logPath"
}

try {
    switch ($Action) {
        'Enable' { Invoke-Enable }
        'Disable' { Invoke-Disable }
        'Status' { Invoke-Status }
    }
} catch {
    [Console]::Error.WriteLine("Notifier lifecycle failed: $($_.Exception.Message)")
    exit 1
}
