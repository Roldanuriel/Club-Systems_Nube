$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backupDirectory = Join-Path $projectRoot 'respaldos'
$pgDump = Join-Path $projectRoot '.postgresql\pgsql\bin\pg_dump.exe'

& (Join-Path $PSScriptRoot 'start-postgres.ps1')
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$destination = Join-Path $backupDirectory ("club_systems_{0}.backup" -f (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'))
& $pgDump -h 127.0.0.1 -p 5432 -U postgres -d club_systems -F c -f $destination
if ($LASTEXITCODE -ne 0) { throw 'No fue posible crear el respaldo.' }
Write-Host "Respaldo creado correctamente:`n$destination" -ForegroundColor Green
Start-Process explorer.exe -ArgumentList "/select,`"$destination`""
