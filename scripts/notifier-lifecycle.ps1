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
$supervisorScript = Join-Path $repositoryRoot 'src\lifecycle-supervisor.mjs'
$controlRoot = if ($env:CODEX_NOTIFY_CONTROL_HOME) {
    [System.IO.Path]::GetFullPath($env:CODEX_NOTIFY_CONTROL_HOME)
} elseif ($env:LOCALAPPDATA) {
    Join-Path $env:LOCALAPPDATA 'CodexWeChatNotifier'
} else {
    Join-Path $env:USERPROFILE 'AppData\Local\CodexWeChatNotifier'
}
$pidPath = Join-Path $controlRoot 'run\lifecycle.pid.json'
$logPath = Join-Path $controlRoot 'logs\lifecycle.log'
$transportPath = Join-Path $controlRoot 'secure\active-transport.json'
$ilinkConfigPath = Join-Path $controlRoot 'secure\weixin-ilink.dpapi.json'
$testAccountConfigPath = Join-Path $controlRoot 'secure\wechat-test-account.dpapi.json'
$qqBotConfigPath = Join-Path $controlRoot 'secure\qqbot.dpapi.json'

function Get-SelectedTransport {
    if (-not (Test-Path -LiteralPath $transportPath)) { return 'weixin-ilink' }
    try {
        $selection = Get-Content -LiteralPath $transportPath -Raw | ConvertFrom-Json
        if ($selection.schemaVersion -ne 1 -or $selection.transport -notin @('weixin-ilink', 'wechat-test-account', 'qqbot')) {
            throw 'invalid'
        }
        [string]$selection.transport
    } catch {
        throw 'Notifier transport selection is invalid.'
    }
}

function Get-LifecycleProcess {
    if (-not (Test-Path -LiteralPath $pidPath)) { return $null }
    try {
        $record = Get-Content -LiteralPath $pidPath -Raw | ConvertFrom-Json
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$record.pid)" -ErrorAction SilentlyContinue
        if ($null -eq $process) { return $null }
        if ([string]$process.CommandLine -notlike "*$supervisorScript*") { return $null }
        $process
    } catch {
        $null
    }
}

function Stop-ExistingLifecycle {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($null -ne $task) { Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue }
    $process = Get-LifecycleProcess
    if ($null -ne $process) { Stop-Process -Id $process.ProcessId -Force }
    Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

function Invoke-NotifierStop {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $controlScript -Action Stop
    if ($LASTEXITCODE -ne 0) { throw 'Failed to stop the notifier watcher.' }
}

function Invoke-Enable {
    $transport = Get-SelectedTransport
    $configPath = if ($transport -eq 'qqbot') {
        $qqBotConfigPath
    } elseif ($transport -eq 'wechat-test-account') {
        $testAccountConfigPath
    } else {
        $ilinkConfigPath
    }
    if (-not (Test-Path -LiteralPath $configPath)) {
        if ($transport -eq 'qqbot') { throw 'QQ Bot is not configured. Run bind-qqbot.cmd or commands/configure-qqbot.cmd once.' }
        if ($transport -eq 'wechat-test-account') { throw 'WeChat test account is not configured. Run commands/configure-wechat-test-account.cmd once.' }
        throw 'Notifier is not configured. Run commands/configure-notifier.cmd once.'
    }
    if (-not (Test-Path -LiteralPath $supervisorScript)) { throw 'Lifecycle supervisor runtime was not found.' }
    Stop-ExistingLifecycle
    $node = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $powerShell = Get-Command pwsh.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $powerShell) {
        $powerShell = Get-Command powershell.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1
    }
    $command = "& '$($node.Replace("'", "''"))' '$($supervisorScript.Replace("'", "''"))'"
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    $scheduledAction = New-ScheduledTaskAction -Execute $powerShell.Source -Argument "-NoProfile -WindowStyle Hidden -EncodedCommand $encodedCommand" -WorkingDirectory $repositoryRoot
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    Register-ScheduledTask -TaskName $taskName -Action $scheduledAction -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName $taskName
    Write-Host 'Automatic Codex notifier lifecycle enabled.'
}

function Invoke-Disable {
    Stop-ExistingLifecycle
    if ($null -ne (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue)) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    Invoke-NotifierStop
    Write-Host 'Automatic Codex notifier lifecycle disabled.'
}

function Invoke-Status {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    $process = Get-LifecycleProcess
    Write-Host "Automatic: $(if ($null -ne $task) { 'enabled' } else { 'disabled' })"
    Write-Host "Supervisor: $(if ($null -ne $process) { 'running' } else { 'stopped' })"
    if ($null -ne $process) { Write-Host "Supervisor PID: $($process.ProcessId)" }
    if ($null -ne $task) { Write-Host "Scheduled task: $taskName ($($task.State))" }
    Write-Host 'Idle grace: 30 seconds'
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
