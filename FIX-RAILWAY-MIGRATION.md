# حل مشكلة الـ Migration الفاشلة على Railway

## المشكلة
```
Error: P3009
The `20260727132237_add_office_invoices_shipments` migration failed
```

## السبب
كان عندنا migration مكررة تم حذفها من الكود، لكن السجل الفاشل لسه موجود في production database.

## الحل

### الطريقة 1: انتظر الـ Auto Redeploy (الأسهل)
1. ✅ تم حذف الـ migration المكررة من الكود
2. ✅ تم رفع التعديل على GitHub
3. ⏳ انتظر Railway يعمل redeploy تلقائي
4. المفروض يشتغل بنجاح الآن!

### الطريقة 2: حذف السجل الفاشل من Database (إذا استمرت المشكلة)

#### الخطوات:

1. **افتح Railway Dashboard**
   - اذهب إلى https://railway.app
   - افتح مشروع bee-jeans-pos

2. **افتح PostgreSQL Service**
   - اضغط على PostgreSQL service
   - اضغط على "Data" tab
   - أو اضغط "Connect" واحصل على Database URL

3. **استخدم طريقة من الطرق التالية:**

#### طريقة A: من Railway Console مباشرة
```bash
# افتح Railway CLI
railway login
railway link

# شغل الأمر لحذف السجل الفاشل
railway run node fix-failed-migration.js
```

#### طريقة B: من جهازك (مؤقتاً)
1. انسخ الـ DATABASE_URL من Railway PostgreSQL Settings
2. غير DATABASE_URL في `backend/.env` للـ production URL
3. شغل السكريبت:
   ```bash
   cd backend
   node fix-failed-migration.js
   ```
4. ارجع DATABASE_URL للـ local database
5. اعمل redeploy على Railway

#### طريقة C: SQL مباشر
استخدم Railway Data tab وشغل:
```sql
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20260727132237_add_office_invoices_shipments';
```

4. **بعد حذف السجل الفاشل:**
   - اعمل manual redeploy على Railway
   - أو push any change to GitHub to trigger redeploy

## التحقق من النجاح
بعد الـ redeploy، الـ logs المفروض تظهر:
```
✓ Applying migration `20260727000000_add_office_invoices_shipments`
✓ Applying migration `20260727140000_remove_unique_from_serial_number`
Database schema is up to date!
```

## ملاحظات
- الجداول `OfficeInvoice` و `Shipment` موجودة بالفعل في الـ database
- السكريبت فقط بيحذف السجل الفاشل من جدول `_prisma_migrations`
- مش هيأثر على البيانات الموجودة
