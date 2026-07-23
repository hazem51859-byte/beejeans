@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════
echo    🚂 تحديث المشروع على Railway
echo ═══════════════════════════════════════════════
echo.

echo 📦 الخطوة 1: تصدير البيانات المحلية...
cd backend
call node export-database.js
if %errorlevel% neq 0 (
    echo ❌ فشل تصدير البيانات!
    pause
    exit /b 1
)
cd ..
echo ✅ تم تصدير البيانات بنجاح
echo.

echo 📤 الخطوة 2: رفع التعديلات على GitHub...
git add .
git status
echo.
set /p commit_msg="📝 أدخل وصف التحديث (أو اضغط Enter للاستخدام الافتراضي): "
if "%commit_msg%"=="" set commit_msg=Update project with latest changes

git commit -m "%commit_msg%"
git push origin main

if %errorlevel% neq 0 (
    echo ❌ فشل رفع التعديلات!
    pause
    exit /b 1
)

echo ✅ تم رفع التعديلات بنجاح
echo.
echo ═══════════════════════════════════════════════
echo    ✅ انتهت الخطوات التلقائية
echo ═══════════════════════════════════════════════
echo.
echo 📋 الخطوات التالية:
echo.
echo 1️⃣  انتظر Railway Deploy ينتهي (2-3 دقائق)
echo     🔗 افتح: https://railway.app/dashboard
echo.
echo 2️⃣  استورد البيانات باستخدام Railway CLI:
echo.
echo     railway login
echo     railway link
echo     cd backend
echo     railway run node import-database.js backup\database-backup-XXX.json
echo.
echo 3️⃣  أو استخدم Railway Dashboard → Shell
echo.
echo ═══════════════════════════════════════════════
echo.
pause
