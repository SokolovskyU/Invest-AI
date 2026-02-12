$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
$launcherPath = Join-Path $projectDir "start-invest-site.cmd"

if (-not (Test-Path $launcherPath)) {
  throw "Launcher file not found: $launcherPath"
}

$desktopDir = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopDir "T-Invest Local Site.lnk"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcherPath
$shortcut.WorkingDirectory = $projectDir
$shortcut.Description = "Start local T-Invest server and open website"
$shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,220"
$shortcut.Save()

Write-Output "Shortcut created: $shortcutPath"
