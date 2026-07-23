# خطوات تشغيل Migration للتوريدات

## 📋 الوضع الحالي
- ✅ تم تحديث Schema في `backend/prisma/schema.prisma`
- ✅ تم تحديث Frontend (صفحة Transfers و Returns)
- ✅ تم تحديث Backend Controllers
- ⏳ **يتبقى:** تشغيل Migration على قاعدة البيانات

## 🎯 الهدف
تحديث جدول `transfer_items` ليشتغل بنظام مبسط:
- بدون `categoryId` (اختياري الآن)
- بدون `attributes` (غير مطلوب)
- بدون `unitPrice` و `hasItemDiscrepancy` (غير ضروري)
- **فقط:** productId + quantities

## 📝 الخطوات

### 1️⃣ افتح pgAdmin
- افتح برنامج pgAdmin
- اتصل بقاعدة البيانات: `bee_jeans_pos`

### 2️⃣ افتح Query Tool
- كليك يمين على قاعدة البيانات `bee_jeans_pos`
- اختر **Query Tool**

### 3️⃣ شغل السكريبت
- افتح الملف: `backend/pgadmin-migration.sql`
- انسخ كل المحتوى
- الصقه في Query Tool
- اضغط **Execute** (F5)

### 4️⃣ تحقق من النجاح
يجب أن تشوف:
```
Query returned successfully in X msec.
```

### 5️⃣ اختبر النظام
بعد ما يشتغل السكريبت:
- ارجع للـ Frontend
- جرب إنشاء توريد جديد
- يجب أن يشتغل بدون مشاكل!

## 🔧 إذا واجهت مشكلة

### مشكلة: "relation transfer_items already exists"
**الحل:** السكريبت بيحذف الجدول القديم تلقائياً، بس لو حصل خطأ:
```sql
DROP TABLE IF EXISTS "transfer_items" CASCADE;
```

### مشكلة: "foreign key violation"
**الحل:** تأكد إن جدول `transfers` موجود:
```sql
SELECT COUNT(*) FROM transfers;
```

## ✅ بعد المigration

### إزالة الـ Workaround المؤقت
في ملف `backend/src/controllers/transfer.controller.js` - السطور 80-86:

**قبل:**
```javascript
// Get a default category (required by current schema)
const defaultCategory = await prisma.category.findFirst();
if (!defaultCategory) {
  return res.status(400).json({
    success: false,
    error: 'No categories found in system'
  });
}
```

**بعد:** احذف هذا الكود كله

**قبل:**
```javascript
items: {
  create: items.map(item => ({
    productId: item.productId,
    categoryId: defaultCategory.id,    // ← احذف هذا السطر
    attributes: '{}',                   // ← احذف هذا السطر
    quantityRequested: item.quantity,
    unitPrice: 0,                       // ← احذف هذا السطر
    hasItemDiscrepancy: false,          // ← احذف هذا السطر
    status: 'PENDING',
    notes: item.notes || ''
  }))
}
```

**بعد:**
```javascript
items: {
  create: items.map(item => ({
    productId: item.productId,
    quantityRequested: item.quantity,
    status: 'PENDING',
    notes: item.notes || ''
  }))
}
```

## 📊 ما الذي تغير؟

### الجدول القديم:
```
transfer_items {
  id, transferId, productId,
  categoryId ❌,
  attributes ❌,
  quantityRequested,
  quantityReceived,
  unitPrice ❌,
  hasItemDiscrepancy ❌,
  status, notes
}
```

### الجدول الجديد:
```
transfer_items {
  id, transferId, productId,
  quantityRequested ✅,
  quantityReceived ✅,
  status ✅,
  notes ✅
}
```

## 💡 ملاحظات
- ✅ الجدول القديم **فاضي** (0 records) - آمن للحذف
- ✅ البيانات المهمة محفوظة في باقي الجداول
- ✅ النظام الجديد أبسط وأسرع
