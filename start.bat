@echo off
title HelpDesk Academy
cd /d "%~dp0"
netstat -ano | findstr /r /c:":3300 .*LISTENING" >nul
if not errorlevel 1 (
  echo HelpDesk Academy is already running in the background ^(auto-start^).
  echo To stop it: powershell -ExecutionPolicy Bypass -File deploy\windows\stop-server.ps1
  echo Log file:   data\server.log
  pause
  exit /b
)
if not exist node_modules (
  echo Installing dependencies, one moment...
  call npm install
)
if not exist .env (
  copy .env.example .env >nul
  echo Created .env - add a free GROQ_API_KEY or an ANTHROPIC_API_KEY to it to turn on the AI.
)
node server.js
pause
