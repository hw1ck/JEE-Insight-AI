@echo off
setlocal enabledelayedexpansion

title JEE Insight AI - Full Stack Launcher
cd /d "%~dp0"

echo ========================================================
echo        JEE INSIGHT AI - FULL STACK APPLICATION LAUNCHER
echo ========================================================
echo.
echo [*] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "JEE Insight AI - Backend" cmd /c "start_backend.bat"

echo [*] Waiting 3 seconds for backend to bind port...
ping 127.0.0.1 -n 4 >nul

echo [*] Launching React + Vite Frontend on http://localhost:5173 ...
start "JEE Insight AI - Frontend" cmd /c "dev.bat"

echo.
echo ========================================================
echo [*] Both Backend and Frontend services are running!
echo [*] Frontend Web App:     http://localhost:5173
echo [*] Backend API ^& Docs:   http://127.0.0.1:8000/docs
echo ========================================================
echo.
echo [*] Services are running in their respective console windows.
echo [*] Press any key to close this launcher window...
pause >nul

