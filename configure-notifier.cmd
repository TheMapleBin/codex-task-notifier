@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\notifier-control.ps1" -Action Configure
if errorlevel 1 pause
