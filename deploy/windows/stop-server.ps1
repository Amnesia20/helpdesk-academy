# Stops HelpDesk Academy if it's running in the background (from the
# auto-start task or run-server.ps1). Doesn't touch any other Node programs.
$all = Get-CimInstance Win32_Process
$loops = @($all | Where-Object { $_.Name -eq "powershell.exe" -and $_.CommandLine -like "*helpdesk-academy*run-server.ps1*" })
$wrappers = @($all | Where-Object { $_.Name -eq "cmd.exe" -and $_.CommandLine -like "*node server.js*server.log*" })
$wrapperIds = $wrappers | ForEach-Object { $_.ProcessId }
$nodes = @($all | Where-Object { $_.Name -eq "node.exe" -and $wrapperIds -contains $_.ParentProcessId })

# Stop the keep-alive loop first so it doesn't restart the server.
foreach ($p in $loops + $nodes + $wrappers) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
$count = $loops.Count + $nodes.Count + $wrappers.Count
if ($count) { "Stopped HelpDesk Academy." } else { "HelpDesk Academy wasn't running in the background." }
