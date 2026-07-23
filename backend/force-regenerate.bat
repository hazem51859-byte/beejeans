@echo off
echo ============================================
echo Force Regenerate Prisma Client
echo ============================================
echo.

echo Step 1: Killing Node processes...
taskkill /F /IM node.exe /T 2>nul
if %errorlevel% == 0 (
    echo ✓ Node processes killed
) else (
    echo - No Node processes running
)
echo.

echo Step 2: Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo.

echo Step 3: Cleaning Prisma cache...
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma"
    echo ✓ Prisma cache cleaned
) else (
    echo - Prisma cache not found
)
echo.

echo Step 4: Regenerating Prisma Client...
node regenerate-prisma.js
echo.

echo ============================================
echo Done! Now start your backend server
echo ============================================
pause
