function Get-ClubSystemsIPv4 {
  $preferred = $null
  try {
    $preferred = Get-NetIPConfiguration -ErrorAction Stop |
      Where-Object { $_.NetAdapter.Status -eq 'Up' -and $_.IPv4DefaultGateway -and $_.IPv4Address } |
      ForEach-Object { $_.IPv4Address.IPAddress } |
      Where-Object { $_ -and $_ -notlike '169.254.*' -and $_ -ne '127.0.0.1' } |
      Select-Object -First 1
  } catch {}

  if ($preferred) { return $preferred }

  try {
    $network = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
      Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
      ForEach-Object {
        $properties = $_.GetIPProperties()
        $hasGateway = @($properties.GatewayAddresses | Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' }).Count -gt 0
        if ($hasGateway) {
          $properties.UnicastAddresses |
            Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' } |
            ForEach-Object { $_.Address.IPAddressToString }
        }
      } |
      Where-Object { $_ -and $_ -notlike '169.254.*' -and $_ -ne '127.0.0.1' } |
      Select-Object -First 1
    if ($network) { return $network }
  } catch {}

  try {
    return [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
      Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notlike '169.254.*' -and $_.IPAddressToString -ne '127.0.0.1' } |
      Select-Object -ExpandProperty IPAddressToString -First 1
  } catch { return $null }
}

function Wait-ClubSystems {
  param([string]$Url, [int]$Attempts = 60)
  for ($attempt = 0; $attempt -lt $Attempts; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return $true }
    } catch {}
    Start-Sleep -Seconds 1
  }
  return $false
}
