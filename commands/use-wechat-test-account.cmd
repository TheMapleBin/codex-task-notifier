@echo off
setlocal
where pwsh.exe >nul 2>nul
if %errorlevel% equ 0 (
  pwsh.exe -NoProfile -File "%~dp0..\scripts\notifier-control.ps1" -Action UseTestAccount
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\notifier-control.ps1" -Action UseTestAccount
)
pause
