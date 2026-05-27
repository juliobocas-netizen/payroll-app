param(
  [int]$Port = 3000
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Output "Stopping any existing process on port $Port..."
$conn = netstat -ano | Select-String ":$Port"
if ($conn) {
  $pids = $conn | ForEach-Object { $_ -split '\s+' | Select-Object -Last 1 }
  $pids | ForEach-Object {
    $procId = $_
    try { taskkill /F /PID $procId 2>$null } catch {}
  }
  Start-Sleep -Seconds 2
}

Write-Output "Installing dependencies..."
if (Test-Path "package-lock.json") { npm ci } else { npm install }

Write-Output "Starting dev server on port $Port..."
$env:PORT = "$Port"
npm run dev
