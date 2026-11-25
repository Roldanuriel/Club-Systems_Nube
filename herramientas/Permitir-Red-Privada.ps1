#requires -RunAsAdministrator
$ErrorActionPreference='Stop'
foreach($rule in @(@{Name='Club Systems API privada';Protocol='TCP';Port=3001},@{Name='Club Systems sincronizacion privada';Protocol='TCP';Port=43422},@{Name='Club Systems deteccion privada';Protocol='UDP';Port=43421})) {
 if(-not(Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Protocol $rule.Protocol -LocalPort $rule.Port -RemoteAddress LocalSubnet -Profile Private -Action Allow | Out-Null
 }
}
Write-Host 'Permitido solo en redes privadas y desde la subred local. PostgreSQL no se expuso.'
