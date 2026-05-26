$ErrorActionPreference = "Stop"

$GitHubOwner = "Synterius"
$GitHubReleaseRepo = "copybara-releases"

$package = Get-Content ".\package.json" -Raw | ConvertFrom-Json
$version = $package.version
$tag = "v$version"

$releaseRoot = ".\release-server"
$releaseFilesDir = "$releaseRoot\releases"

New-Item -ItemType Directory -Force $releaseFilesDir | Out-Null
Get-ChildItem $releaseFilesDir -File | Remove-Item -Force

# -----------------------------
# Windows artifact
# -----------------------------
$windowsInstallerName = "Copybara_${version}_x64-setup.exe"
$windowsInstallerPath = ".\src-tauri\target\release\bundle\nsis\$windowsInstallerName"
$windowsSigPath = "$windowsInstallerPath.sig"

if (!(Test-Path $windowsInstallerPath)) {
  throw "Windows installer not found: $windowsInstallerPath"
}

if (!(Test-Path $windowsSigPath)) {
  throw "Windows signature not found: $windowsSigPath"
}

Copy-Item $windowsInstallerPath "$releaseFilesDir\$windowsInstallerName" -Force
Copy-Item $windowsSigPath "$releaseFilesDir\$windowsInstallerName.sig" -Force

$windowsSignature = (Get-Content $windowsSigPath -Raw).Trim()

# -----------------------------
# Pull Linux artifact from Ubuntu VM
# -----------------------------
$UbuntuUser = "copybara"
$UbuntuHost = "192.168.91.128"
$UbuntuAppImageDir = "~/Projects/copybara/src-tauri/target/release/bundle/appimage"

$linuxReleaseDir = ".\linux-release"
New-Item -ItemType Directory -Force $linuxReleaseDir | Out-Null

$linuxAppImageName = "Copybara_${version}_amd64.AppImage"

Write-Host ""
Write-Host "Trying to pull Linux AppImage from Ubuntu VM..."

$SshKeyPath = "$env:USERPROFILE\.ssh\copybara_release_ed25519"

scp -i $SshKeyPath "${UbuntuUser}@${UbuntuHost}:${UbuntuAppImageDir}/${linuxAppImageName}" "$linuxReleaseDir\"
scp -i $SshKeyPath "${UbuntuUser}@${UbuntuHost}:${UbuntuAppImageDir}/${linuxAppImageName}.sig" "$linuxReleaseDir\"

# -----------------------------
# Linux artifact
# Expected source:
# .\linux-release\Copybara_1.0.1_amd64.AppImage
# .\linux-release\Copybara_1.0.1_amd64.AppImage.sig
# -----------------------------
$linuxAppImageName = "Copybara_${version}_amd64.AppImage"
$linuxAppImagePath = ".\linux-release\$linuxAppImageName"
$linuxSigPath = "$linuxAppImagePath.sig"

$platforms = @{
  "windows-x86_64" = @{
    signature = $windowsSignature
    url = "https://github.com/$GitHubOwner/$GitHubReleaseRepo/releases/download/$tag/$windowsInstallerName"
  }
}

if ((Test-Path $linuxAppImagePath) -and (Test-Path $linuxSigPath)) {
  Copy-Item $linuxAppImagePath "$releaseFilesDir\$linuxAppImageName" -Force
  Copy-Item $linuxSigPath "$releaseFilesDir\$linuxAppImageName.sig" -Force

  $linuxSignature = (Get-Content $linuxSigPath -Raw).Trim()

  $platforms["linux-x86_64"] = @{
    signature = $linuxSignature
    url = "https://github.com/$GitHubOwner/$GitHubReleaseRepo/releases/download/$tag/$linuxAppImageName"
  }

  Write-Host "Linux AppImage included: $linuxAppImageName"
} else {
  Write-Warning "Linux AppImage not found in .\linux-release. latest.json will include Windows only."
}

# -----------------------------
# latest.json
# -----------------------------
$latest = @{
  version = $version
  notes = "Copybara v$version"
  pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  platforms = $platforms
}

$json = $latest | ConvertTo-Json -Depth 10

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
  (Join-Path (Resolve-Path $releaseRoot) "latest.json"),
  $json,
  $utf8NoBom
)

Write-Host ""
Write-Host "Prepared Copybara release $version"
Write-Host "GitHub tag: $tag"
Write-Host ""
Write-Host "Files to upload to GitHub Release:"
Get-ChildItem $releaseFilesDir | ForEach-Object {
  Write-Host " - $($_.Name)"
}
Write-Host ""
Write-Host "Manifest:"
Write-Host " - release-server\latest.json"