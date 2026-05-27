 <#
   Clean restart of payroll-app dev server on port 3000
   - Stops any process listening on port 3000
   - Installs dependencies if needed
   - Starts dev server on port 3000
 #>
param(
  [int]$port = 3000
)

$cwd = Split-Path -Leaf -Path $MyInvocation.MyCommand.Path
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Output "Restarting dev server on port $port..."

# Stop existing server on port
$existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  $pids = $existing | Select-Object -ExpandProperty OwningProcess
  foreach ($pid in $pids) {
    Try { Stop-Process -Id $pid -Force -ErrorAction Stop } Catch { } 
  }
}

# Install dependencies
if (Test-Path 'package-lock.json') {
  npm ci
} else {
  npm install
}

# Start dev server
"$pwd"
$env:PORT = [string]$port
Start-Process -FilePath 'npm.cmd' -ArgumentList 'run dev' -WorkingDirectory $pwd -NoNewWindow
Write-Output "Dev server started on port $port"
