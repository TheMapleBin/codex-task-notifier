param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Configure', 'Start', 'Stop', 'Status', 'KeepAlive', 'UseTestAccount', 'UseIlink', 'UseQQBot')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Security

function Get-ControlPaths {
    $root = if ($env:CODEX_NOTIFY_CONTROL_HOME) {
        [System.IO.Path]::GetFullPath($env:CODEX_NOTIFY_CONTROL_HOME)
    } elseif ($env:LOCALAPPDATA) {
        Join-Path $env:LOCALAPPDATA 'CodexWeChatNotifier'
    } else {
        Join-Path $env:USERPROFILE 'AppData\Local\CodexWeChatNotifier'
    }
    [pscustomobject]@{
        Root = $root
        SecureDirectory = Join-Path $root 'secure'
        ConfigPath = Join-Path $root 'secure\weixin-ilink.dpapi.json'
        TestAccountConfigPath = Join-Path $root 'secure\wechat-test-account.dpapi.json'
        QQBotConfigPath = Join-Path $root 'secure\qqbot.dpapi.json'
        TransportPath = Join-Path $root 'secure\active-transport.json'
        RuntimeHome = Join-Path $root 'live'
        RunDirectory = Join-Path $root 'run'
        PidPath = Join-Path $root 'run\watcher.pid.json'
        KeepAliveStatusPath = Join-Path $root 'run\ilink-keepalive-status.json'
        QQBotGatewayStatusPath = Join-Path $root 'run\qqbot-gateway-status.json'
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
    $directory = Split-Path -Parent $Path
    [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    $temporary = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($temporary, (($Value | ConvertTo-Json -Compress) + [Environment]::NewLine), $encoding)
    Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Get-DpapiEntropy {
    [Text.Encoding]::UTF8.GetBytes('CodexWeChatNotifier/v1')
}

function Get-SelectedTransport {
    param([Parameter(Mandatory = $true)][object]$Paths)
    if (-not (Test-Path -LiteralPath $Paths.TransportPath)) { return 'weixin-ilink' }
    try {
        $selection = Get-Content -LiteralPath $Paths.TransportPath -Raw | ConvertFrom-Json
        if ($selection.schemaVersion -ne 1 -or $selection.transport -notin @('weixin-ilink', 'wechat-test-account', 'qqbot')) {
            throw 'invalid'
        }
        [string]$selection.transport
    } catch {
        throw 'Notifier transport selection is invalid.'
    }
}

function Set-SelectedTransport {
    param(
        [Parameter(Mandatory = $true)][object]$Paths,
        [Parameter(Mandatory = $true)][ValidateSet('weixin-ilink', 'wechat-test-account', 'qqbot')][string]$Transport
    )
    Set-PrivateDirectoryAcl -Path $Paths.SecureDirectory
    Write-JsonAtomic -Path $Paths.TransportPath -Value ([ordered]@{
        schemaVersion = 1
        transport = $Transport
        updatedAt = [DateTime]::UtcNow.ToString('o')
    })
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

function Unprotect-IlinkSessionValue {
    param([Parameter(Mandatory = $true)][string]$Value)
    $protected = [Convert]::FromBase64String($Value)
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect(
        $protected,
        [Text.Encoding]::UTF8.GetBytes('CodexWeChatNotifier/iLinkSession/v1'),
        [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    try {
        [Text.Encoding]::UTF8.GetString($bytes)
    } finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
    }
}

function ConvertFrom-WebResponseJson {
    param([Parameter(Mandatory = $true)][object]$Content)
    $text = if ($Content -is [byte[]]) {
        [Text.Encoding]::UTF8.GetString($Content)
    } else {
        [string]$Content
    }
    try {
        $text | ConvertFrom-Json
    } finally {
        $text = $null
    }
}

function Get-IlinkResponseCode {
    param([Parameter(Mandatory = $true)][object]$Payload)
    $errcode = $Payload.PSObject.Properties['errcode']
    if ($null -ne $errcode -and $null -ne $errcode.Value) { return [int]$errcode.Value }
    $ret = $Payload.PSObject.Properties['ret']
    if ($null -ne $ret -and $null -ne $ret.Value) { return [int]$ret.Value }
    0
}

function ConvertTo-SecureValue {
    param([Parameter(Mandatory = $true)][string]$Value)
    $secure = [Security.SecureString]::new()
    foreach ($character in $Value.ToCharArray()) { $secure.AppendChar($character) }
    $secure.MakeReadOnly()
    $secure
}

function Open-IlinkQrCode {
    param([Parameter(Mandatory = $true)][string]$Content)
    if ($Content.StartsWith('https://', [StringComparison]::OrdinalIgnoreCase)) {
        Start-Process -FilePath $Content | Out-Null
        return $null
    }
    if ($Content.StartsWith('data:image/', [StringComparison]::OrdinalIgnoreCase)) {
        $separator = $Content.IndexOf(',')
        if ($separator -lt 0) { throw 'The WeChat QR image was invalid.' }
        $path = Join-Path $env:TEMP "codex-notify-weixin-$([Guid]::NewGuid().ToString('N')).png"
        [System.IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($Content.Substring($separator + 1)))
        Start-Process -FilePath $path | Out-Null
        return $path
    }
    throw 'The WeChat QR response did not contain a supported image or URL.'
}

function Get-IlinkSetup {
    if ($env:CODEX_NOTIFY_ILINK_SETUP_FIXTURE) {
        return Get-Content -LiteralPath $env:CODEX_NOTIFY_ILINK_SETUP_FIXTURE -Raw | ConvertFrom-Json
    }

    $authBase = 'https://ilinkai.weixin.qq.com'
    $qr = Invoke-RestMethod -Method Get -Uri "$authBase/ilink/bot/get_bot_qrcode?bot_type=3" -TimeoutSec 20
    if (-not $qr.qrcode -or -not $qr.qrcode_img_content) { throw 'WeChat did not return a usable QR code.' }
    $temporaryQr = Open-IlinkQrCode -Content ([string]$qr.qrcode_img_content)
    Write-Host 'WeChat QR code opened. Scan it with WeChat.'

    try {
        $confirmed = $null
        $deadline = [DateTime]::UtcNow.AddMinutes(5)
        while ([DateTime]::UtcNow -lt $deadline) {
            $id = [Uri]::EscapeDataString([string]$qr.qrcode)
            $status = Invoke-RestMethod -Method Get -Uri "$authBase/ilink/bot/get_qrcode_status?qrcode=$id" -TimeoutSec 20
            if ($status.status -eq 'confirmed') { $confirmed = $status; break }
            Start-Sleep -Seconds 2
        }
        if ($null -eq $confirmed -or -not $confirmed.bot_token -or -not $confirmed.baseurl) {
            throw 'WeChat QR confirmation timed out or returned incomplete credentials.'
        }

        Write-Host 'QR confirmed. Send this bot one short WeChat message to establish the reply context.'
        $uin = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Random -Minimum 100000000 -Maximum 2147483647).ToString()))
        $headers = @{
            Authorization = "Bearer $($confirmed.bot_token)"
            AuthorizationType = 'ilink_bot_token'
            'X-WECHAT-UIN' = $uin
        }
        $cursor = ''
        $contextDeadline = [DateTime]::UtcNow.AddMinutes(5)
        while ([DateTime]::UtcNow -lt $contextDeadline) {
            $body = @{ get_updates_buf = $cursor; base_info = @{ channel_version = '1.0.2' } } | ConvertTo-Json -Depth 4 -Compress
            $updates = Invoke-RestMethod -Method Post -Uri "$($confirmed.baseurl.TrimEnd('/'))/ilink/bot/getupdates" -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 60
            if ($updates.get_updates_buf) { $cursor = [string]$updates.get_updates_buf }
            $message = @($updates.msgs | Where-Object {
                $_.message_type -eq 1 -and $_.from_user_id -and $_.context_token
            }) | Select-Object -Last 1
            if ($null -ne $message) {
                return [pscustomobject]@{
                    botToken = [string]$confirmed.bot_token
                    baseUrl = [string]$confirmed.baseurl
                    toUserId = [string]$message.from_user_id
                    contextToken = [string]$message.context_token
                }
            }
        }
        throw 'No WeChat message arrived before setup timed out.'
    } finally {
        if ($temporaryQr) { Remove-Item -LiteralPath $temporaryQr -Force -ErrorAction SilentlyContinue }
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
    $setup = Get-IlinkSetup
    if (-not $setup.botToken -or -not $setup.baseUrl -or -not $setup.toUserId -or -not $setup.contextToken) {
        throw 'iLink setup returned incomplete credentials or conversation context.'
    }
    Set-PrivateDirectoryAcl -Path $Paths.SecureDirectory
    $record = [ordered]@{
        schemaVersion = 2
        transport = 'weixin-ilink'
        protectedFor = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        botToken = Protect-SecureValue (ConvertTo-SecureValue ([string]$setup.botToken))
        baseUrl = Protect-SecureValue (ConvertTo-SecureValue ([string]$setup.baseUrl))
        toUserId = Protect-SecureValue (ConvertTo-SecureValue ([string]$setup.toUserId))
        contextToken = Protect-SecureValue (ConvertTo-SecureValue ([string]$setup.contextToken))
        updatedAt = [DateTime]::UtcNow.ToString('o')
    }
    Write-JsonAtomic -Path $Paths.ConfigPath -Value $record
    Write-Host 'Direct WeChat iLink configuration saved for the current Windows user.'
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
    $transport = Get-SelectedTransport -Paths $Paths
    if ($transport -eq 'qqbot') {
        if (-not (Test-Path -LiteralPath $Paths.QQBotConfigPath)) {
            throw 'QQ Bot is not configured. Run bind-qqbot.cmd or configure-qqbot.cmd once.'
        }
        $config = Get-Content -LiteralPath $Paths.QQBotConfigPath -Raw | ConvertFrom-Json
        if ($config.schemaVersion -ne 1 -or $config.transport -ne 'qqbot' -or -not $config.appId -or -not $config.appSecret -or -not $config.openId) {
            throw 'QQ Bot configuration is invalid. Run bind-qqbot.cmd or configure-qqbot.cmd again.'
        }
    } elseif ($transport -eq 'wechat-test-account') {
        if (-not (Test-Path -LiteralPath $Paths.TestAccountConfigPath)) {
            throw 'WeChat test account is not configured. Run configure-wechat-test-account.cmd once.'
        }
        $config = Get-Content -LiteralPath $Paths.TestAccountConfigPath -Raw | ConvertFrom-Json
        if ($config.schemaVersion -ne 1 -or $config.transport -ne 'wechat-test-account' -or -not $config.appId -or -not $config.appSecret -or -not $config.openId -or -not $config.templateId) {
            throw 'WeChat test-account configuration is invalid.'
        }
    } else {
        if (-not (Test-Path -LiteralPath $Paths.ConfigPath)) {
            throw 'Notifier is not configured. Run configure-notifier.cmd once.'
        }
        $config = Get-Content -LiteralPath $Paths.ConfigPath -Raw | ConvertFrom-Json
        if ($config.schemaVersion -ne 2 -or $config.transport -ne 'weixin-ilink' -or -not $config.botToken -or -not $config.baseUrl -or -not $config.toUserId -or -not $config.contextToken) {
            throw 'Notifier configuration is invalid. Run configure-notifier.cmd again.'
        }
    }
    $node = Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $indexPath = Join-Path $RepositoryRoot 'src\index.mjs'
    if (-not (Test-Path -LiteralPath $indexPath)) { throw 'Notifier runtime was not found.' }

    [System.IO.Directory]::CreateDirectory($Paths.RuntimeHome) | Out-Null
    [System.IO.Directory]::CreateDirectory($Paths.RunDirectory) | Out-Null
    [System.IO.Directory]::CreateDirectory($Paths.LogDirectory) | Out-Null

    $botToken = $null
    $baseUrl = $null
    $toUserId = $null
    $contextToken = $null
    $names = @(
        'CODEX_NOTIFY_ADAPTER',
        'CODEX_NOTIFY_ILINK_BOT_TOKEN',
        'CODEX_NOTIFY_ILINK_BASE_URL',
        'CODEX_NOTIFY_ILINK_TO_USER_ID',
        'CODEX_NOTIFY_ILINK_CONTEXT_TOKEN',
        'CODEX_NOTIFY_WECHAT_TEST_CONFIG',
        'CODEX_NOTIFY_QQBOT_CONFIG',
        'CODEX_NOTIFY_QQBOT_GATEWAY_STATUS',
        'CODEX_NOTIFY_POWERSHELL',
        'CODEX_NOTIFY_HOME'
    )
    $previous = @{}
    foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
    try {
        if ($transport -eq 'qqbot' -or $transport -eq 'wechat-test-account') {
            $powerShellCommand = Get-Command pwsh.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($null -eq $powerShellCommand) {
                $powerShellCommand = Get-Command powershell.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1
            }
            if ($transport -eq 'qqbot') {
                $env:CODEX_NOTIFY_ADAPTER = 'qqbot'
                $env:CODEX_NOTIFY_QQBOT_CONFIG = $Paths.QQBotConfigPath
                $env:CODEX_NOTIFY_QQBOT_GATEWAY_STATUS = $Paths.QQBotGatewayStatusPath
            } else {
                $env:CODEX_NOTIFY_ADAPTER = 'wechat-test-account'
                $env:CODEX_NOTIFY_WECHAT_TEST_CONFIG = $Paths.TestAccountConfigPath
            }
            $env:CODEX_NOTIFY_POWERSHELL = $powerShellCommand.Source
        } else {
            $botToken = Unprotect-Value ([string]$config.botToken)
            $baseUrl = Unprotect-Value ([string]$config.baseUrl)
            $toUserId = Unprotect-Value ([string]$config.toUserId)
            $contextToken = Unprotect-Value ([string]$config.contextToken)
            $env:CODEX_NOTIFY_ADAPTER = 'ilink'
            $env:CODEX_NOTIFY_ILINK_BOT_TOKEN = $botToken
            $env:CODEX_NOTIFY_ILINK_BASE_URL = $baseUrl
            $env:CODEX_NOTIFY_ILINK_TO_USER_ID = $toUserId
            $env:CODEX_NOTIFY_ILINK_CONTEXT_TOKEN = $contextToken
        }
        $env:CODEX_NOTIFY_HOME = $Paths.RuntimeHome
        $process = Start-Process -FilePath $node.Source -ArgumentList @($indexPath, 'watch') -WorkingDirectory $RepositoryRoot -WindowStyle Hidden -RedirectStandardOutput $Paths.StdoutPath -RedirectStandardError $Paths.StderrPath -PassThru
    } finally {
        foreach ($name in $names) {
            [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
        }
        $botToken = $null
        $baseUrl = $null
        $toUserId = $null
        $contextToken = $null
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

function Invoke-UseTestAccount {
    param([Parameter(Mandatory = $true)][object]$Paths)
    if (-not (Test-Path -LiteralPath $Paths.TestAccountConfigPath)) {
        throw 'WeChat test account is not configured. Run configure-wechat-test-account.cmd once.'
    }
    Set-SelectedTransport -Paths $Paths -Transport 'wechat-test-account'
    Write-Host 'Production transport selected: WeChat Official Account test account.'
}

function Invoke-UseIlink {
    param([Parameter(Mandatory = $true)][object]$Paths)
    if (-not (Test-Path -LiteralPath $Paths.ConfigPath)) {
        throw 'Direct WeChat iLink is not configured.'
    }
    Set-SelectedTransport -Paths $Paths -Transport 'weixin-ilink'
    Write-Host 'Production transport selected: direct WeChat iLink.'
}

function Invoke-UseQQBot {
    param([Parameter(Mandatory = $true)][object]$Paths)
    if (-not (Test-Path -LiteralPath $Paths.QQBotConfigPath)) {
        throw 'QQ Bot is not configured. Run bind-qqbot.cmd or configure-qqbot.cmd once.'
    }
    Set-SelectedTransport -Paths $Paths -Transport 'qqbot'
    Write-Host 'Production transport selected: direct QQ Bot with native Gateway.'
}

function Write-KeepAliveStatus {
    param(
        [Parameter(Mandatory = $true)][object]$Paths,
        [Parameter(Mandatory = $true)][bool]$Ok,
        [Parameter(Mandatory = $true)][string]$Code
    )
    [System.IO.Directory]::CreateDirectory($Paths.RunDirectory) | Out-Null
    Write-JsonAtomic -Path $Paths.KeepAliveStatusPath -Value ([ordered]@{
        schemaVersion = 1
        ok = $Ok
        code = $Code
        checkedAt = [DateTime]::UtcNow.ToString('o')
    })
}

function Invoke-IlinkKeepAlive {
    param([Parameter(Mandatory = $true)][object]$Paths)
    if ((Get-SelectedTransport -Paths $Paths) -ne 'weixin-ilink') {
        Write-KeepAliveStatus -Paths $Paths -Ok $true -Code 'not_used'
        return
    }
    if ($env:CODEX_NOTIFY_ILINK_KEEPALIVE_FIXTURE) {
        $fixture = Get-Content -LiteralPath $env:CODEX_NOTIFY_ILINK_KEEPALIVE_FIXTURE -Raw | ConvertFrom-Json
        $ok = $fixture.ok -eq $true
        Write-KeepAliveStatus -Paths $Paths -Ok $ok -Code $(if ($ok) { 'ok' } else { 'fixture_failed' })
        if (-not $ok) { throw 'iLink keepalive failed.' }
        return
    }

    $configPath = $Paths.ConfigPath
    $sessionPath = Join-Path $Paths.SecureDirectory 'weixin-ilink-session.dpapi.json'
    if (-not (Test-Path -LiteralPath $configPath) -or -not (Test-Path -LiteralPath $sessionPath)) {
        Write-KeepAliveStatus -Paths $Paths -Ok $false -Code 'context_missing'
        throw 'iLink keepalive context is unavailable.'
    }

    $botToken = $null
    $baseUrl = $null
    $toUserId = $null
    $contextToken = $null
    $typingTicket = $null
    try {
        $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
        $sessionRecord = Get-Content -LiteralPath $sessionPath -Raw | ConvertFrom-Json
        if ($config.schemaVersion -ne 2 -or $config.transport -ne 'weixin-ilink' -or $sessionRecord.schemaVersion -ne 1 -or -not $sessionRecord.protectedData) {
            throw 'invalid protected configuration'
        }
        $session = Unprotect-IlinkSessionValue ([string]$sessionRecord.protectedData) | ConvertFrom-Json
        $botToken = Unprotect-Value ([string]$config.botToken)
        $baseUrl = Unprotect-Value ([string]$config.baseUrl)
        $toUserId = [string]$session.toUserId
        $contextToken = [string]$session.contextToken
        $wechatUin = [string]$session.wechatUin
        if (-not $botToken -or -not $baseUrl -or -not $toUserId -or -not $contextToken -or -not $wechatUin) {
            throw 'missing protected context'
        }
        $baseUri = [Uri]$baseUrl
        if ($baseUri.Scheme -ne 'https' -or ($baseUri.Host -ne 'weixin.qq.com' -and -not $baseUri.Host.EndsWith('.weixin.qq.com', [StringComparison]::OrdinalIgnoreCase))) {
            throw 'unapproved iLink base URL'
        }
        $baseUrl = $baseUri.GetLeftPart([UriPartial]::Authority)

        $headers = @{
            Authorization = "Bearer $botToken"
            AuthorizationType = 'ilink_bot_token'
            'X-WECHAT-UIN' = $wechatUin
        }
        $baseInfo = @{ channel_version = '1.0.2'; bot_agent = 'codex-openclaw-notifier' }
        $configBody = @{
            ilink_user_id = $toUserId
            context_token = $contextToken
            base_info = $baseInfo
        } | ConvertTo-Json -Depth 6 -Compress
        $configResponse = Invoke-WebRequest -Uri ($baseUrl.TrimEnd('/') + '/ilink/bot/getconfig') -Method Post -Headers $headers -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($configBody)) -TimeoutSec 15
        $configPayload = ConvertFrom-WebResponseJson $configResponse.Content
        $ticketProperty = $configPayload.PSObject.Properties['typing_ticket']
        if ((Get-IlinkResponseCode $configPayload) -ne 0 -or $null -eq $ticketProperty -or -not $ticketProperty.Value) {
            throw 'typing ticket unavailable'
        }
        $typingTicket = [string]$ticketProperty.Value

        foreach ($status in 1, 2) {
            $typingBody = @{
                ilink_user_id = $toUserId
                typing_ticket = $typingTicket
                status = $status
                base_info = $baseInfo
            } | ConvertTo-Json -Depth 6 -Compress
            $typingResponse = Invoke-WebRequest -Uri ($baseUrl.TrimEnd('/') + '/ilink/bot/sendtyping') -Method Post -Headers $headers -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($typingBody)) -TimeoutSec 15
            $typingPayload = ConvertFrom-WebResponseJson $typingResponse.Content
            if ((Get-IlinkResponseCode $typingPayload) -ne 0) { throw 'typing request rejected' }
        }
        Write-KeepAliveStatus -Paths $Paths -Ok $true -Code 'ok'
    } catch {
        Write-KeepAliveStatus -Paths $Paths -Ok $false -Code 'request_failed'
        throw 'iLink keepalive failed.'
    } finally {
        $botToken = $null
        $baseUrl = $null
        $toUserId = $null
        $contextToken = $null
        $typingTicket = $null
    }
}

function Invoke-Status {
    param(
        [Parameter(Mandatory = $true)][object]$Paths,
        [Parameter(Mandatory = $true)][string]$RepositoryRoot
    )
    $process = Get-WatcherProcess -Paths $Paths -RepositoryRoot $RepositoryRoot
    $transport = Get-SelectedTransport -Paths $Paths
    $configured = if ($transport -eq 'qqbot') {
        Test-Path -LiteralPath $Paths.QQBotConfigPath
    } elseif ($transport -eq 'wechat-test-account') {
        Test-Path -LiteralPath $Paths.TestAccountConfigPath
    } else {
        Test-Path -LiteralPath $Paths.ConfigPath
    }
    Write-Host "Configured: $(if ($configured) { 'yes' } else { 'no' })"
    $transportLabel = if ($transport -eq 'qqbot') {
        'direct QQ Bot with native Gateway'
    } elseif ($transport -eq 'wechat-test-account') {
        'WeChat Official Account test account'
    } else {
        'direct WeChat iLink'
    }
    Write-Host "Transport: $transportLabel"
    Write-Host "Running: $(if ($null -ne $process) { 'yes' } else { 'no' })"
    if ($null -ne $process) { Write-Host "PID: $($process.ProcessId)" }
    Write-Host "Pending: $(Get-JsonCount (Join-Path $Paths.RuntimeHome 'outbox\pending'))"
    Write-Host "Delivered: $(Get-JsonCount (Join-Path $Paths.RuntimeHome 'outbox\delivered'))"
    Write-Host "Failed: $(Get-JsonCount (Join-Path $Paths.RuntimeHome 'outbox\failed'))"
    if ($transport -eq 'weixin-ilink' -and (Test-Path -LiteralPath $Paths.KeepAliveStatusPath)) {
        try {
            $keepAlive = Get-Content -LiteralPath $Paths.KeepAliveStatusPath -Raw | ConvertFrom-Json
            Write-Host "ClawBot keepalive: $(if ($keepAlive.ok) { 'ok' } else { 'failed' }) ($($keepAlive.checkedAt))"
        } catch {
            Write-Host 'ClawBot keepalive: unknown'
        }
    } elseif ($transport -eq 'weixin-ilink') {
        Write-Host 'ClawBot keepalive: not checked'
    } else {
        Write-Host 'ClawBot keepalive: not used'
    }
    if ($transport -eq 'qqbot') {
        try {
            $gateway = Get-Content -LiteralPath $Paths.QQBotGatewayStatusPath -Raw | ConvertFrom-Json
            if ($gateway.schemaVersion -ne 1 -or $gateway.state -notin @('starting', 'connecting', 'online', 'backoff', 'blocked', 'stopped') -or $gateway.activeMessaging -notin @('unknown', 'allowed', 'rejected')) {
                throw 'invalid'
            }
            Write-Host "QQ Gateway: $($gateway.state), active messages: $($gateway.activeMessaging)"
            if ($gateway.code -and [string]$gateway.code -match '^QQBOT_GATEWAY_[A-Z0-9_]{1,64}$') {
                Write-Host "QQ Gateway code: $($gateway.code)"
            }
        } catch {
            Write-Host 'QQ Gateway: not reported'
        }
    }
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
        'KeepAlive' { Invoke-IlinkKeepAlive -Paths $paths }
        'UseTestAccount' { Invoke-UseTestAccount -Paths $paths }
        'UseIlink' { Invoke-UseIlink -Paths $paths }
        'UseQQBot' { Invoke-UseQQBot -Paths $paths }
    }
} catch {
    [Console]::Error.WriteLine("Notifier control failed: $($_.Exception.Message)")
    exit 1
}
