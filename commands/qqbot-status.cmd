@echo off
setlocal
where pwsh.exe >nul 2>nul
if %errorlevel% equ 0 (
  pwsh.exe -NoProfile -File "%~dp0..\scripts\qqbot-control.ps1" -Action Status
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\qqbot-control.ps1" -Action Status
)
pause
