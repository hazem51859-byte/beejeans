# تحديث نظام التوريدات - إضافة البحث بالباركود

## ✅ التعديلات المنفذة

### 1. تعديل واجهة إضافة التوريدات (Transfers.jsx)

#### التغييرات في الـ State:
```javascript
// تغيير formData.items من array مع item أولي إلى array فارغ
const [formData, setFormData] = useState({
  fromBranchId: '',
  toBranchId: '',
  notes: '',
  items: [] // فارغ بدلاً من item واحد
});

// إضافة state جديد للـ item الحالي
const [currentItem, setCurrentItem] = useState({
  barcode: '',
  productId: '',
  quantity: 1,
  costPrice: 0,
  sellingPrice: 0
});
```

#### إضافة Functions جديدة:

**handleBarcodeChange**: بحث تلقائي عن المنتج عند كتابة 3 أحرف أو أكثر
```javascript
const handleBarcodeChange = (value) => {
  setCurrentItem({ ...currentItem, barcode: value });
  
  if (value.length >= 3) {
    const foundProduct = products.find(p => 
      p.sku?.toLowerCase().includes(value.toLowerCase()) || 
      p.barcode?.toLowerCase().includes(value.toLowerCase())
    );
    
    if (foundProduct) {
      setCurrentItem({
        barcode: value,
        productId: foundProduct.id,
        quantity: 1,
        costPrice: foundProduct.costPrice || 0,
        sellingPrice: foundProduct.sellingPrice || 0
      });
    }
  }
};
```

**addItemToTransfer**: إضافة المنتج للقائمة بعد التحقق من المخزون
```javascript
const addItemToTransfer = () => {
  if (!currentItem.productId) {
    toast.error('اختر منتج أولاً');
    return;
  }
  
  // التحقق من المخزون المتاح
  const inventory = sourceInventory.find(inv => inv.productId === currentItem.productId);
  const availableQty = inventory?.quantity || 0;
  
  if (currentItem.quantity > availableQty) {
    toast.error(`الكمية المتاحة: ${availableQty} فقط`);
    return;
  }
  
  // إضافة للقائمة وإعادة تعيين currentItem
  setFormData({
    ...formData,
    items: [...formData.items, {
      productId: currentItem.productId,
      quantity: parseInt(currentItem.quantity),
      costPrice: parseFloat(currentItem.costPrice || 0),
      sellingPrice: parseFloat(currentItem.sellingPrice || 0)
    }]
  });
  
  setCurrentItem({
    barcode: '',
    productId: '',
    quantity: 1,
    costPrice: 0,
    sellingPrice: 0
  });
};
```

#### الواجهة الجديدة:

1. **قسم إدخال الباركود** (خلفية خضراء):
   - حقل الباركود/الكود (2/3 عرض) - autofocus
   - حقل الكمية (1/3 عرض)
   - Enter في الباركود → focus على الكمية
   - Enter في الكمية → إضافة المنتج

2. **معاينة المنتج** (تظهر عند اختيار منتج):
   - اسم المنتج + SKU
   - الكمية المتاحة (أخضر إذا كافية، أحمر إذا غير كافية)
   - أسعار التكلفة والبيع

3. **زر إضافة للتوريد**:
   - أخضر مع أيقونة Plus
   - disabled إذا لم يتم اختيار منتج

4. **قائمة المنتجات المضافة**:
   - عرض كل المنتجات المضافة
   - اسم المنتج + الكمية + المتاح
   - الأسعار (للأدمن فقط)
   - زر حذف (أيقونة سلة مهملات)

#### حذف Functions القديمة:
- ❌ `addItem()` - لم تعد مطلوبة
- ❌ `removeItem(index)` - استبدلت بـ inline filter
- ❌ `updateItem(index, field, value)` - لم تعد مطلوبة

#### تحديث Validation:
```javascript
const handleCreateSubmit = (e) => {
  e.preventDefault();
  
  // التحقق من وجود منتجات
  if (!formData.items || formData.items.length === 0) {
    toast.error('يجب إضافة منتج واحد على الأقل');
    return;
  }
  
  // إرسال البيانات...
};
```

## 🎯 سير العمل الجديد

1. المستخدم يفتح نافذة "توريد جديد"
2. يختار الفرع المستهدف
3. **يكتب الباركود أو الكود**:
   - البحث يبدأ تلقائياً بعد 3 أحرف
   - تظهر تفاصيل المنتج فوراً
4. يدخل الكمية المطلوبة
5. يضغط Enter أو "إضافة للتوريد"
6. المنتج يضاف للقائمة
7. يكرر العملية لمنتجات أخرى
8. يضغط "إنشاء التوريد"

## 🔍 حقول البحث

البحث يتم في:
- `product.sku` - الكود الأساسي
- `product.barcode` - الباركود

البحث غير حساس لحالة الأحرف (case-insensitive)

## ✨ المميزات

- ✅ سرعة في الإدخال (لا حاجة لفتح dropdown)
- ✅ Enter للانتقال بين الحقول
- ✅ معاينة فورية للمنتج والمخزون
- ✅ تحقق من الكمية المتاحة قبل الإضافة
- ✅ إمكانية حذف أي منتج من القائمة
- ✅ عرض واضح للأسعار (للأدمن)
- ✅ autofocus على حقل الباركود للسرعة

## 📝 ملاحظات

- المنتجات يجب أن يكون لها `sku` أو `barcode` في قاعدة البيانات
- البحث يبدأ من 3 أحرف لتقليل النتائج غير الدقيقة
- الأسعار تملأ تلقائياً من بيانات المنتج
- التحقق من المخزون يتم قبل الإضافة وليس عند الإرسال

## 🚀 الخطوات التالية (اختياري)

إذا احتجت تحسينات إضافية:
1. إضافة صوت "beep" عند مسح الباركود
2. دعم الباركود scanner hardware
3. إضافة اقتراحات dropdown أثناء الكتابة
4. حفظ آخر المنتجات المستخدمة للوصول السريع
