$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$buildInstallerPath = Join-Path $projectRoot 'release\installer-build\ClubSystems-Setup.exe'
$distDirectory = Join-Path $projectRoot 'dist'
$installerPath = Join-Path $distDirectory 'ClubSystems-Setup.exe'
$desktopPath = [Environment]::GetFolderPath('Desktop')

if (-not (Test-Path -LiteralPath $buildInstallerPath -PathType Leaf)) {
    throw "No se encontró el instalador generado: $buildInstallerPath"
}
if (-not $desktopPath) {
    throw 'Windows no devolvió la ruta del Escritorio para copiar el instalador.'
}

New-Item -ItemType Directory -Path $distDirectory -Force | Out-Null
Copy-Item -LiteralPath $buildInstallerPath -Destination $installerPath -Force
$desktopInstallerPath = Join-Path $desktopPath 'ClubSystems-Setup.exe'
Copy-Item -LiteralPath $installerPath -Destination $desktopInstallerPath -Force
Write-Output "Instalador copiado al Escritorio: $desktopInstallerPath"
