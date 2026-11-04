@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 from https://nodejs.org, then open this file again.
  pause
  exit /b 1
)
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  call npm ci --ignore-scripts
  if errorlevel 1 goto failed
)
call npm run setup
if errorlevel 1 goto failed
echo.
echo Open http://localhost:3000 in your browser when the server says Ready.
echo Keep this window open. Press Ctrl+C to stop SkillSetu.
call npm run dev
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo SkillSetu could not start. Copy the error above into the Codex chat.
pause
exit /b 1
