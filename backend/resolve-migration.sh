#!/bin/bash
# هذا السكريبت يحل مشكلة الـ migration الفاشلة
# يجب تشغيله على production database

echo "🔧 حل مشكلة الـ migration الفاشلة..."
echo ""

# تحديد الـ migration الفاشلة كـ "applied" لأن الجداول موجودة بالفعل
npx prisma migrate resolve --applied 20260727132237_add_office_invoices_shipments

echo ""
echo "✅ تم! الآن Railway سيكمل الـ deployment بنجاح"
