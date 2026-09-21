$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'pilot-common.ps1')

& (Join-Path $PSScriptRoot 'start-postgres.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$address = Get-ClubSystemsIPv4
if (-not $address) { $address = '127.0.0.1' }
$localUrl = 'http://localhost:3001/'
$networkUrl = "http://${address}:3001/"

$existing = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $existing) {
  Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev', '--', '--host', '0.0.0.0', '--port', '3001' -WorkingDirectory $projectRoot -WindowStyle Hidden
}

  if (-not (Wait-ClubSystems -Url $localUrl -Attempts 90)) { throw 'Club Systems no pudo iniciar en el puerto 3001.' }

$status = @"
Club Systems - VERSION PILOTO
Equipo servidor: $env:COMPUTERNAME
Acceso en esta computadora: $localUrl
Acceso desde celulares y otras computadoras: $networkUrl
Fecha de inicio: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
"@
$status | Set-Content -LiteralPath (Join-Path $projectRoot 'ACCESO-CLUB-SYSTEMS.txt') -Encoding UTF8
Write-Host $status -ForegroundColor Cyan
Start-Process $localUrl
