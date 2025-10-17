@echo off
echo ========================================
echo    Synthara AI Platform Launcher
echo ========================================
echo.
echo This will start the Synthara AI platform
echo including all necessary services.
echo.
echo Services to be started:
echo - Next.js Frontend (http://localhost:3000)
echo - Database connection (Supabase)
echo - AI services (Gemini, SerpAPI)
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting Synthara AI Platform...
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Dashboard: http://localhost:3000/dashboard
echo Auth: http://localhost:3000/auth
echo.
echo Press Ctrl+C to stop the service
echo ========================================
echo.

npm run dev

echo.
echo Service stopped.
pause
