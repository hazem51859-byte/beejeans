# 🔄 تحديث المشروع على Railway بالبيانات الجديدة

## الخطوات السريعة

### 🗄️ الخطوة 1: تصدير البيانات المحلية

افتح CMD في مجلد المشروع:

```cmd
cd backend
node export-database.js
```

**النتيجة**: 
- ملف النسخة الاحتياطية في `backend/backup/database-backup-YYYY-MM-DDTHH-MM-SS.json`
- احتفظ باسم الملف (هتحتاجه بعدين)

---

### 📤 الخطوة 2: رفع التعديلات على GitHub

```cmd
git add .
git commit -m "Update: Returns system, Customer invoices, Payment allocation, Dashboard fixes, ZoTech footer"
git push origin main
```

**Railway هيعمل Auto-deploy تلقائياً!**

---

### ⏳ الخطوة 3: انتظار Deploy

1. افتح [Railway Dashboard](https://railway.app/dashboard)
2. شوف Backend Service
3. انتظر حتى Deploy ينتهي (عادة 2-3 دقائق)
4. تأكد إن الـ Build نجح ومفيش أخطاء

---

### 📊 الخطوة 4: استيراد البيانات الجديدة

#### الطريقة الأولى: باستخدام Railway CLI (الأسهل) ✅

**1. تثبيت Railway CLI** (لو مش مثبت):
```cmd
npm install -g @railway/cli
```

**2. تسجيل الدخول**:
```cmd
railway login
```
هيفتح المتصفح لتأكيد تسجيل الدخول

**3. ربط المشروع**:
```cmd
railway link
```
اختار المشروع بتاعك من القائمة

**4. رفع ملف البيانات**:
```cmd
cd backend
railway run node import-database.js backup/database-backup-YYYY-MM-DDTHH-MM-SS.json
```

⚠️ **استبدل اسم الملف بالاسم الحقيقي من الخطوة 1**

---

#### الطريقة الثانية: باستخدام Railway Dashboard

**1. رفع الملف**:
- افتح Railway Dashboard
- اذهب للـ Backend Service
- اضغط على "..." (القائمة)
- اختر "Settings" → "Deploy"
- ارفع ملف `backup/database-backup-XXX.json`

**2. فتح Shell**:
- في Backend Service، اضغط "..." 
- اختر "Shell" أو "Terminal"

**3. تشغيل الاستيراد**:
```bash
cd /app
node import-database.js backup/database-backup-YYYY-MM-DDTHH-MM-SS.json
```

---

#### الطريقة الثالثة: استخدام pgAdmin (للخبراء)

إذا كنت تفضل استخدام SQL مباشرة:

**1. احصل على Database URL**:
- في Railway → PostgreSQL Service
- انسخ "PostgreSQL Connection URL"

**2. افتح pgAdmin**:
- أضف Server جديد
- استخدم معلومات الاتصال من Railway

**3. صدّر من المحلي**:
```cmd
cd backend
node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); (async()=>{await prisma.$executeRaw\`COPY (...)\`})();"
```

أو استخدم pgAdmin export/import مباشرة

---

### ✅ الخطوة 5: التحقق من النجاح

**1. افتح Frontend على Railway**

**2. سجل دخول بحساب موجود**

**3. تحقق من**:
- ✓ الفروع موجودة
- ✓ المنتجات موجودة
- ✓ المبيعات السابقة موجودة
- ✓ العملاء والموردين
- ✓ صفحة المرتجعات الجديدة
- ✓ نظام تحصيل الدفعات الجديد
- ✓ Footer ZoTech يظهر في كل الصفحات
- ✓ Dashboard يعرض الأرقام الصحيحة

---

### 🔐 الخطوة 6: تحديث CORS (إذا لزم الأمر)

إذا كان عندك دومين مخصص أو Frontend URL اتغير:

**1. اذهب لـ Backend Service في Railway**

**2. في Variables tab**:
```
CORS_ORIGIN=https://your-frontend-url.up.railway.app
```

**3. احفظ واعمل Redeploy**

---

## 🚨 حل المشاكل السريع

### مشكلة: Import فشل

**السبب**: Migrations لم تُطبق بعد

**الحل**:
```bash
railway run npx prisma migrate deploy
railway run node import-database.js backup/file.json
```

---

### مشكلة: Database URL غلط

**الحل**:
1. في Railway → PostgreSQL Service
2. Connect tab → انسخ الـ URL الصحيح
3. في Backend Service → Variables
4. تأكد من `DATABASE_URL` صحيح
5. Redeploy

---

### مشكلة: Frontend مش شغال

**الحل**:
1. تحقق من Logs في Frontend Service
2. تأكد من `VITE_API_URL` صحيح في Variables
3. Redeploy Frontend

---

## 📋 Checklist سريع

قبل ما تبدأ:
- [ ] صدّرت البيانات محلياً (`node export-database.js`)
- [ ] احتفظت باسم ملف النسخة الاحتياطية
- [ ] عملت commit للتعديلات
- [ ] عملت push على GitHub

أثناء التحديث:
- [ ] Railway deploy نجح للـ Backend
- [ ] Migrations اتطبقت (`prisma migrate deploy`)
- [ ] البيانات اتستوردت بنجاح
- [ ] Railway deploy نجح للـ Frontend

بعد التحديث:
- [ ] سجلت دخول بنجاح
- [ ] البيانات القديمة موجودة
- [ ] الميزات الجديدة شغالة
- [ ] Dashboard يعرض أرقام صحيحة
- [ ] Footer ZoTech ظاهر

---

## 💡 نصائح مهمة

### النسخ الاحتياطي
- احتفظ بملف النسخة الاحتياطية على جهازك
- اعمل نسخة احتياطية قبل أي تحديث كبير
- ممكن ترفع النسخ الاحتياطية على Google Drive

### المراقبة
- راقب استهلاك Railway من Dashboard
- تابع Logs بانتظام للبحث عن أخطاء
- اعمل test للميزات الجديدة قبل الاعتماد عليها

### الأمان
- لا ترفع ملفات `.env` على GitHub أبداً
- غيّر JWT secrets في Production
- استخدم Environment Variables في Railway

---

## 🎯 الأوامر المختصرة

### تصدير البيانات:
```cmd
cd backend && node export-database.js
```

### رفع التعديلات:
```cmd
git add . && git commit -m "Update with new features" && git push
```

### استيراد البيانات (Railway CLI):
```cmd
cd backend && railway run node import-database.js backup/database-backup-XXX.json
```

### التحقق من Logs:
```cmd
railway logs
```

---

## 🎉 خلصنا!

دلوقتي المشروع محدّث على Railway بكل التعديلات والبيانات الجديدة! 🚂

**ZoTech** - تصميم وتطوير 📱 01139395961
