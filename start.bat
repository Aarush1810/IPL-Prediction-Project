@echo off
echo ==========================================
echo   IPL Prediction Platform - Quick Start
echo ==========================================
echo.

echo Choose an option:
echo [1] Start Backend only
echo [2] Start Frontend only
echo [3] Start Both (Backend + Frontend)
echo [4] Install all dependencies
echo [5] Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto backend
if "%choice%"=="2" goto frontend
if "%choice%"=="3" goto both
if "%choice%"=="4" goto install
if "%choice%"=="5" exit
goto start

:backend
echo.
echo Starting Backend...
cd backend
call start_backend.bat
goto start

:frontend
echo.
echo Starting Frontend...
cd frontend
call start_frontend.bat
goto start

:both
echo.
echo Starting Backend...
start cmd /k "cd backend && call start_backend.bat"
timeout /t 3
echo Starting Frontend...
start cmd /k "cd frontend && call start_frontend.bat"
echo.
echo Both servers starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
goto start

:install
echo.
echo Installing Backend dependencies...
cd backend
pip install -r requirements.txt
cd ..
echo.
echo Installing Frontend dependencies...
cd frontend
npm install
cd ..
echo.
echo All dependencies installed!
goto start

:start
pause
