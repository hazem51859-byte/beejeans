@echo off
echo ============================================
echo   Starting Bee Jeans Backend Server
echo ============================================
echo.

cd backend

echo Checking if .env exists...
if not exist .env (
    echo ERROR: .env file not found!
    echo Please run setup.bat first
    pause
    exit
)

echo Starting backend server...
echo.
echo Server will run on: http://localhost:5000
echo Press Ctrl+C to stop
echo.

call npm run dev
