param([string]$DestinationDirectory, [switch]$NoExplorer)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'funciones-base.ps1')
if (-not $DestinationDirectory) { $DestinationDirectory = Join-Path $projectRoot 'respaldos' }
& (Join-Path $PSScriptRoot 'iniciar-postgres.ps1')
New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
$destination = Join-Path $DestinationDirectory ("club_systems_{0}.backup" -f (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss-fff'))
$temporary = "$destination.partial"
Invoke-ClubDatabaseTool -Tool 'pg_dump' -ToolArguments @('-w', '-F', 'c', '-f', $temporary)
& (Join-Path $projectRoot '.postgresql\pgsql\bin\pg_restore.exe') --list $temporary | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'El respaldo no tiene un formato válido.' }
Move-Item -LiteralPath $temporary -Destination $destination
Write-Host "Respaldo de la base creado: $destination" -ForegroundColor Green
Write-Host 'Para un respaldo completo, conserva también .data y .env.'
if (-not $NoExplorer) { Start-Process explorer.exe -ArgumentList "/select,`"$destination`"" }
