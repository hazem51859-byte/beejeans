@echo off
echo ============================================
echo   Starting Bee Jeans Backend Server
echo ============================================
echo Checking if .env exists...
if not exist ".env" (
    echo Error: .env file not found!
    pause
    exit /b 1
)

echo Starting backend server...
echo Server will run on: http://localhost:5000
echo Press Ctrl+C to stop
echo.
npm run dev
