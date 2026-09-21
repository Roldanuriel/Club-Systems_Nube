@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-pilot.ps1"
if errorlevel 1 pause
