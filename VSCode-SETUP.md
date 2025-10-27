VS Code workspace setup for Forensic-AI

This repository includes `.vscode` workspace files to make local development easier.

Quick steps to update VS Code and run the project

1. Open the folder in VS Code

   - File -> Open Folder -> select `Forensic-AI-main`.

2. Accept recommended extensions

   - A prompt will appear asking to install recommended extensions. Install them (ESLint, Prettier, Python, Pylance, Tailwind CSS IntelliSense, IntelliCode, GitLens).

3. Set Python interpreter

   - Press Ctrl+Shift+P -> Python: Select Interpreter -> choose `${workspaceFolder}\\.venv\\Scripts\\python.exe` if available.

4. Running tasks

   - Ctrl+Shift+P -> Tasks: Run Task -> choose one of:
     - "Install Python Deps" (installs server requirements into local `.venv`)
     - "Start Backend" (starts the backend in a new terminal)
     - "Start Frontend" (starts Next dev server in a new terminal)
     - "Typecheck (tsc - increased memory)" (run TypeScript check with larger Node memory allocation)

5. Debugging / Launch

   - Open Run and Debug -> pick "Run Next.js (dev)" to start the frontend in an integrated terminal.
   - Use "Run Backend (uvicorn)" to start the FastAPI backend via the selected Python interpreter.

6. PowerShell execution policy note (Windows)

   - If `npm` scripts are blocked by PowerShell (error about `npm.ps1`), either:
     - Use the provided tasks which open a Command Prompt terminal (recommended), or
     - Run an elevated PowerShell and set `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.

7. Tesseract OCR (optional)
   - If you want to use `pytesseract` backend reliably, install Tesseract OCR binary and ensure it's in PATH.
   - Windows installer: https://github.com/tesseract-ocr/tesseract

If you want, I can now:

- Run the TypeScript check using the task I added (it may succeed with increased memory), or
- Replace `launch.json` with configurations that match your installed debugger extensions precisely.
