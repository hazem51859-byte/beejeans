# 🚂 دليل رفع نظام Bee Jeans POS على Railway

## 📋 نظرة عامة

هذا الدليل يشرح كيفية رفع نظام Bee Jeans POS على Railway مع الحفاظ على جميع البيانات الموجودة.

**ملاحظة مهمة**: ستحتاج إلى خطة Railway المدفوعة (Hobby Plan - $5/شهر) لأن الخطة المجانية محدودة جداً.

---

## 🎯 الخطوات الرئيسية

1. تصدير البيانات من قاعدة البيانات المحلية
2. رفع الكود على GitHub
3. إنشاء مشروع على Railway
4. ربط قاعدة بيانات PostgreSQL
5. رفع Backend API
6. استيراد البيانات
7. رفع Frontend
8. اختبار النظام

---

## 📦 الخطوة 1: تصدير البيانات المحلية

### 1.1 تشغيل سكريبت التصدير

في مجلد المشروع، افتح CMD واكتب:

```cmd
cd backend
node export-database.js
```

### 1.2 التحقق من النسخة الاحتياطية

- سيتم إنشاء مجلد `backend/backup`
- ستجد ملف JSON باسم مثل: `database-backup-2026-07-23T10-30-00.json`
- احتفظ بهذا الملف، ستحتاجه لاحقاً

---

## 📤 الخطوة 2: رفع الكود على GitHub

### 2.1 تجهيز الملفات

تأكد من وجود `.gitignore` في المجلد الرئيسي:

```
node_modules/
.env
*.db
backup/
dist/
build/
.vscode/
.idea/
```

### 2.2 رفع الكود

```cmd
git init
git add .
git commit -m "Initial commit - Ready for Railway deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bee-jeans-pos.git
git push -u origin main
```

⚠️ **استبدل `YOUR_USERNAME` باسم حسابك على GitHub**

---

## 🚂 الخطوة 3: إعداد Railway

### 3.1 إنشاء حساب

