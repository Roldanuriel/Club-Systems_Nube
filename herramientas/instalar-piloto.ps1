$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host 'Preparando Club Systems - versión piloto...' -ForegroundColor Cyan
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Se necesita instalar Node.js antes de continuar.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'No se encontró npm.' }

Set-Location $projectRoot
npm.cmd ci --cache .npm-cache
if ($LASTEXITCODE -ne 0) { throw 'No fue posible instalar las dependencias.' }
npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) { throw 'La revisión de la versión piloto encontró errores.' }

try {
  $rule = Get-NetFirewallRule -DisplayName 'Club Systems Piloto (3001)' -ErrorAction SilentlyContinue
  if (-not $rule) {
    New-NetFirewallRule -DisplayName 'Club Systems Piloto (3001)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001 -Profile Private | Out-Null
  }
  Write-Host 'Acceso de red habilitado en el Firewall.' -ForegroundColor Green
} catch {
  Write-Warning 'No se pudo crear la regla del Firewall. Ejecuta Instalar-Piloto.cmd como administrador.'
}

& (Join-Path $PSScriptRoot 'crear-accesos-directos.ps1')

Write-Host 'Instalación piloto terminada.' -ForegroundColor Green
& (Join-Path $PSScriptRoot 'iniciar-piloto.ps1')
