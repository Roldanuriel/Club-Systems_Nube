param([string]$BackupPath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pgRestore = Join-Path $projectRoot '.postgresql\pgsql\bin\pg_restore.exe'
if (-not $BackupPath) { $BackupPath = Read-Host 'Escribe o pega la ruta completa del respaldo .backup' }
$resolved = (Resolve-Path -LiteralPath $BackupPath -ErrorAction Stop).Path
if ([IO.Path]::GetExtension($resolved) -ne '.backup') { throw 'Selecciona un archivo .backup válido.' }
& (Join-Path $PSScriptRoot 'start-postgres.ps1')
$confirmation = Read-Host 'La restauración reemplazará los datos actuales. Escribe RESTAURAR para continuar'
if ($confirmation -cne 'RESTAURAR') { Write-Host 'Restauración cancelada.'; exit 0 }
& $pgRestore -h 127.0.0.1 -p 5432 -U postgres -d club_systems --clean --if-exists --no-owner $resolved
if ($LASTEXITCODE -ne 0) { throw 'La restauración no pudo completarse.' }
Write-Host 'Base de datos restaurada correctamente.' -ForegroundColor Green
