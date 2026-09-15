@echo off
chcp 65001 >nul
cls
echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║         Bee Jeans POS - إعداد وتشغيل تلقائي          ║
echo ╚═══════════════════════════════════════════════════════╝
echo.

REM الانتقال لمجلد backend
cd /d "%~dp0backend"

echo 📋 بيانات الاتصال الحالية:
type .env | findstr DATABASE_URL
echo.
echo ⚠️  تأكد أن بيانات PostgreSQL صحيحة في backend\.env
echo    مثال: DATABASE_URL="postgresql://postgres:كلمةالمرور@localhost:5432/bee_jeans_pos?schema=public"
echo.
pause

echo.
echo 🔧 الخطوة 1: توليد Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo ❌ فشل توليد Prisma Client
    pause
    exit /b 1
)
echo ✅ تم توليد Prisma Client

echo.
echo 📦 الخطوة 2: تطبيق Migrations...
echo    (سيتم إنشاء قاعدة البيانات والجداول)
call npx prisma migrate deploy
if errorlevel 1 (
    echo.
    echo ⚠️  محاولة بطريقة أخرى...
    call npx prisma db push --accept-data-loss
    if errorlevel 1 (
        echo ❌ فشل تطبيق Schema
        echo.
        echo 🔍 تأكد من:
        echo    1. PostgreSQL شغال
        echo    2. قاعدة البيانات bee_jeans_pos موجودة
        echo    3. بيانات الاتصال صحيحة في .env
        pause
        exit /b 1
    )
)
echo ✅ تم تطبيق Schema

echo.
echo 🌱 الخطوة 3: إضافة البيانات الأولية...
call node prisma\seed.js
if errorlevel 1 (
    echo ⚠️  تحذير: فشل seed لكن ممكن تكمل يدوي
)
echo ✅ تم إضافة البيانات الأولية

echo.
echo ═══════════════════════════════════════════════════════
echo ✅ تم الإعداد بنجاح!
echo ═══════════════════════════════════════════════════════
echo.
echo 🚀 الآن هنشغل Backend...
echo    (اضغط Ctrl+C لإيقافه)
echo.
timeout /t 3

call npm start
