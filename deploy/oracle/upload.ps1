<#
.SYNOPSIS
  Upload HelpDesk Academy to your Oracle Cloud server and install (or update) it.

.DESCRIPTION
  Packages this project (without node_modules, data, or your local .env),
  copies it to the server over SSH, and runs deploy/oracle/setup.sh there.
  The first run asks a few setup questions in this window. Re-run it any time
  to push an updated version; student data and server settings are kept.

.EXAMPLE
  .\deploy\oracle\upload.ps1 -Ip 203.0.113.10 -Key "$HOME\Downloads\ssh-key-2026-10-29.key"

.EXAMPLE
  .\deploy\oracle\upload.ps1 -Ip 203.0.113.10 -Key .\my.key -Reconfigure   # answer the setup questions again

.EXAMPLE
  .\deploy\oracle\upload.ps1 -Ip 203.0.113.10 -Key .\my.key -DryRun        # build the package, upload nothing
#>
param(
  [Parameter(Mandatory = $true)][string]$Ip,
  [Parameter(Mandatory = $true)][string]$Key,
  [string]$User = "ubuntu",
  [switch]$Reconfigure,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not (Test-Path (Join-Path $root "server.js"))) { throw "Can't find the project next to this script ($root)." }
if ($Ip -notmatch '^[A-Za-z0-9.\-:]+$') { throw "That doesn't look like an IP address or host name: $Ip" }
if (-not (Test-Path $Key)) { throw "SSH key file not found: $Key" }
$Key = (Resolve-Path $Key).Path

foreach ($tool in "ssh.exe", "scp.exe", "tar.exe") {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    throw "$tool wasn't found. Windows 10/11 include it: Settings > System > Optional features > add 'OpenSSH Client'."
  }
}

# ---- package
Step "Packaging the app"
$archive = Join-Path $env:TEMP "helpdesk-academy-upload.tgz"
Remove-Item $archive -ErrorAction SilentlyContinue
& tar.exe -czf $archive --exclude=node_modules --exclude=data --exclude=.env --exclude=.git -C $root .
if ($LASTEXITCODE -ne 0) { throw "Packaging failed." }
$files = & tar.exe -tzf $archive
$sizeMb = [math]::Round((Get-Item $archive).Length / 1MB, 2)
Write-Host "    $($files.Count) files, $sizeMb MB"

if ($DryRun) {
  Write-Host "`nDry run: nothing uploaded. The package contains, for example:"
  $files | Where-Object { $_ -match '\.(js|sh|json|md|html|css)$' } | Select-Object -First 25 | ForEach-Object { Write-Host "    $_" }
  $bad = $files | Where-Object { $_ -match '(^|/)(node_modules|data|\.env)(/|$)' }
  if ($bad) { Write-Warning "These shouldn't be in the package: $($bad -join ', ')" } else { Write-Host "`n    OK: no node_modules, data, or .env in the package." }
  Write-Host "`nWould run:  scp <package> ${User}@${Ip}:helpdesk-academy-upload.tgz"
  Write-Host "            ssh ${User}@${Ip}  (unpack, then: sudo bash deploy/oracle/setup.sh --ip $Ip)"
  return
}

# ---- SSH refuses keys that other Windows users can read; limit this key to you.
& icacls.exe $Key /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null

$target = "$User@$Ip"
$sshOpts = @("-i", $Key, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=20", "-o", "ServerAliveInterval=30")

Step "Uploading to $Ip"
& scp.exe @sshOpts $archive "${target}:helpdesk-academy-upload.tgz"
if ($LASTEXITCODE -ne 0) {
  throw "Upload failed. Check the IP address, that the server is running, and that port 22 is open. See 'Troubleshooting' in deploy/oracle/README.md."
}

Step "Installing on the server"
$flags = "--ip $Ip"
if ($Reconfigure) { $flags += " --reconfigure" }
$remote = @(
  "set -e",
  "rm -rf ~/helpdesk-academy-src && mkdir -p ~/helpdesk-academy-src",
  "tar --warning=no-unknown-keyword -xzf ~/helpdesk-academy-upload.tgz -C ~/helpdesk-academy-src",
  "sed -i 's/\r$//' ~/helpdesk-academy-src/deploy/oracle/setup.sh",
  "sudo bash ~/helpdesk-academy-src/deploy/oracle/setup.sh $flags"
) -join " && "
& ssh.exe -t @sshOpts $target $remote
if ($LASTEXITCODE -ne 0) { throw "Setup on the server reported a problem (exit code $LASTEXITCODE). Scroll up for the error." }

Remove-Item $archive -ErrorAction SilentlyContinue
Write-Host "`nDone." -ForegroundColor Green
