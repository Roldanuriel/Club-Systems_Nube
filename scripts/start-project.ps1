$projectRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'start-postgres.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location $projectRoot
npm run dev -- --host 0.0.0.0 --port 3001
