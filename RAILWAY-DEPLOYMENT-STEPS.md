# خطوات رفع المشروع على Railway 🚂

## ✅ تم بالفعل
- ✅ رفع الكود على GitHub: https://github.com/hazem51859-byte/beejeans
- ✅ إعداد ملفات Railway (nixpacks.toml, railway.json)
- ✅ إصلاح أرصدة العملاء (الموجب = لينا عنده، السالب = علينا ليه)

---

## 📋 الخطوات المطلوبة في Railway

### 1️⃣ إضافة PostgreSQL Database
1. افتح Railway Dashboard: https://railway.app/dashboard
2. اختار الـ Project بتاعك (أو اعمل New Project)
3. اضغط **"+ New"**
4. اختار **"Database"**
5. اختار **"Add PostgreSQL"**
6. Railway هيعمل database تلقائياً ✅

---

### 2️⃣ إضافة Backend Service
1. في نفس الـ Project، اضغط **"+ New"**
2. اختار **"GitHub Repo"**
3. اختار **hazem51859-byte/beejeans**
4. اختار folder: **`backend`**

#### إعدادات Backend:
**في Variables Tab:**
- `DATABASE_URL` - هيتضاف تلقائياً من PostgreSQL ✅
- `JWT_SECRET` - أضف أي نص سري (مثال: `your-super-secret-jwt-key-2026`)
- `NODE_ENV` - اكتب: `production`
- `PORT` - اكتب: `3000`

**في Settings → Deploy:**
- ✅ Build Command: `npm install && npx prisma generate`
- ✅ Start Command: `npx prisma migrate deploy && npm start`
- ✅ Root Directory: `/backend`

---

### 3️⃣ إضافة Frontend Service
1. في نفس الـ Project، اضغط **"+ New"**
2. اختار **"GitHub Repo"**
3. اختار **hazem51859-byte/beejeans**
4. اختار folder: **`frontend-pos`**

#### إعدادات Frontend:

**أولاً: اجيب رابط الـ Backend:**
1. افتح **Backend Service** في Railway
2. روح **Settings → Networking → Domains**
3. انسخ الـ URL (مثال: `backend-production-1a2b.up.railway.app`)

**ثانياً: في Variables Tab:**
- `VITE_API_URL` - ضع رابط الـ Backend مع `/api/v1`
  - ⚠️ مثال صحيح: `https://backend-production-xxxx.up.railway.app/api/v1`
  - ✅ لازم يبدأ بـ `https://`
  - ✅ لازم ينتهي بـ `/api/v1`
  - ❌ متحطش trailing slash في الآخر

**ثالثاً: في Settings → Deploy:**
- ✅ Build Command: `npm install && npm run build`
- ✅ Start Command: `npx serve -s dist -l 4000`
- ✅ Root Directory: `/frontend-pos`

---

### 4️⃣ ربط الخدمات ببعض
1. في Backend service → **Variables**
2. تأكد إن `DATABASE_URL` موجود (لو مش موجود):
   - اضغط **"+ Reference"**
   - اختار PostgreSQL database
   - اختار `DATABASE_URL`

---

### 5️⃣ Deploy & Test
1. Backend هيعمل deploy تلقائياً
2. Frontend هيعمل deploy تلقائياً
3. استني شوية (2-5 دقايق) لحد ما الـ deployment يخلص

**Check Logs:**
- Backend → **Deployments** → شوف الـ Logs
- لو في error، ابعتهولي وأنا هساعدك

---

## 🔗 الروابط المتوقعة بعد الـ Deployment

| Service | URL |
|---------|-----|
| **Backend API** | `https://backend-production-xxxx.up.railway.app` |
| **Frontend POS** | `https://frontend-pos-production-xxxx.up.railway.app` |
| **PostgreSQL** | Internal only (Railway private network) |

---

## ⚠️ ملاحظات مهمة

### البيانات الافتتاحية:
الـ database هيبدأ فاضي. محتاج تعمل:
1. تسجيل أول مستخدم (Admin)
2. إضافة الفروع
3. تشغيل script لإضافة البيانات الافتتاحية:

```bash
# على جهازك المحلي، غير DATABASE_URL لـ Railway database
DATABASE_URL="postgresql://..." node backend/fix-customers-notes.js
```

### أو ارفع Database Backup:
1. استخدم الـ backup الموجود: `backend/backup/`
2. في Railway PostgreSQL → Data → Import SQL
3. ارفع الـ `.sql` file

---

## 🐛 لو حصل مشاكل

### Error: Environment variable not found: DATABASE_URL
✅ **الحل:** تأكد إنك عملت PostgreSQL database أول حاجة وربطته بالـ Backend

### Error: prisma migrate failed
✅ **الحل:** شوف الـ logs في Railway → Backend → Deployments
- غالباً مشكلة في الـ connection string

### Frontend ما بيتصلش بالـ Backend
✅ **الحل:** تأكد إن `VITE_API_URL` في Frontend variables صحيح

---

## 📞 محتاج مساعدة؟
ابعتلي screenshot من:
1. Railway Dashboard (الخدمات كلها)
2. Backend Deployment Logs
3. أي error messages

---

**آخر تحديث:** 27 أغسطس 2026
**GitHub Repo:** https://github.com/hazem51859-byte/beejeans
