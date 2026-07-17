@echo off
echo ============================================
echo   Starting Bee Jeans Frontend (POS)
echo ============================================
echo.

cd frontend-pos

echo Checking if .env exists...
if not exist .env (
    echo ERROR: .env file not found!
    echo Please run setup.bat first
    pause
    exit
)

echo Starting frontend...
echo.
echo App will open on: http://localhost:3000
echo Press Ctrl+C to stop
echo.

call npm run dev
