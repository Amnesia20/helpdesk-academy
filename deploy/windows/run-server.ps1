# Keeps HelpDesk Academy running in the background: starts the server and
# restarts it if it ever stops. Output goes to data\server.log.
# Started at login by the "HelpDesk Academy" scheduled task
# (see install-autostart.ps1). You can also run it by hand.
$ErrorActionPreference = "Continue"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root
New-Item -ItemType Directory -Force (Join-Path $root "data") | Out-Null
$log = Join-Path $root "data\server.log"

# Which port? Read PORT from .env (default 3300).
$port = 3300
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  $m = Select-String -Path $envFile -Pattern '^\s*PORT\s*=\s*(\d+)' | Select-Object -First 1
  if ($m) { $port = [int]$m.Matches[0].Groups[1].Value }
}

# Only one copy: if something is already serving the port, leave it alone.
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { exit 0 }

while ($true) {
  if ((Test-Path $log) -and (Get-Item $log).Length -gt 5MB) { Move-Item $log "$log.old" -Force }
  cmd /c "echo ==== starting %date% %time% ==== >> `"$log`""
  # cmd does the redirection so the log stays plain text.
  cmd /c "node server.js >> `"$log`" 2>&1"
  $code = $LASTEXITCODE
  cmd /c "echo ==== stopped %date% %time% (exit code $code); restarting in 10 seconds ==== >> `"$log`""
  Start-Sleep -Seconds 10
}
