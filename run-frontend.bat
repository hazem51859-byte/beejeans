@echo off
chcp 65001 >nul
cls
echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║           Bee Jeans POS - تشغيل Frontend             ║
echo ╚═══════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0frontend-pos"

echo 🚀 تشغيل Frontend...
echo    افتح المتصفح: http://localhost:5173
echo    Username: admin
echo    Password: admin123
echo.
echo    (اضغط Ctrl+C لإيقافه)
echo.
timeout /t 2

call npm run dev
