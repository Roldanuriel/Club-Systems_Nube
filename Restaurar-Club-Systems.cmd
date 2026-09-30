@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0herramientas\restaurar-base.ps1" %*
set "result=%errorlevel%"
pause
exit /b %result%
