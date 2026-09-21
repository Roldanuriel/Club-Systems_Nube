$projectRoot = Split-Path -Parent $PSScriptRoot
$postgresBin = Join-Path $projectRoot '.postgresql\pgsql\bin'
$postgresData = Join-Path $projectRoot '.postgresql\data'

& (Join-Path $postgresBin 'pg_isready.exe') -h 127.0.0.1 -p 5432 *> $null
if ($LASTEXITCODE -eq 0) {
  Write-Host 'PostgreSQL ya está funcionando en el puerto 5432.'
  exit 0
}

Start-Process `
  -FilePath (Join-Path $postgresBin 'postgres.exe') `
  -ArgumentList '-D', $postgresData, '-p', '5432', '-h', '127.0.0.1' `
  -WindowStyle Hidden

for ($attempt = 0; $attempt -lt 15; $attempt++) {
  Start-Sleep -Milliseconds 500
  & (Join-Path $postgresBin 'pg_isready.exe') -h 127.0.0.1 -p 5432 *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Host 'PostgreSQL inició correctamente en el puerto 5432.'
    exit 0
  }
}

throw 'PostgreSQL no pudo iniciar.'
