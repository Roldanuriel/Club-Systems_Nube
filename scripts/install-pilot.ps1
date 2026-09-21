$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host 'Preparando Club Systems - versión piloto...' -ForegroundColor Cyan
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Se necesita instalar Node.js antes de continuar.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'No se encontró npm.' }

Set-Location $projectRoot
npm.cmd install
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

$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$shortcuts = @(
  @{ Name = 'Club Systems Piloto.lnk'; Target = (Join-Path $projectRoot 'Iniciar-Club-Systems.cmd'); Icon = "$env:SystemRoot\System32\imageres.dll,14" },
  @{ Name = 'Respaldar Club Systems.lnk'; Target = (Join-Path $projectRoot 'Respaldar-Club-Systems.cmd'); Icon = "$env:SystemRoot\System32\imageres.dll,112" }
)
foreach ($item in $shortcuts) {
  $shortcut = $shell.CreateShortcut((Join-Path $desktop $item.Name))
  $shortcut.TargetPath = $item.Target
  $shortcut.WorkingDirectory = $projectRoot
  $shortcut.IconLocation = $item.Icon
  $shortcut.Save()
}

Write-Host 'Instalación piloto terminada.' -ForegroundColor Green
& (Join-Path $PSScriptRoot 'start-pilot.ps1')
