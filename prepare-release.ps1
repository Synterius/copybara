$ErrorActionPreference = "Stop"

$package = Get-Content ".\package.json" -Raw | ConvertFrom-Json
$version = $package.version

$installerName = "Copybara_${version}_x64-setup.exe"
$installerPath = ".\src-tauri\target\release\bundle\nsis\$installerName"
$sigPath = "$installerPath.sig"

if (!(Test-Path $installerPath)) {
  throw "Installer not found: $installerPath"
}

if (!(Test-Path $sigPath)) {
  throw "Signature not found: $sigPath"
}

New-Item -ItemType Directory -Force ".\release-server\releases" | Out-Null

Copy-Item $installerPath ".\release-server\releases\$installerName" -Force

$signature = (Get-Content $sigPath -Raw).Trim()

$latest = @{
  version = $version
  notes = "Copybara update"
  pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  platforms = @{
    "windows-x86_64" = @{
      signature = $signature
      url = "https://support.69c.local/copybara/releases/$installerName"
    }
  }
}

$json = $latest | ConvertTo-Json -Depth 10

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
  (Resolve-Path ".\release-server\latest.json"),
  $json,
  $utf8NoBom
)

Write-Host "Prepared release $version"
Write-Host "Installer: release-server\releases\$installerName"
Write-Host "Manifest:  release-server\latest.json"