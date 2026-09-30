$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'funciones-base.ps1')
$projectRoot = Split-Path -Parent $PSScriptRoot
$settings = Get-ClubDatabaseSettings
$postgresBin = Join-Path $projectRoot '.postgresql\pgsql\bin'
$postgresData = Join-Path $projectRoot '.postgresql\data'

function Test-PostgresReady {
    & (Join-Path $postgresBin 'pg_isready.exe') -h $settings.PG_HOST -p $settings.PG_PORT -U $settings.PG_USER -d $settings.PG_DATABASE *> $null
    return $LASTEXITCODE -eq 0
}

if (-not (Test-PostgresReady)) {
    if ($settings.PG_HOST -notin @('localhost', '127.0.0.1')) {
        throw 'El servidor PostgreSQL configurado no responde. Revisa PG_HOST y PG_PORT en .env.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $postgresData 'PG_VERSION'))) {
        throw 'No se encontró la base existente en .postgresql\data. Restaura el respaldo; no se creará una base vacía.'
    }
    $process = Start-Process -FilePath (Join-Path $postgresBin 'postgres.exe') `
        -ArgumentList "-D `"$postgresData`" -p $($settings.PG_PORT) -h 127.0.0.1" `
        -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $projectRoot '.postgresql\startup.log') `
        -RedirectStandardError (Join-Path $projectRoot '.postgresql\startup-error.log')
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if (Test-PostgresReady) { break }
        if ($process.HasExited) { throw 'PostgreSQL no inició. Revisa .postgresql\startup-error.log.' }
        Start-Sleep -Milliseconds 500
    }
    if (-not (Test-PostgresReady)) { throw 'PostgreSQL no respondió. Revisa .postgresql\startup-error.log.' }
}
# Un puerto abierto no garantiza que la base de Club Systems sea accesible.
Invoke-ClubDatabaseTool -Tool 'psql' -ToolArguments @('-w', '-X', '-v', 'ON_ERROR_STOP=1', '-tAc', 'SELECT 1') | Out-Null
Write-Host "PostgreSQL listo en el puerto $($settings.PG_PORT)." -ForegroundColor Green
# No usar exit: este archivo también se llama desde instalación, inicio y respaldo.
