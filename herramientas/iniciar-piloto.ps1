param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'funciones-piloto.ps1')

& (Join-Path $PSScriptRoot 'iniciar-postgres.ps1')

$address = Get-ClubSystemsIPv4
if (-not $address) { $address = '127.0.0.1' }
$localUrl = 'http://127.0.0.1:3001/'
$networkUrl = "http://${address}:3001/"

$alreadyRunning = $false
try {
  $existingHealth = Invoke-RestMethod -Uri "${localUrl}api/health" -TimeoutSec 3
  $alreadyRunning = $existingHealth.service -eq 'SIRCE Nitro' -and $existingHealth.database -eq 'connected'
} catch {}
if (-not $alreadyRunning) {
  # No iniciar otra instancia si el puerto está ocupado por un servicio diferente.
  $connection = New-Object System.Net.Sockets.TcpClient
  try {
    $connection.Connect('127.0.0.1', 3001)
    $portOccupied = $true
  } catch { $portOccupied = $false }
  finally { $connection.Dispose() }
  if ($portOccupied) { throw 'El puerto 3001 está ocupado, pero Club Systems no responde correctamente. Revisa .data\logs.' }
  $logDirectory = Join-Path $projectRoot '.data\logs'
  New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev', '--', '--host', '0.0.0.0', '--port', '3001' -WorkingDirectory $projectRoot -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDirectory 'app.log') `
    -RedirectStandardError (Join-Path $logDirectory 'app-error.log')
}

if (-not (Wait-ClubSystems -Url $localUrl -Attempts 90)) { throw 'Club Systems no inició. Revisa .data\logs\app-error.log.' }
# También comprobar el backend y su conexión real a la base de datos.
$health = Invoke-RestMethod -Uri "${localUrl}api/health" -TimeoutSec 10
if ($health.database -ne 'connected' -or $health.service -ne 'SIRCE Nitro') {
  throw 'El puerto 3001 no corresponde a Club Systems o la base no está disponible.'
}

$status = @"
Club Systems - VERSION PILOTO
Equipo servidor: $env:COMPUTERNAME
Acceso en esta computadora: $localUrl
Acceso desde celulares y otras computadoras: $networkUrl
Fecha de inicio: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
"@
$status | Set-Content -LiteralPath (Join-Path $projectRoot 'ACCESO-CLUB-SYSTEMS.txt') -Encoding UTF8
Write-Host $status -ForegroundColor Cyan
if (-not $NoBrowser) { Start-Process $localUrl }
