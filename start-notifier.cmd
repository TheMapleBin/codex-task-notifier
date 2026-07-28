@echo off
setlocal
where pwsh.exe >nul 2>nul
if %errorlevel% equ 0 (
  pwsh.exe -NoProfile -File "%~dp0scripts\notifier-control.ps1" -Action Start
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\notifier-control.ps1" -Action Start
)
if errorlevel 1 pause
