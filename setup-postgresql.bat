@echo off
chcp 65001 >nul
echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║           إعداد PostgreSQL - Bee Jeans POS           ║
echo ╚═══════════════════════════════════════════════════════╝
echo.
echo 📋 تأكد أنك عدلت ملف backend\.env بيانات PostgreSQL
echo.
echo بيانات الاتصال الحالية:
type backend\.env | findstr DATABASE_URL
echo.
pause

cd backend

echo.
echo 🔧 1. توليد Prisma Client...
call npx prisma generate

echo.
echo 📦 2. تطبيق Migrations...
call npx prisma migrate dev --name init

echo.
echo 🌱 3. إضافة البيانات الأولية...
call node prisma\seed.js

echo.
echo ✅ تم الإعداد بنجاح!
echo.
echo 🚀 الآن شغل:
echo    - Backend: npm start (في backend)
echo    - Frontend: npm run dev (في frontend-pos)
echo.
pause
