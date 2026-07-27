# 📄 نظام فواتير المكتب (Office Invoices System)

## 📋 نظرة عامة

نظام فواتير المكتب هو نظام متكامل لإدارة مبيعات المخزن الرئيسي مباشرة، يشمل:
- 🛒 **بيع لزبائن عاديين**
- 📦 **شحنات** مع تتبع كامل
- 👤 **فواتير للعملاء** (نفس نظام فواتير العملاء لكن من المكتب)

---

## ✨ المميزات

### 1️⃣ **ثلاثة أنواع من الفواتير**

#### 🛒 زبون عادي (REGULAR)
- بيع مباشر من المخزن الرئيسي
- الدفع: نقدي / فيزا / آجل
- يضاف للخزينة فوراً

#### 📦 شحن (SHIPMENT)
- بيانات شركة الشحن ورقم البوليصة
- تتبع حالة الشحنة (قيد الانتظار → تم الشحن → تم التسليم)
- تحصيل المبلغ من شركة الشحن بعد التسليم
- يضاف للخزينة عند تأكيد التحصيل

#### 👤 عميل (CLIENT)
- اختيار عميل من قاعدة العملاء
- نفس نظام فواتير العملاء
- دفع: نقدي / فيزا / آجل

---

### 2️⃣ **صفحة حالة الشحنات**

تتبع كامل للشحنات:
- ✅ قيد الانتظار (PENDING)
- 🚚 تم الشحن (SHIPPED)
- 🛣️ في الطريق (IN_TRANSIT)
- ✔️ تم التسليم (DELIVERED)
- ↩️ تم الإرجاع (RETURNED)

**مميزات:**
- عرض تفاصيل كل شحنة
- تحديث الحالة
- تأكيد استلام المبلغ من شركة الشحن
- عرض محتويات الشحنة

---

### 3️⃣ **Dashboard متكامل**

**إحصائيات:**
- 💰 إجمالي المبيعات
- 📈 الأرباح
- 💵 المحصل
- ⏳ المتبقي

**تحليل حسب النوع:**
- زبائن عاديين
- شحنات (عدد، تم التسليم، معلق)
- عملاء

---

### 4️⃣ **التكامل مع التقرير الشهري**

تم إضافة قسم كامل في التقرير الشهري:
- إجمالي مبيعات المكتب
- الأرباح من المكتب
- المحصل
- تحليل تفصيلي حسب النوع

**التأثير على الحسابات:**
- الإيرادات = مبيعات الفروع + **فواتير المكتب**
- الأرباح = أرباح الفروع + **أرباح المكتب**
- يحسب في حصص الشركاء

---

## 🗄️ قاعدة البيانات

### جدول `office_invoices`

```sql
- id: UUID
- invoiceNumber: String (OF-YYYYMMDD-XXXXX)
- type: REGULAR | SHIPMENT | CLIENT
- customerId: UUID (optional)
- customerName: String
- customerPhone: String
- shipmentCompany: String (للشحن)
- shipmentBill: String (للشحن)
- subtotal: Float
- discountAmount: Float
- total: Float
- totalCost: Float (تكلفة داخلية)
- profit: Float (الربح)
- paymentMethod: CASH | CARD | CREDIT
- paidAmount: Float
- remainingAmount: Float
- status: PENDING | COMPLETED | SHIPPED | DELIVERED | CANCELLED
- notes: String
- createdBy: UUID
```

### جدول `office_invoice_items`

```sql
- id: UUID
- invoiceId: UUID
- productId: UUID
- quantity: Int
- size: String
- unitCostPrice: Float
- unitSalePrice: Float (يحدده الأدمن)
- totalCost: Float
- totalSale: Float
```

### جدول `shipments`

```sql
- id: UUID
- shipmentNumber: String (SH-YYYYMMDD-XXXXX)
- invoiceId: UUID
- shipmentCompany: String
- shipmentBill: String
- customerName: String
- customerPhone: String
- customerAddress: String
- status: PENDING | SHIPPED | IN_TRANSIT | DELIVERED | RETURNED
- shippedAt: DateTime
- estimatedDelivery: DateTime
- deliveredAt: DateTime
- paymentCollected: Boolean
- paymentCollectedAt: DateTime
- collectedAmount: Float
- notes: String
- trackingNotes: String
- updatedBy: UUID
```

---

## 🔌 API Endpoints

### Office Invoices

