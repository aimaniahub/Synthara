@echo off
echo Starting Synthara AI Platform
echo =============================
echo.
echo This will start:
echo 1. Next.js Frontend Service (http://localhost:3000)
echo.
echo Press any key to continue...
pause

echo.
echo Starting Next.js Service in new window...
start "Next.js Service" cmd /k "npm run dev"

echo.
echo Service is starting...
echo.
echo Next.js Frontend: http://localhost:3000
echo.
echo To stop service, close the command window or press Ctrl+C
echo.
echo Press any key to exit this launcher...
pause
