@echo off
echo ==========================================
echo   IPL Prediction Platform - Backend
echo ==========================================
echo.

echo [1/3] Creating virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

echo [2/3] Installing Python dependencies...
pip install -r requirements.txt

echo [3/3] Starting FastAPI server...
echo.
echo Backend running at: http://localhost:8000
echo API docs at: http://localhost:8000/docs
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
