param([string]$DesktopPath = [Environment]::GetFolderPath('Desktop'))
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $DesktopPath -or -not (Test-Path -LiteralPath $DesktopPath)) { throw 'No se encontró el escritorio del usuario.' }
$shell = New-Object -ComObject WScript.Shell
$shortcuts = @(
    @{ Name = 'Club Systems Piloto.lnk'; File = 'Iniciar-Club-Systems.cmd'; Icon = 14 },
    @{ Name = 'Respaldar Club Systems.lnk'; File = 'Respaldar-Club-Systems.cmd'; Icon = 112 }
)
foreach ($item in $shortcuts) {
    $target = Join-Path $projectRoot $item.File
    if (-not (Test-Path -LiteralPath $target)) { throw "No existe $target." }
    $shortcutPath = Join-Path $DesktopPath $item.Name
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $target
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.IconLocation = "$env:SystemRoot\System32\imageres.dll,$($item.Icon)"
    $shortcut.Save()
    if (-not (Test-Path -LiteralPath $shortcutPath)) { throw "No se pudo crear $shortcutPath." }
}
Write-Host "Accesos directos creados en $DesktopPath." -ForegroundColor Green
