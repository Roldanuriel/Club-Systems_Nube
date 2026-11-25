const {execFileSync}=require('node:child_process');
function privateAddress() {
 const script="$profiles = @(Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Private' }); $ips = @(foreach ($p in $profiles) { Get-NetIPAddress -InterfaceIndex $p.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.AddressState -eq 'Preferred' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress }); ConvertTo-Json -Compress -InputObject $ips";
 const values=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',windowsHide:true,timeout:10000}).replace(/^\uFEFF/,''));
 const ips=[...new Set(values)].filter(ip=>/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
 if(ips.length!==1)throw Error('Conecta una sola red privada (extraescolares2025). No se publicará el servidor en una red pública o ambigua.');
 return ips[0];
}
module.exports={privateAddress};
