$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'iniciar-postgres.ps1')

Set-Location $projectRoot
npm.cmd run dev -- --host 0.0.0.0 --port 3001
if ($LASTEXITCODE -ne 0) { throw 'La aplicación terminó con un error.' }
