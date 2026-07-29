@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\notifier-lifecycle.ps1" -Action Status
pause