```javascript
POST   /api/v1/office-invoices           // إنشاء فاتورة
GET    /api/v1/office-invoices           // جلب الفواتير (مع فلاتر)
GET    /api/v1/office-invoices/:id       // فاتورة واحدة
POST   /api/v1/office-invoices/:id/payment // دفعة جديدة
GET    /api/v1/office-invoices/dashboard // Dashboard
```

### Shipments

```javascript
GET    /api/v1/shipments                 // جلب الشحنات
GET    /api/v1/shipments/:id             // شحنة واحدة
PUT    /api/v1/shipments/:id/status      // تحديث الحالة
PUT    /api/v1/shipments/:id/details     // تحديث البيانات
POST   /api/v1/shipments/:id/confirm-payment // تأكيد التحصيل
```

### Reports

```javascript
GET    /api/v1/reports/office-invoices   // تقرير فواتير المكتب
```

---

## 🎨 الصفحات

### 1. `/office-invoices/create` - إضافة فاتورة

**المميزات:**
- اختيار نوع الفاتورة (3 أنواع)
- بيانات العميل
- بيانات الشحن (للشحنات)
- اختيار المنتجات والكميات
- **الأدمن يحدد سعر البيع** (مش سعر البيع الافتراضي)
- حساب المجاميع تلقائياً
- اختيار طريقة الدفع

### 2. `/office-invoices` - قائمة الفواتير

**المميزات:**
- Dashboard بالإحصائيات
- فلاتر (النوع، الحالة، التاريخ)
- جدول الفواتير مع التفاصيل
- أزرار عرض وطباعة

### 3. `/shipments` - حالة الشحنات

**المميزات:**
- عرض كروت للشحنات
- تحديث الحالة
- تأكيد التحصيل
- عرض التفاصيل الكاملة

---

## 💰 التأثير على الحسابات

### المخزون
- يخصم من **المخزن الرئيسي** (MAIN)
- نفس آلية مبيعات الفروع

### الخزينة
- **نقدي/فيزا:** يضاف للخزينة فوراً
- **آجل:** لا يضاف حتى الدفع
- **شحن:** يضاف عند تأكيد التحصيل

### التقرير الشهري
```javascript
الإيرادات = مبيعات الفروع + فواتير المكتب المحصلة
الأرباح = (الإيرادات - التكاليف - المصروفات) + أرباح المكتب
```

---

## 🔐 الصلاحيات

- ✅ **ADMIN فقط** يمكنه:
  - إنشاء فواتير مكتب
  - إدارة الشحنات
  - عرض Dashboard
  - طباعة الفواتير

---

## 📋 سير العمل

### سيناريو: بيع شحن

1. **الأدمن** ينشئ فاتورة (نوع: شحن)
2. يدخل بيانات العميل وشركة الشحن
3. يختار المنتجات ويحدد أسعار البيع
4. يختار طريقة الدفع
5. النظام:
   - يخصم من المخزن الرئيسي
   - ينشئ شحنة تلقائياً
   - حالة: PENDING

6. **الأدمن** يذهب لصفحة الشحنات:
   - يؤكد الشحن → SHIPPED
   - عند الوصول → DELIVERED
   - يؤكد استلام المبلغ من شركة الشحن
   - يضاف للخزينة

---

## 🎯 الفائدة

### قبل النظام:
❌ مبيعات المكتب غير موثقة
❌ الشحنات غير متتبعة
❌ لا يوجد dashboard
❌ لا تظهر في التقرير الشهري

### بعد النظام:
✅ كل شيء موثق
✅ تتبع كامل للشحنات
✅ Dashboard متكامل
✅ يظهر في التقرير الشهري
✅ الأرباح محسوبة بدقة
✅ سهولة الطباعة والمتابعة

---

## 🚀 التطوير المستقبلي

- [ ] طباعة فاتورة خاصة بالمكتب (مختلفة عن فواتير الفروع)
- [ ] تكامل مع شركات الشحن (API)
- [ ] تنبيهات للشحنات المتأخرة
- [ ] تقارير تفصيلية للشحنات
- [ ] إضافة تكاليف الشحن للحسابات

---

## 📞 الدعم

لأي استفسارات أو مشاكل، راجع:
- التوثيق التقني: `backend/src/controllers/officeInvoice.controller.js`
- الواجهة: `frontend-pos/src/pages/CreateOfficeInvoice.jsx`
- قاعدة البيانات: `backend/prisma/schema.prisma`

---

**تم التطوير بواسطة:** Kiro AI
**التاريخ:** 27 يوليو 2026
**الإصدار:** 2.0
