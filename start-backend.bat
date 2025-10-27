@echo off
REM Start the FastAPI backend in a separate cmd window (detached)
cd /d "%~dp0"
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8005 --app-dir server
pause
