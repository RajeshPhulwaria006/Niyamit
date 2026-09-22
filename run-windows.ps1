# ==============================================================================
# e-LMPC RADAR - Windows PowerShell Orchestrator
# SIH 2026 Problem Statement 26034 | Department of Consumer Affairs
# ==============================================================================

[CmdletBinding()]
param(
    [ValidateSet("docker", "native", "auto")]
    [string]$Mode = "auto"
)

$Host.UI.RawUI.WindowTitle = "e-LMPC RADAR - Statutory Packaging Compliance System"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "        e-LMPC RADAR: Statutory Packaging Compliance System (v2.0)            " -ForegroundColor Cyan
Write-Host "        SIH Problem Statement 26034 | Department of Consumer Affairs         " -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Helper: Check if a command exists in PATH
function Test-CommandExists {
    param([string]$Cmd)
    return [bool](Get-Command $Cmd -ErrorAction SilentlyContinue)
}

$hasDocker = Test-CommandExists "docker"

if ($Mode -eq "auto") {
    if ($hasDocker) {
        Write-Host "[OK] Docker detected on your system." -ForegroundColor Green
        Write-Host ""
        Write-Host "Please select execution mode:" -ForegroundColor Yellow
        Write-Host "  [1] Docker Compose (RECOMMENDED - Auto-starts Postgres, Backend, Frontend)" -ForegroundColor White
        Write-Host "  [2] Native Windows (Runs local Python venv + Node.js)" -ForegroundColor White
        Write-Host "  [3] Exit" -ForegroundColor Gray
        Write-Host ""
        $choice = Read-Host "Enter your choice (1/2/3) [Default: 1]"
        if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "1") {
            $Mode = "docker"
        } elseif ($choice -eq "2") {
            $Mode = "native"
        } else {
            exit 0
        }
    } else {
        Write-Host "[!] Docker not found. Proceeding with Native Windows mode..." -ForegroundColor Yellow
        $Mode = "native"
    }
}

# ------------------------------------------------------------------------------
# Mode 1: Docker Compose
# ------------------------------------------------------------------------------
if ($Mode -eq "docker") {
    Write-Host ""
    Write-Host "[*] Starting e-LMPC RADAR with Docker Compose..." -ForegroundColor Green
    Write-Host "    - PostgreSQL on port 5432" -ForegroundColor Gray
    Write-Host "    - Backend FastAPI on port 8000" -ForegroundColor Gray
    Write-Host "    - Frontend Next.js on port 3000" -ForegroundColor Gray
    Write-Host ""
    Set-Location $ScriptDir
    docker compose up --build
    exit $LASTEXITCODE
}

# ------------------------------------------------------------------------------
# Mode 2: Native Windows (Python + Node.js)
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[*] Checking Native Windows Prerequisites..." -ForegroundColor Cyan

# 1. Check Python
$pyCmd = $null
if (Test-CommandExists "python") {
    $pyCmd = "python"
} elseif (Test-CommandExists "py") {
    $pyCmd = "py"
} else {
    Write-Host "[ERROR] Python is not installed or not in your PATH!" -ForegroundColor Red
    Write-Host "Please install Python 3.10, 3.11, or 3.12 from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Ensure 'Add python.exe to PATH' is checked during setup." -ForegroundColor Yellow
    exit 1
}
$pyVersion = & $pyCmd --version
Write-Host "[OK] Detected Python: $pyVersion" -ForegroundColor Green

# 2. Check Node & NPM
if (-not (Test-CommandExists "npm")) {
    Write-Host "[ERROR] Node.js / npm is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
$nodeVersion = node --version
Write-Host "[OK] Detected Node.js: $nodeVersion" -ForegroundColor Green

# 3. Check / Create .env
$envFile = Join-Path $ScriptDir ".env"
$envExample = Join-Path $ScriptDir ".env.example"
if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Write-Host "[*] Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item $envExample $envFile
    }
}

# 4. Check PostgreSQL Port 5432
$pgReachable = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 5432)
    $pgReachable = $tcp.Connected
    $tcp.Close()
} catch {
    $pgReachable = $false
}

if ($pgReachable) {
    Write-Host "[OK] PostgreSQL detected active on localhost:5432" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: No PostgreSQL service detected on localhost:5432." -ForegroundColor Yellow
    if ($hasDocker) {
        Write-Host "[*] Starting standalone PostgreSQL container 'lmpc-postgres'..." -ForegroundColor Cyan
        docker run -d --name lmpc-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=lmpc_db -p 5432:5432 postgres:16-alpine 2>$null
    } else {
        Write-Host "[!] Please ensure PostgreSQL is running locally with credentials in .env before scanning packages." -ForegroundColor Yellow
    }
}

# 5. Setup Backend Virtual Environment
$backendDir = Join-Path $ScriptDir "backend"
$venvDir = Join-Path $backendDir "venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$venvUvicorn = Join-Path $venvDir "Scripts\uvicorn.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "[*] Creating Python virtual environment in backend\venv..." -ForegroundColor Cyan
    & $pyCmd -m venv $venvDir
    Write-Host "[*] Installing backend dependencies..." -ForegroundColor Cyan
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt")
} else {
    Write-Host "[OK] Python virtual environment ready." -ForegroundColor Green
}

# 6. Setup Frontend dependencies
$frontendDir = Join-Path $ScriptDir "frontend"
$frontendModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $frontendModules)) {
    Write-Host "[*] Installing frontend dependencies (npm install)..." -ForegroundColor Cyan
    Set-Location $frontendDir
    npm install
    Set-Location $ScriptDir
} else {
    Write-Host "[OK] Frontend dependencies ready." -ForegroundColor Green
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "  Launching Backend and Frontend in Dedicated Windows...                      " -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green

# Launch Backend in new window
Start-Process cmd.exe -ArgumentList "/k cd /d `"$backendDir`" && `"$venvDir\Scripts\activate.bat`" && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

# Launch Frontend in new window
Start-Process cmd.exe -ArgumentList "/k cd /d `"$frontendDir`" && npm run dev"

Write-Host ""
Write-Host "  💻 Frontend Web Portal: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  ⚡ FastAPI Swagger Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close this launcher (the servers will keep running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
