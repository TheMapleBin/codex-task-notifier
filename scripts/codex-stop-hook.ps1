# Codex Stop hook: enqueue a minimal local event without blocking the task.
# It intentionally does not contact WeChat directly.
$ErrorActionPreference = 'Stop'

function Write-IncomingFallback {
    param([string]$Body, [string]$NotifierHome)
    try {
        $incoming = Join-Path $NotifierHome 'incoming'
        [System.IO.Directory]::CreateDirectory($incoming) | Out-Null
        $id = [Guid]::NewGuid().ToString('N')
        $tmp = Join-Path $incoming "$id.tmp"
        $target = Join-Path $incoming "$id.json"
        $encoding = [System.Text.UTF8Encoding]::new($false)
        [System.IO.File]::WriteAllText($tmp, $Body, $encoding)
        [System.IO.File]::Move($tmp, $target)
    } catch {
        # Fail open: a notifier must never change the Codex task outcome.
    }
}

try {
    if ($env:CODEX_NOTIFY_CLI_WRAPPER -eq '1') { exit 0 }

    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
    $hookInput = $raw | ConvertFrom-Json -AsHashtable

    $endpoint = if ($env:CODEX_NOTIFY_ENDPOINT) { $env:CODEX_NOTIFY_ENDPOINT } else { 'http://127.0.0.1:17080/v1/events' }
    $uri = [Uri]$endpoint
    $hostName = $uri.Host.Trim('[', ']')
    if ($hostName -notin @('127.0.0.1', 'localhost', '::1')) { exit 0 }

    $notifierHome = if ($env:CODEX_NOTIFY_HOME) {
        $env:CODEX_NOTIFY_HOME
    } elseif ($env:LOCALAPPDATA) {
        Join-Path $env:LOCALAPPDATA 'CodexWeChatNotifier'
    } else {
        Join-Path $env:USERPROFILE 'AppData\Local\CodexWeChatNotifier'
    }

    $turnId = if ($hookInput.ContainsKey('turn_id') -and $null -ne $hookInput.turn_id) {
        [string]$hookInput.turn_id
    } elseif ($hookInput.ContainsKey('session_id') -and $null -ne $hookInput.session_id) {
        [string]$hookInput.session_id
    } else {
        [Guid]::NewGuid().ToString('N')
    }
    $cwd = if ($hookInput.ContainsKey('cwd') -and $null -ne $hookInput.cwd) { [string]$hookInput.cwd } else { '' }
    $workspace = if ([string]::IsNullOrWhiteSpace($cwd)) { $null } else { Split-Path ($cwd.TrimEnd('\', '/')) -Leaf }
    $event = [ordered]@{
        id = "stop-hook:turn_stopped:$turnId"
        source = 'stop-hook'
        kind = 'turn_stopped'
        severity = 'info'
        occurredAt = [DateTime]::UtcNow.ToString('o')
        workspace = $workspace
        surface = 'desktop'
        turnId = $turnId
        correlationKey = "turn:$turnId"
    }
    $body = $event | ConvertTo-Json -Compress

    try {
        Invoke-WebRequest -Uri $uri -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 1 -UseBasicParsing | Out-Null
    } catch {
        Write-IncomingFallback -Body $body -NotifierHome $notifierHome
    }
} catch {
    # Fail open by design.
}

exit 0
