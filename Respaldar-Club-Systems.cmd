@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-database.ps1"
pause
