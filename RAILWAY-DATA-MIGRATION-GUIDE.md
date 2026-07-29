# دليل نقل البيانات إلى Railway Production

## 📋 نظرة عامة
هذا الدليل يشرح كيفية نقل البيانات من Local PostgreSQL إلى Railway بشكل صحيح وآمن.

## ⚠️ مهم جداً: الترتيب الصحيح

يجب اتباع الخطوات بالترتيب التالي:

### الخطوة 1: إصلاح الـ Migration الفاشلة على Railway

**المشكلة الحالية:**
```
Error: P3009
The `20260727132237_add_office_invoices_shipments` migration failed
```

**الحل:**

#### الطريقة A: من Railway Dashboard (الأسهل)
1. افتح https://railway.app
2. اختر مشروع `bee-jeans-pos`
3. افتح `PostgreSQL` service
4. اضغط على `Data` tab
5. شغل الأمر:
```sql
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20260727132237_add_office_invoices_shipments';
```
6. ارجع لـ `backend` service واضغط `Redeploy`

#### الطريقة B: من Railway CLI
```bash
railway login
railway link
railway run npx prisma migrate resolve --applied 20260727000000_add_office_invoices_shipments
```

**✅ التحقق:** شوف الـ logs - المفروض يظهر "Database schema is up to date!"

---

### الخطوة 2: تصدير البيانات من Local Database

```bash
cd backend
node export-to-railway.js
```

**سيقوم السكريبت بـ:**
- تصدير جميع الجداول والبيانات
- حفظها في ملف JSON في مجلد `backup/`
- عرض إحصائيات البيانات المصدرة

**النتيجة:** ملف مثل `full-database-export-2026-07-27T20-30-00.json`

---

### الخطوة 3: الحصول على Railway Database URL

1. افتح Railway Dashboard
2. اختر مشروع `bee-jeans-pos`
3. افتح `PostgreSQL` service
4. اضغط على `Connect` tab
5. انسخ الـ `DATABASE_URL`

**شكل الـ URL:**
```
postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:PORT/railway
```

---

### الخطوة 4: تحديث .env مؤقتاً

**⚠️ احتفظ بنسخة من .env الأصلي أولاً!**

```bash
# في ملف backend/.env
# علق على Local URL
# DATABASE_URL="postgresql://postgres:Zoma.54559@localhost:5432/bee_jeans_pos?schema=public"

# ضع Railway URL
DATABASE_URL="postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:PORT/railway"
```

---

### الخطوة 5: استيراد البيانات إلى Railway

```bash
cd backend
node import-to-railway.js
```

**سيقوم السكريبت بـ:**
- قراءة آخر ملف backup
- عرض إحصائيات البيانات
- طلب تأكيد منك
- استيراد البيانات بالترتيب الصحيح

**⏱️ المدة المتوقعة:** 2-5 دقائق حسب حجم البيانات

---

### الخطوة 6: إرجاع .env للـ Local

```bash
# في ملف backend/.env
# أرجع Local URL
DATABASE_URL="postgresql://postgres:Zoma.54559@localhost:5432/bee_jeans_pos?schema=public"

# علق على Railway URL
# DATABASE_URL="postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:PORT/railway"
```

---

### الخطوة 7: التحقق من النجاح

#### من Railway Dashboard:
1. افتح `PostgreSQL` → `Data`
2. تحقق من الجداول:
```sql
-- تحقق من عدد المستخدمين
SELECT COUNT(*) FROM "User";

-- تحقق من المنتجات
SELECT COUNT(*) FROM "Product";

-- تحقق من فواتير المكتب
SELECT COUNT(*) FROM "OfficeInvoice";

-- تحقق من العملاء
SELECT COUNT(*) FROM "Customer";
```

#### من التطبيق:
1. افتح Frontend: https://bee-jeans-pos-v2-production.up.railway.app
2. سجل دخول بحساب Admin
3. تأكد من ظهور جميع البيانات

---

## 🔧 حل المشاكل الشائعة

### مشكلة: "Foreign key constraint failed"
**السبب:** ترتيب الاستيراد خاطئ
**الحل:** السكريبت يستورد البيانات بالترتيب الصحيح تلقائياً

### مشكلة: "Unique constraint failed"
**السبب:** البيانات موجودة مسبقاً
**الحل 1:** امسح البيانات القديمة من Railway أولاً
```sql
-- احذر: هذا يحذف جميع البيانات!
TRUNCATE TABLE "User" CASCADE;
TRUNCATE TABLE "Product" CASCADE;
-- ... إلخ
```

**الحل 2:** أو استخدم `prisma migrate reset` على Railway:
```bash
railway run npx prisma migrate reset --force
railway run npx prisma migrate deploy
```

### مشكلة: "Can't reach database server"
**السبب:** الـ DATABASE_URL خاطئ أو Railway Database متوقف
**الحل:** 
1. تأكد من الـ URL صحيح
2. تأكد من Railway Database يعمل
3. جرب الاتصال من Railway CLI

---

## 📊 البيانات المتوقع نقلها

- ✅ Users (المستخدمين)
- ✅ Branches (الفروع)
- ✅ Categories (التصنيفات)
- ✅ Products (المنتجات)
- ✅ Inventory (المخزون)
- ✅ Sales (المبيعات)
- ✅ Customers (العملاء)
- ✅ Customer Payments (دفعات العملاء)
- ✅ Office Invoices (فواتير المكتب) ← **جديد**
- ✅ Shipments (الشحنات) ← **جديد**
- ✅ Transfers (التحويلات)
- ✅ Returns (المرتجعات)
- ✅ Fabric Types (أنواع القماش)
- ✅ Fabric Inventory (مخزون القماش)
- ✅ Manufacturing Orders (أوامر التصنيع)
- ✅ Washing Orders (أوامر الغسيل)
- ✅ Expenses (المصروفات)
- ✅ Vault Transactions (معاملات الخزينة)
- ✅ Partners (الشركاء)
- ✅ Suppliers (الموردين)

---

## ⚡ نصائح مهمة

1. **عمل Backup قبل البدء:**
   ```bash
   # من Railway Dashboard
   # PostgreSQL → Settings → Backup
   ```

2. **لا تغلق Terminal أثناء الاستيراد**

3. **راقب الـ logs للتأكد من عدم وجود أخطاء**

4. **تأكد من أن Railway Database فاضي أو جاهز للـ overwrite**

5. **بعد الانتهاء، اختبر التطبيق جيداً قبل الاستخدام الفعلي**

---

## 🆘 للمساعدة

إذا واجهت أي مشكلة:
1. احتفظ بنسخة من الـ error message
2. تحقق من الـ logs على Railway
3. تأكد من أن جميع الـ migrations تمت بنجاح
4. جرب الخطوات من جديد

---

**✅ بعد اكتمال كل الخطوات، البيانات ستكون على Railway ويمكنك العمل عليها online!**
