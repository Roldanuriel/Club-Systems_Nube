param(
  [string]$ServerUrl,
  [string]$AccessFile
)

$ErrorActionPreference = 'Stop'

if ([bool]$ServerUrl -eq [bool]$AccessFile) {
  throw 'Indica exactamente uno de estos parámetros: -ServerUrl o -AccessFile.'
}

$configSetting = if ($AccessFile) {
  $resolvedAccessFile = [System.IO.Path]::GetFullPath($AccessFile)
  if (-not (Test-Path -LiteralPath $resolvedAccessFile -PathType Leaf)) {
    throw "No se puede leer el archivo de direcciones: $resolvedAccessFile"
  }
  $contents = Get-Content -LiteralPath $resolvedAccessFile -Raw
  $match = [regex]::Match(
    $contents,
    '^\s*Acceso desde celulares y otras computadoras:\s*(https?://\S+)',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor
      [System.Text.RegularExpressions.RegexOptions]::Multiline
  )
  if (-not $match.Success) {
    throw "El archivo no contiene la dirección de acceso de Club Systems: $resolvedAccessFile"
  }
  "CLUB_SYSTEMS_SERVER_URL_FILE=`"$resolvedAccessFile`""
} else {
  $ServerUrl = $ServerUrl.Trim().TrimEnd('/')
  "CLUB_SYSTEMS_SERVER_URL=`"$ServerUrl/`""
}

if ($AccessFile) {
  $ServerUrl = $match.Groups[1].Value.TrimEnd('/')
}

$uri = $null
if (-not [Uri]::TryCreate($ServerUrl, [UriKind]::Absolute, [ref]$uri) -or
    $uri.Scheme -notin @('http', 'https') -or
    $uri.UserInfo -or
    $uri.AbsolutePath -ne '/' -or
    $uri.Query -or
    $uri.Fragment) {
  throw 'La dirección debe ser una URL HTTP/HTTPS a la raíz del servidor, por ejemplo http://192.168.1.20:3001/.'
}

try {
  $health = Invoke-RestMethod -Uri "$($uri.ToString().TrimEnd('/'))/api/health" -TimeoutSec 10
} catch {
  throw "No se pudo consultar la API central en $($uri.Host):$($uri.Port). Comprueba que el servidor esté encendido, la IP/puerto sean correctos y el Firewall permita TCP 3001. Detalle: $($_.Exception.Message)"
}
if ($health.service -ne 'SIRCE Nitro' -or $health.database -ne 'connected') {
  throw 'El servidor respondió, pero no confirmó la conexión con PostgreSQL. Revisa la configuración PG_* en el equipo maestro.'
}

$configDirectory = Join-Path $env:APPDATA 'Club Systems'
$configPath = Join-Path $configDirectory '.env'
New-Item -ItemType Directory -Path $configDirectory -Force | Out-Null
$lines = @()
if (Test-Path -LiteralPath $configPath) {
  $lines = @([System.IO.File]::ReadAllLines($configPath, [System.Text.Encoding]::UTF8) | Where-Object {
    $_ -notmatch '^\s*CLUB_SYSTEMS_SERVER_URL(?:_FILE)?\s*='
  })
}
$lines += $configSetting
[System.IO.File]::WriteAllLines(
  $configPath,
  [string[]]$lines,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "Equipo cliente configurado para $($uri.ToString())" -ForegroundColor Green
Write-Host "Si Club Systems estaba abierto, ciérralo y vuelve a iniciarlo."
