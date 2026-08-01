# Railway Migration Steps

## التعديلات المطلوبة على Railway Database:

### 1. إضافة walletBalance للـ branches
```sql
-- Run this in Railway PostgreSQL console
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
```

### 2. إضافة جدول office_customers
```sql
-- Run this in Railway PostgreSQL console
CREATE TABLE IF NOT EXISTS office_customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL,
  
  "totalInvoices" INTEGER DEFAULT 0 NOT NULL,
  "totalSales" DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "totalPaid" DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "lastInvoiceDate" TIMESTAMP,
  
  "shipmentCompany" VARCHAR(255),
  address TEXT,
  notes TEXT,
  
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "office_customers_phone_idx" ON office_customers(phone);
CREATE INDEX IF NOT EXISTS "office_customers_type_idx" ON office_customers(type);
```

## التحقق من نجاح Migration:

```sql
-- Check walletBalance column
SELECT id, code, name, "vaultBalance", "cardVaultBalance", "walletBalance" 
FROM branches;

-- Check office_customers table
SELECT * FROM office_customers LIMIT 5;
```

## الميزات الجديدة:

### 1. WALLET Payment Method (المحفظة الإلكترونية)
- ✅ POS: دعم الدفع بالمحفظة مع modal للتأكيد
- ✅ Office Invoices: دعم الدفع بالمحفظة
- ✅ VaultManagement: عرض رصيد المحفظة (4 خزائن: نقدي + فيزا + محفظة)
- ✅ BranchVaults: عرض محفظة كل فرع
- ✅ MonthlyReport: breakdown حسب طريقة الدفع

### 2. Office Customers Tracking (تتبع عملاء المكتب)
- ✅ Backend: نموذج OfficeCustomer لتتبع زباين عادية وشحن
- ✅ Auto-save: حفظ تلقائي عند إنشاء فاتورة مكتب
- ✅ Statistics: عدد الفواتير، إجمالي المبيعات، آخر فاتورة
- ⏳ Frontend: (محتاج تكملة في CreateOfficeInvoice و Customers page)

## الخطوات القادمة (Frontend):

1. **CreateOfficeInvoice**: إضافة search بالتليفون للـ 3 أنواع
2. **Customers Page**: إضافة section لعملاء المكتب مع الإحصائيات

---
**تاريخ:** 2026-08-01
**الحالة:** Backend جاهز ✅ | Frontend جزئي ⏳
