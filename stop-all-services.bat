@echo off
echo Stopping All Services...
echo ========================

echo Stopping Node.js processes (Next.js service)...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo Next.js service stopped
) else (
    echo No Node.js processes found
)

echo.
echo All services stopped!
echo.
pause
