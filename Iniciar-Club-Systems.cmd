@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0herramientas\iniciar-piloto.ps1"
set "result=%errorlevel%"
if not "%result%"=="0" pause
exit /b %result%
