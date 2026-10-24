@echo off
setlocal enabledelayedexpansion

title JEE Insight AI - FastAPI Backend Service
cd /d "%~dp0"

echo ========================================================
echo        JEE INSIGHT AI - FASTAPI BACKEND LAUNCHER
echo ========================================================
echo.

:: 1. Set PYTHONPATH to root and backend
set "PYTHONPATH=%~dp0;%~dp0backend;!PYTHONPATH!"
set "DISABLE_SQLALCHEMY_CEXT=1"

:: 2. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found on your system PATH!
    echo Please install Python 3.10+ and ensure 'Add to PATH' is checked.
    echo.
    pause
    exit /b 1
)

:: 3. Check Virtual Environment
if not exist "backend\.venv\Scripts\python.exe" (
    echo [*] Python virtual environment not found. Creating 'backend\.venv'...
    cd backend
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
    echo [*] Installing backend dependencies from requirements.txt...
    call .venv\Scripts\pip.exe install --upgrade pip
    call .venv\Scripts\pip.exe install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install backend dependencies!
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Virtual environment prepared successfully.
)

:: 4. Seed Database if needed
echo [*] Initializing database and ensuring taxonomy seed data...
call backend\.venv\Scripts\python.exe -m backend.app.seed.seeder
call backend\.venv\Scripts\python.exe backend\app\seed\pyq_importer.py

:: 5. Start Uvicorn Server
echo.
echo ========================================================
echo [*] Starting FastAPI Backend on http://127.0.0.1:8000
echo [*] Swagger Interactive Documentation: http://127.0.0.1:8000/docs
echo [*] System Health Endpoint: http://127.0.0.1:8000/api/v1/health
echo [*] Press Ctrl+C to terminate the backend server.
echo ========================================================
echo.

call backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

pause
