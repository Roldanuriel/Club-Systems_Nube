@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0herramientas\instalar-piloto.ps1"
set "result=%errorlevel%"
pause
exit /b %result%
