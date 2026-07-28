@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wechat-test-account-control.ps1" -Action Configure
pause
