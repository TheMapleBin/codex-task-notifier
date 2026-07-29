@echo off
setlocal
where pwsh.exe >nul 2>nul
if %errorlevel% equ 0 (
  pwsh.exe -NoProfile -File "%~dp0scripts\notifier-control.ps1" -Action UseQQBot
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\notifier-control.ps1" -Action UseQQBot
)
pause
