@echo off
set "club_exe=%LOCALAPPDATA%\Programs\sirce-nuxt\ClubSystems.exe"
if not exist "%club_exe%" (
 echo Instala primero ClubSystems-Setup.exe en esta computadora.
 pause
 exit /b 1
)
start "" "%club_exe%" --vincular-red
