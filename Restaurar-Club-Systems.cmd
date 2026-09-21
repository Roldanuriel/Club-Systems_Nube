@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore-database.ps1" %*
pause
