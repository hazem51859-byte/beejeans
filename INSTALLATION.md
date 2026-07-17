# 🚀 دليل التثبيت والتشغيل - Installation Guide

## Bee 🐝 JEANS - نظام نقاط البيع

---

قبل البدء، تأكد من تثبيت البرامج التالية:

- **Node.js** (v18 أو أحدث) - [تحميل من هنا](https://nodejs.org/)
- **PostgreSQL** (v14 أو أحدث) - [تحميل من هنا](https://www.postgresql.org/download/)
- **Git** - [تحميل من هنا](https://git-scm.com/)

---

## 📦 الخطوة 1: تثبيت Backend (السيرفر)

### 1. انتقل إلى مجلد Backend

```bash
cd backend
```

### 2. تثبيت الحزم المطلوبة

```bash
npm install
```

### 3. إعداد قاعدة البيانات

#### أ. إنشاء قاعدة بيانات PostgreSQL

افتح PostgreSQL وقم بتشغيل:

```sql
CREATE DATABASE pos_system;
```

#### ب. نسخ ملف الإعدادات

```bash
copy .env.example .env
```

على Linux/Mac:
```bash
cp .env.example .env
```

#### ج. تعديل ملف `.env`

افتح ملف `.env` وعدل البيانات التالية:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/pos_system?schema=public"
JWT_SECRET=your-super-secret-key-here-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key-here
```

**استبدل:**
- `username` باسم مستخدم PostgreSQL
- `password` بكلمة مرور PostgreSQL

### 4. إنشاء جداول قاعدة البيانات

```bash
npx prisma migrate dev --name init
```

### 5. إضافة بيانات تجريبية

```bash
npm run seed
```

**سيتم إنشاء:**
- مستخدم Admin: `admin` / `admin123`
- مستخدم Manager: `manager1` / `manager123`
- كاشير 1: `cashier1` / `cashier123`
- كاشير 2: `cashier2` / `cashier123`
- فرعين (المعادي - مدينة نصر)
- منتجات تجريبية

### 6. تشغيل السيرفر

```bash
npm run dev
```

**السيرفر سيعمل على:** `http://localhost:5000`

✅ **تأكد من ظهور:**
```
✅ Database connected successfully
🚀 Server running on port 5000
```

---

## 🖥️ الخطوة 2: تثبيت Frontend (واجهة المستخدم)

### 1. افتح نافذة Terminal جديدة وانتقل إلى مجلد Frontend

```bash
cd frontend-pos
```

### 2. تثبيت الحزم المطلوبة

```bash
npm install
```

### 3. نسخ ملف الإعدادات

```bash
copy .env.example .env
```

على Linux/Mac:
```bash
cp .env.example .env
```

### 4. تشغيل التطبيق

```bash
npm run dev
```

**التطبيق سيعمل على:** `http://localhost:3000`

✅ **افتح المتصفح وانتقل إلى:** `http://localhost:3000`

---

## 🔑 تسجيل الدخول

استخدم أحد الحسابات التالية:

### مدير النظام (Admin)
- **Username:** `admin`
- **Password:** `admin123`
- **الصلاحيات:** الوصول الكامل لكل شيء

### مدير فرع (Manager)
- **Username:** `manager1`
- **Password:** `manager123`
- **الفرع:** فرع المعادي
- **الصلاحيات:** إدارة الفرع والموظفين

### كاشير (Cashier)
- **Username:** `cashier1`
- **Password:** `cashier123`
- **الفرع:** فرع المعادي
- **الصلاحيات:** نقطة البيع فقط

---

## 📝 استخدام النظام

### 1. فتح شيفت (Shift)

قبل البدء في البيع:

1. اذهب إلى **الإعدادات**
2. اختر تبويب **إدارة الشيفت**
3. أدخل **الرصيد الافتتاحي** (مثلاً: 1000 جنيه)
4. اضغط **فتح الشيفت**

### 2. إجراء عملية بيع

1. اذهب إلى **نقطة البيع**
2. ابحث عن المنتجات بالاسم أو الباركود
3. أضف المنتجات للسلة
4. اختر طريقة الدفع
5. أدخل المبلغ المدفوع
6. اضغط **إتمام البيع**

### 3. إغلاق الشيفت

1. اذهب إلى **الإعدادات**
2. عد النقود في الكاشير
3. أدخل **الرصيد النقدي الفعلي**
4. اضغط **إغلاق الشيفت**

---

## 🛠️ الأوامر المهمة

### Backend

```bash
npm run dev          # تشغيل السيرفر في وضع التطوير
npm start            # تشغيل السيرفر في وضع الإنتاج
npm run migrate      # تشغيل migrations للقاعدة
npm run seed         # إضافة بيانات تجريبية
npm run studio       # فتح Prisma Studio لإدارة القاعدة
```

### Frontend

```bash
npm run dev          # تشغيل التطبيق
npm run build        # بناء للإنتاج
npm run preview      # معاينة النسخة المبنية
```

---

## 🔍 استكشاف الأخطاء

### ❌ خطأ في الاتصال بقاعدة البيانات

**الحل:**
1. تأكد من تشغيل PostgreSQL
2. تأكد من صحة بيانات الاتصال في `.env`
3. تأكد من وجود قاعدة البيانات

### ❌ Port 5000 مستخدم

**الحل:**
```bash
# غير PORT في ملف .env
PORT=5001
```

### ❌ خطأ "Cannot find module"

**الحل:**
```bash
# احذف node_modules وأعد التثبيت
rmdir /s /q node_modules
npm install
```

---

## 📊 Prisma Studio (إدارة قاعدة البيانات)

لفتح واجهة إدارة القاعدة:

```bash
cd backend
npx prisma studio
```

سيفتح على: `http://localhost:5555`

---

## 🌐 Socket.io (التحديثات اللحظية)

النظام يستخدم Socket.io لإرسال التحديثات اللحظية:
- عند إتمام عملية بيع جديدة
- عند فتح/إغلاق شيفت
- عند تحديث المخزون

---

## 📱 التطوير للإنتاج

### 1. بناء Backend

```bash
cd backend
# تأكد من تحديث .env بإعدادات الإنتاج
NODE_ENV=production
npm start
```

### 2. بناء Frontend

```bash
cd frontend-pos
npm run build
```

الملفات المبنية ستكون في مجلد `dist/`

---

## 🔐 الأمان في الإنتاج

⚠️ **مهم جداً قبل النشر:**

1. **غير JWT_SECRET في `.env`** لقيمة عشوائية قوية
2. **غير JWT_REFRESH_SECRET** لقيمة أخرى مختلفة
3. **غير كلمات مرور المستخدمين الافتراضية**
4. **فعل HTTPS** على السيرفر
5. **استخدم PostgreSQL password قوي**
6. **فعل Rate Limiting** بقيم مناسبة

---

## 🆘 الدعم والمساعدة

إذا واجهت أي مشكلة:

1. تأكد من تثبيت جميع المتطلبات بشكل صحيح
2. راجع قسم **استكشاف الأخطاء** أعلاه
3. تحقق من logs في Terminal

---

## ✨ المميزات الإضافية

### إضافة فرع جديد

استخدم حساب الـ Admin:
1. اذهب للـ API مباشرة أو استخدم Prisma Studio
2. أضف فرع جديد في جدول `branches`

### إضافة مستخدم جديد

استخدم Prisma Studio أو API:
```
POST /api/v1/users
```

---

## 🎉 مبروك!

الآن نظام الـ POS جاهز للاستخدام! 🚀

**الخطوات التالية:**
1. ابدأ بفتح شيفت جديد
2. جرب عمليات البيع
3. استكشف التقارير والمخزون
4. خصص النظام حسب احتياجاتك
