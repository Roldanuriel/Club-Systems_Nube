param([string]$Usuario='postgres',[string]$Base='SIAE')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$file=Join-Path $projectRoot '.env'
if(Test-Path -LiteralPath $file){Write-Host 'Ya existe la configuracion local. Se conserva sin cambios.';exit 0}
$secret=Read-Host 'Contrasena de PostgreSQL de ESTA computadora' -AsSecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
 $password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 $text=@('PG_HOST=127.0.0.1','PG_PORT=5432',('PG_USER='+($Usuario | ConvertTo-Json -Compress)),('PG_DATABASE='+($Base | ConvertTo-Json -Compress)),('PG_PASSWORD='+($password | ConvertTo-Json -Compress)))
 [IO.File]::WriteAllLines($file,$text,[Text.UTF8Encoding]::new($false))
} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr);$password=$null;$text=$null}
Write-Host 'Conexion local guardada. No necesitas la IP de otra computadora.'
