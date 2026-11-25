#requires -RunAsAdministrator
param(
  [Parameter(Mandatory = $true)]
  [string]$AccessFile
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$accessFilePath = [System.IO.Path]::GetFullPath($AccessFile)
$accessDirectory = Split-Path -Parent $accessFilePath
if (-not $accessDirectory) {
  throw 'Indica una carpeta válida para el archivo de direcciones.'
}
New-Item -ItemType Directory -Path $accessDirectory -Force | Out-Null

$envPath = Join-Path $projectRoot '.env'
$lines = @()
if (Test-Path -LiteralPath $envPath) {
  $lines = @([System.IO.File]::ReadAllLines($envPath, [System.Text.Encoding]::UTF8) | Where-Object {
    $_ -notmatch '^\s*CLUB_SYSTEMS_ACCESS_FILE\s*='
  })
}
$lines += "CLUB_SYSTEMS_ACCESS_FILE=`"$accessFilePath`""
[System.IO.File]::WriteAllLines(
  $envPath,
  [string[]]$lines,
  [System.Text.UTF8Encoding]::new($false)
)

$ruleName = 'Club Systems API (TCP 3001, Private LAN)'
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existingRule) {
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3001 `
    -RemoteAddress LocalSubnet `
    -Action Allow `
    -Profile Private | Out-Null
}

Write-Host "Archivo de dirección configurado: $accessFilePath" -ForegroundColor Green
Write-Host 'Al iniciar el servidor se actualizará automáticamente con la IP de red actual.'
Write-Host "Comparte solo la carpeta '$accessDirectory' con permiso de lectura para los equipos cliente."
Write-Host 'El Firewall permite TCP 3001 solo desde la subred local y en el perfil Privado.'
Write-Host 'No expongas PostgreSQL (puerto 5432) ni compartas el archivo .env.'
