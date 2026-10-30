<#
.SYNOPSIS
  Makes HelpDesk Academy start automatically (hidden) when you log in to Windows.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\deploy\windows\install-autostart.ps1          # turn on
  powershell -ExecutionPolicy Bypass -File .\deploy\windows\install-autostart.ps1 -Remove  # turn off
#>
param([switch]$Remove)
$ErrorActionPreference = "Stop"
$name = "HelpDesk Academy"
$runner = (Resolve-Path (Join-Path $PSScriptRoot "run-server.ps1")).Path

if ($Remove) {
  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    "Auto-start turned off. (The app keeps running until you log out or run stop-server.ps1.)"
  } else { "Auto-start wasn't turned on." }
  return
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force `
  -Description "Starts the HelpDesk Academy server (hidden) at login and keeps it running. Log: data\server.log" | Out-Null
"Auto-start is on: '$name' runs at login for $env:USERNAME."
