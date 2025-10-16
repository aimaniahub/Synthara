@echo off
echo Starting Next.js Frontend Service...
echo ====================================

echo Installing dependencies...
call npm install

echo Starting Next.js development server on http://localhost:3000...
echo Press Ctrl+C to stop the service
echo.

npm run dev

pause
