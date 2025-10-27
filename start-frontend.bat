@echo off
REM Start the Next.js frontend in a separate cmd window (detached)
cd /d "%~dp0"
IF NOT EXIST node_modules (
  echo Installing npm dependencies...
  npm install
)
echo Starting Next dev server (this will block the window)...
npm run dev
pause
