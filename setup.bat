@echo off
echo ============================================
echo   Bee Jeans POS - Setup Script
echo ============================================
echo.

echo [1/4] Setting up Backend...
cd backend
if exist node_modules (
    echo Backend dependencies already installed
) else (
    echo Installing backend dependencies...
    call npm install
)
cd ..

echo.
echo [2/4] Setting up Frontend...
cd frontend-pos
if exist node_modules (
    echo Frontend dependencies already installed
) else (
    echo Installing frontend dependencies...
    call npm install
)
cd ..

echo.
echo [3/4] Setting up Admin Dashboard...
cd admin-dashboard
if exist node_modules (
    echo Admin dependencies already installed
) else (
    echo Installing admin dependencies...
    call npm install
)
cd ..

echo.
echo [4/4] Creating .env files...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo Created backend/.env
)
if not exist frontend-pos\.env (
    copy frontend-pos\.env.example frontend-pos\.env
    echo Created frontend-pos/.env
)

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next Steps:
echo 1. Edit backend/.env with your database info
echo 2. Run: start-backend.bat
echo 3. Run: start-frontend.bat
echo.
pause
