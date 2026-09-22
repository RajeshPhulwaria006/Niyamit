@echo off
setlocal enabledelayedexpansion

title e-LMPC RADAR - Statutory Packaging Compliance System

echo ==============================================================================
echo        e-LMPC RADAR: Statutory Packaging Compliance System (v2.0)
echo        SIH Problem Statement 26034 ^| Department of Consumer Affairs
echo ==============================================================================
echo.

:: Check for Docker
docker --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Docker detected on your system.
    echo.
    echo Please select an execution mode:
    echo   [1] Docker Compose (RECOMMENDED - Auto-provisions Postgres, Backend, Frontend)
    echo   [2] Native Windows (Runs Python venv + Node.js locally)
    echo   [3] Exit
    echo.
    set /p choice="Enter your choice (1/2/3) [Default: 1]: "
    if "!choice!"=="" set choice=1
    if "!choice!"=="1" goto RUN_DOCKER
    if "!choice!"=="2" goto RUN_NATIVE
    if "!choice!"=="3" goto :eof
) else (
    echo [!] Docker not detected or not in PATH.
    echo Defaulting to Native Windows execution (Python + Node.js)...
    goto RUN_NATIVE
)

:RUN_DOCKER
echo.
echo ==============================================================================
echo Starting e-LMPC RADAR via Docker Compose...
echo PostgreSQL (5432) ^| Backend FastAPI (8000) ^| Frontend Next.js (3000)
echo ==============================================================================
docker compose up --build
goto :eof

:RUN_NATIVE
echo.
echo ==============================================================================
echo Preparing Native Windows Environment...
echo ==============================================================================

:: Check Python
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    py --version >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Python is not installed or not in PATH!
        echo Please download and install Python 3.10, 3.11, or 3.12 from:
        echo https://www.python.org/downloads/
        echo (Remember to check "Add python.exe to PATH" during installation)
        pause
        exit /b 1
    ) else (
        set PY_CMD=py
    )
) else (
    set PY_CMD=python
)

:: Check Node.js
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in PATH!
    echo Please download and install Node.js 18+ from:
    echo https://nodejs.org/
    pause
    exit /b 1
)

:: Ensure .env exists
if not exist .env (
    echo [*] Creating .env from .env.example...
    copy .env.example .env >nul
)

:: 1. Setup Backend Python Virtual Environment
echo [*] Checking Backend virtual environment...
if not exist backend\venv (
    echo [*] Creating Python virtual environment in backend\venv...
    %PY_CMD% -m venv backend\venv
    echo [*] Installing backend dependencies...
    call backend\venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    pip install -r backend\requirements.txt
    call deactivate
) else (
    echo [OK] Backend virtual environment exists.
)

:: 2. Setup Frontend dependencies
echo [*] Checking Frontend dependencies...
if not exist frontend\node_modules (
    echo [*] Installing frontend dependencies (npm install)...
    cd frontend && call npm install && cd ..
) else (
    echo [OK] Frontend node_modules exists.
)

echo.
echo ==============================================================================
echo Launching Services in Separate Windows...
echo ==============================================================================

:: Start Backend in new CMD window
echo [*] Starting FastAPI Backend on http://localhost:8000 ...
start "e-LMPC Backend (:8000)" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

:: Wait 2 seconds
timeout /t 2 /nobreak >nul

:: Start Frontend in new CMD window
echo [*] Starting Next.js Frontend on http://localhost:3000 ...
start "e-LMPC Frontend (:3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==============================================================================
echo   Services are starting in dedicated terminal windows!
echo ==============================================================================
echo   - Web Console:       http://localhost:3000
echo   - Swagger API Docs:  http://localhost:8000/docs
echo.
echo   Note: Make sure PostgreSQL is running on port 5432.
echo   If you don't have PostgreSQL installed, run Docker Desktop or see WINDOWS_GUIDE.md.
echo ==============================================================================
echo.
pause