1. اذهب إلى [railway.app](https://railway.app)
2. سجل باستخدام GitHub
3. اختر "Hobby Plan" ($5/شهر)

### 3.2 إنشاء مشروع جديد

1. اضغط "New Project"
2. اختر "Deploy from GitHub repo"
3. ابحث عن `bee-jeans-pos` واختره
4. اضغط "Deploy Now"

---

## 🗄️ الخطوة 4: إضافة قاعدة بيانات PostgreSQL

### 4.1 إضافة PostgreSQL

1. في مشروع Railway، اضغط "+ New"
2. اختر "Database"
3. اختر "Add PostgreSQL"
4. انتظر حتى يتم إنشاء قاعدة البيانات

### 4.2 الحصول على معلومات الاتصال

1. اضغط على PostgreSQL في المشروع
2. اذهب إلى "Connect" tab
3. انسخ "PostgreSQL Connection URL"
4. احتفظ بهذا الرابط (سنستخدمه لاحقاً)

---

## ⚙️ الخطوة 5: تكوين Backend

### 5.1 إضافة متغيرات البيئة للـ Backend

1. في مشروع Railway، اضغط على "bee-jeans-pos" (Backend service)
2. اذهب إلى "Variables" tab
3. أضف المتغيرات التالية:

```
DATABASE_URL=<DATABASE_CONNECTION_URL_FROM_STEP_4>
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too-67890
CORS_ORIGIN=*
```

⚠️ **مهم جداً**: غيّر `JWT_SECRET` و `JWT_REFRESH_SECRET` لقيم عشوائية طويلة!

### 5.2 تكوين Build Settings

1. في "Settings" tab للـ Backend:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `node src/server.js`

### 5.3 تحديد Port

في "Settings" → "Networking":
- Public Port: `3000`

### 5.4 Redeploy

اضغط "Deploy" → "Redeploy" لتطبيق التغييرات

---

## 📊 الخطوة 6: استيراد البيانات

### 6.1 رفع ملف النسخة الاحتياطية

هناك طريقتان لاستيراد البيانات:

#### الطريقة الأولى: Railway CLI (موصى بها)

1. تثبيت Railway CLI:
```cmd
npm install -g @railway/cli
```

2. تسجيل الدخول:
```cmd
railway login
```

3. ربط المشروع:
```cmd
railway link
```

4. نسخ ملف النسخة الاحتياطية للسيرفر:
```cmd
cd backend
railway run node import-database.js backup/database-backup-YYYY-MM-DDTHH-MM-SS.json
```

#### الطريقة الثانية: رفع الملف يدوياً

1. افتح Railway Dashboard
2. اذهب لـ Backend Service
3. اضغط "Settings" → "Deploy"
4. ارفع ملف `backup/database-backup-XXX.json` إلى المشروع
5. افتح Railway Shell (من القائمة)
6. شغل الأمر:
```bash
node import-database.js /path/to/backup-file.json
```

### 6.2 التحقق من الاستيراد

راقب logs في Railway Dashboard للتأكد من نجاح الاستيراد.

---

## 🎨 الخطوة 7: رفع Frontend

### 7.1 الحصول على رابط Backend

1. اذهب لـ Backend Service في Railway
2. في "Settings" → "Networking"
3. انسخ "Public Domain" (مثلاً: `bee-jeans-backend.up.railway.app`)

### 7.2 تحديث Frontend Environment

أنشئ/عدل ملف `frontend-pos/.env.production`:

```
VITE_API_URL=https://bee-jeans-backend.up.railway.app/api/v1
```

### 7.3 Push التغييرات

```cmd
git add frontend-pos/.env.production
git commit -m "Add production environment for frontend"
git push
```

### 7.4 إضافة Frontend Service

1. في مشروع Railway، اضغط "+ New"
2. اختر "GitHub Repo"
3. اختر نفس الـ repository
4. في "Settings":
   - **Name**: `bee-jeans-frontend`
   - **Root Directory**: `frontend-pos`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`

### 7.5 إضافة متغيرات البيئة للـ Frontend

في "Variables" tab:

```
VITE_API_URL=https://bee-jeans-backend.up.railway.app/api/v1
```

### 7.6 تثبيت serve

أضف `serve` للـ dependencies في `frontend-pos/package.json`:

```json
{
  "dependencies": {
    "serve": "^14.2.1",
    ...other dependencies
  }
}
```

Commit وPush:

```cmd
cd frontend-pos
git add package.json
git commit -m "Add serve for production"
git push
```

---

## 🔐 الخطوة 8: تحديث CORS

### 8.1 الحصول على رابط Frontend

من Frontend Service في Railway → "Settings" → "Networking" → "Public Domain"

### 8.2 تحديث CORS_ORIGIN

1. اذهب للـ Backend Service
2. في "Variables"
3. عدل `CORS_ORIGIN`:

```
CORS_ORIGIN=https://bee-jeans-frontend.up.railway.app
```

### 8.3 Redeploy Backend

اضغط "Deploy" → "Redeploy"

---

## ✅ الخطوة 9: اختبار النظام

### 9.1 فتح التطبيق

زر رابط Frontend في المتصفح

### 9.2 تسجيل الدخول

استخدم بيانات الدخول المستوردة من قاعدة البيانات المحلية

### 9.3 التحقق من البيانات

- تحقق من ظهور الفروع
- تحقق من المنتجات
- تحقق من المبيعات السابقة
- اختبر إضافة بيانات جديدة

---

## 📱 الخطوة 10: ربط دومين مخصص (اختياري)

### 10.1 شراء دومين

من أي مزود دومينات (Namecheap، GoDaddy، إلخ)

### 10.2 إضافة Domain في Railway

1. Frontend Service → "Settings" → "Domains"
2. اضغط "+ Add Domain"
3. أدخل الدومين الخاص بك
4. اتبع التعليمات لإضافة DNS records

### 10.3 تحديث CORS

بعد ربط الدومين، حدّث `CORS_ORIGIN` في Backend ليشمل الدومين الجديد

---

## 🔧 استكشاف الأخطاء

### المشكلة: Backend لا يعمل

**الحلول**:
- تحقق من Logs في Railway Dashboard
- تأكد من `DATABASE_URL` صحيح
- تأكد من تشغيل migrations: `npx prisma migrate deploy`

### المشكلة: Frontend صفحة بيضاء

**الحلول**:
- تحقق من Build Logs
- تأكد من `VITE_API_URL` صحيح
- افتح Browser Console للبحث عن أخطاء

### المشكلة: CORS Errors

**الحلول**:
- تحقق من `CORS_ORIGIN` في Backend
- تأكد من استخدام HTTPS في كل الروابط
- تأكد من مطابقة الدومينات بدقة

### المشكلة: Database Connection Failed

**الحلول**:
- تحقق من PostgreSQL Service يعمل
- تأكد من `DATABASE_URL` صحيح ويحتوي على جميع المعلومات
- أعد تشغيل Backend Service

---

## 💰 التكلفة المتوقعة

### Railway Hobby Plan ($5/شهر)

يشمل:
- 500 ساعات تشغيل
- $5 رصيد شهري
- غالباً يكفي لمشروع صغير/متوسط

### الاستهلاك المتوقع:

- **Backend**: ~$2-3/شهر
- **Frontend**: ~$0.50-1/شهر
- **PostgreSQL**: ~$1-2/شهر
- **إجمالي**: ~$3.50-6/شهر

⚠️ **راقب الاستهلاك** في Dashboard لتجنب تجاوز الميزانية

---

## 🔄 التحديثات المستقبلية

### عند إجراء تعديلات على الكود:

1. Commit التعديلات:
```cmd
git add .
git commit -m "وصف التعديل"
git push
```

2. Railway سيقوم بالـ auto-deploy تلقائياً

### عند إجراء تعديلات على Database Schema:

1. أنشئ migration محلياً:
```cmd
cd backend
npx prisma migrate dev --name migration_name
```

2. Push التعديلات:
```cmd
git add .
git commit -m "Add database migration"
git push
```

3. Railway سيطبق migrations تلقائياً عند Deploy

---

## 📦 النسخ الاحتياطي الدوري

### إعداد Backup Schedule

من الأفضل أخذ نسخة احتياطية دورية:

1. استخدم Railway CLI لتشغيل export script:
```cmd
railway run node export-database.js
```

2. حمّل الملف الناتج على Google Drive أو Dropbox

3. كرر هذا أسبوعياً/شهرياً حسب الحاجة

---

## 🎉 تم بنجاح!

نظام Bee Jeans POS الآن يعمل على Railway مع جميع البيانات! 🐝👖

### الروابط المهمة:

- **Frontend**: `https://your-frontend.up.railway.app`
- **Backend API**: `https://your-backend.up.railway.app`
- **Railway Dashboard**: `https://railway.app/dashboard`

---

## 📞 الدعم والمساعدة

إذا واجهت مشاكل:

1. راجع Railway Logs (Backend & Frontend)
2. تحقق من Browser Console
3. راجع هذا الدليل مرة أخرى
4. ابحث في [Railway Documentation](https://docs.railway.app)
5. اسأل في [Railway Discord](https://discord.gg/railway)

---

**ملاحظة**: احتفظ بنسخة من الكود محلياً دائماً كنسخة احتياطية!

**ZoTech** - تصميم وتطوير 📱 01139395961
