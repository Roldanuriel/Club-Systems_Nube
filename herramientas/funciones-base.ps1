# La aplicación y las herramientas leen la misma configuración de PostgreSQL.
function Get-ClubDatabaseSettings {
    $settings = @{ PG_HOST = '127.0.0.1'; PG_PORT = '5432'; PG_USER = 'postgres'; PG_DATABASE = 'club_systems'; PG_PASSWORD = '' }
    $envFile = Join-Path (Split-Path -Parent $PSScriptRoot) '.env'
    if (Test-Path -LiteralPath $envFile) {
        foreach ($line in Get-Content -LiteralPath $envFile) {
            if ($line -match '^\s*(PG_[A-Z_]+)\s*=\s*(.*?)\s*$') {
                $key = $Matches[1]
                $value = $Matches[2].Trim().Trim('"').Trim("'")
                if ($settings.ContainsKey($key)) { $settings[$key] = $value }
            }
        }
    }
    foreach ($key in @($settings.Keys)) {
        $value = [Environment]::GetEnvironmentVariable($key)
        if ($null -ne $value) { $settings[$key] = $value }
    }
    return $settings
}

function Invoke-ClubDatabaseTool {
    param([string]$Tool, [string[]]$ToolArguments = @())
    $settings = Get-ClubDatabaseSettings
    $executable = Join-Path (Split-Path -Parent $PSScriptRoot) ".postgresql\pgsql\bin\$Tool.exe"
    if (-not (Test-Path -LiteralPath $executable)) { throw "No se encontró $Tool en .postgresql." }
    $previousPassword = $env:PGPASSWORD
    try {
        $env:PGPASSWORD = $settings.PG_PASSWORD
        & $executable -h $settings.PG_HOST -p $settings.PG_PORT -U $settings.PG_USER -d $settings.PG_DATABASE @ToolArguments
        if ($LASTEXITCODE -ne 0) { throw "$Tool falló (código $LASTEXITCODE). Revisa la configuración PG_ de .env." }
    } finally { $env:PGPASSWORD = $previousPassword }
}
