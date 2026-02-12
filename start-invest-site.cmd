@echo off
setlocal

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
cd /d "%PROJECT_DIR%"

where npm >nul 2>&1
if errorlevel 1 (
  echo npm is not found in PATH. Install Node.js and reopen terminal.
  pause
  exit /b 1
)

start "T-Invest Server" cmd /k "cd /d ""%PROJECT_DIR%"" && npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

endlocal
