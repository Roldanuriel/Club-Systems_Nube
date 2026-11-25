param([ValidateSet('Servidor','Cliente')][string]$Modo, [string]$Vinculo)
$ErrorActionPreference='Stop'
if(-not $Modo){$Modo=Read-Host 'Escribe Servidor o Cliente';if($Modo -notin @('Servidor','Cliente')){throw 'Modo invalido'}}
$dir=Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'Club Systems'
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$file=Join-Path $dir 'red.json'
if(Test-Path -LiteralPath $file){throw 'Este equipo ya esta vinculado. Conserva red.json antes de cambiar su identidad.'}
if(-not $Vinculo){$Vinculo=Read-Host 'Ruta del archivo vinculo-clubsystems.json; deja vacio SOLO para crear una nueva red'}
if($Vinculo){$pair=Get-Content -LiteralPath $Vinculo -Raw | ConvertFrom-Json;if($pair.key -notmatch '^[a-fA-F0-9]{64}$'){throw 'Archivo de vinculacion invalido'}}
else {
 if($Modo -eq 'Cliente'){throw 'El cliente necesita el archivo de vinculacion del servidor'}
 $bytes=New-Object byte[] 32;$rng=[Security.Cryptography.RandomNumberGenerator]::Create();$rng.GetBytes($bytes);$rng.Dispose()
 $pair=@{key=([BitConverter]::ToString($bytes)).Replace('-','').ToLower()}
 $pair | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'vinculo-clubsystems.json') -Encoding UTF8
}
$role=if($Modo -eq 'Servidor'){'server'}else{'client'}
@{role=$role;id=[guid]::NewGuid().ToString();key=$pair.key} | ConvertTo-Json | Set-Content -LiteralPath $file -Encoding UTF8
Write-Host 'Equipo vinculado. Cierra y vuelve a abrir Club Systems.'
if($Modo -eq 'Servidor'){Write-Host 'PostgreSQL debe estar configurado y activo. Ejecuta Permitir-Red-Privada.ps1 como administrador. La vinculacion NO sincroniza las bases.'}
