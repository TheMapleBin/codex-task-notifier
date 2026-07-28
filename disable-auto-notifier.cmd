@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\notifier-lifecycle.ps1" -Action Disable
if errorlevel 1 pause
