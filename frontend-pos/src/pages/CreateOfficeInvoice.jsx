import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import api from '../services/api';

export default function CreateOfficeInvoice() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // بيانات الفاتورة
  const [invoiceType, setInvoiceType] = useState('REGULAR'); // REGULAR, SHIPMENT, CLIENT
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shipmentCompany, setShipmentCompany] = useState('');
  const [shipmentBill, setShipmentBill] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, CARD, CREDIT
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // الأصناف
  const [items, setItems] = useState([
    { productId: '', quantity: 1, size: '', unitSalePrice: 0 }
  ]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', { params: { status: 'ACTIVE' } });
      // Handle different response structures
      const productData = response.data?.data || response.data;
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      // Handle different response structures
      const customerData = response.data?.data || response.data;
      const customers = Array.isArray(customerData) ? customerData : [];
      setCustomers(customers.filter(c => c.isActive));
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  // إضافة صنف جديد
  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, size: '', unitSalePrice: 0 }]);
  };

  // حذف صنف
  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // تحديث صنف
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    
    // إذا تغير المنتج، اجلب سعر التكلفة واقترح سعر بيع
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        // اقترح سعر البيع الافتراضي
        updated[index].unitSalePrice = product.sellingPrice || product.costPrice * 1.3;
      }
    }
    
    setItems(updated);
  };

  // حساب المجاميع
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitSalePrice);
    }, 0);
    
    const discount = parseFloat(discountAmount) || 0;
    const total = subtotal - discount;
    
    return {
      subtotal,
      discount,
      total: total > 0 ? total : 0
    };
  };

  // حفظ الفاتورة
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // التحقق من البيانات
      if (!customerName.trim()) {
        alert('من فضلك أدخل اسم العميل');
        setLoading(false);
        return;
      }

      if (invoiceType === 'SHIPMENT' && (!shipmentCompany || !shipmentBill)) {
        alert('من فضلك أدخل بيانات الشحن');
        setLoading(false);
        return;
      }

      if (invoiceType === 'CLIENT' && !customerId) {
        alert('من فضلك اختر عميل');
        setLoading(false);
        return;
      }

      const validItems = items.filter(item => item.productId && item.quantity > 0);
      if (validItems.length === 0) {
        alert('من فضلك أضف أصناف للفاتورة');
        setLoading(false);
        return;
      }

      const totals = calculateTotals();

      const invoiceData = {
        type: invoiceType,
        customerId: invoiceType === 'CLIENT' ? customerId : undefined,
        customerName,
        customerPhone,
        shipmentCompany: invoiceType === 'SHIPMENT' ? shipmentCompany : undefined,
        shipmentBill: invoiceType === 'SHIPMENT' ? shipmentBill : undefined,
        items: validItems,
        discountAmount: totals.discount,
        paymentMethod,
        paidAmount: paymentMethod === 'CREDIT' ? 0 : totals.total,
        notes
      };

      const response = await api.post('/office-invoices', invoiceData);
      console.log('Create invoice response:', response.data);
      
      const createdInvoice = response.data?.data || response.data;
      const invoiceId = createdInvoice?.id;
      
      if (!invoiceId) {
        throw new Error('لم يتم إرجاع رقم الفاتورة');
      }
      
      alert('✅ تم إنشاء الفاتورة بنجاح!');
      
      // طباعة الفاتورة
      if (window.confirm('هل تريد طباعة الفاتورة؟')) {
        navigate(`/office-invoices/${invoiceId}/print`);
      } else {
        navigate('/office-invoices');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('❌ فشل إنشاء الفاتورة: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, discount, total } = calculateTotals();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b p-6">
          <h1 className="text-3xl font-bold text-gray-800">📄 إضافة فاتورة مكتب</h1>
          <p className="text-gray-600 mt-2">بيع من المخزن الرئيسي</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* نوع الفاتورة */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <label className="block text-sm font-bold text-gray-700 mb-3">نوع الفاتورة</label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="radio"
                  value="REGULAR"
                  checked={invoiceType === 'REGULAR'}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-lg">🛒 زبون عادي</span>
              </label>
              
              <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="radio"
                  value="SHIPMENT"
                  checked={invoiceType === 'SHIPMENT'}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-lg">📦 شحن</span>
              </label>
              
              <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="radio"
                  value="CLIENT"
                  checked={invoiceType === 'CLIENT'}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-lg">👤 عميل</span>
              </label>
            </div>
          </div>

          {/* بيانات العميل */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoiceType === 'CLIENT' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">العميل *</label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    const customer = customers.find(c => c.id === e.target.value);
                    if (customer) {
                      setCustomerName(customer.name);
                      setCustomerPhone(customer.phone || '');
                    }
                  }}
                  className="w-full p-3 border rounded-lg"
                  required
                >
                  <option value="">-- اختر عميل --</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone && `- ${customer.phone}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {invoiceType === 'CLIENT' ? 'اسم العميل' : 'اسم الزبون'} *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-3 border rounded-lg"
                required
                disabled={invoiceType === 'CLIENT' && customerId}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">رقم الهاتف</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full p-3 border rounded-lg"
                disabled={invoiceType === 'CLIENT' && customerId}
              />
            </div>
          </div>

          {/* بيانات الشحن */}
          {invoiceType === 'SHIPMENT' && (
            <div className="bg-yellow-50 p-4 rounded-lg space-y-4">
              <h3 className="font-bold text-lg">📦 بيانات الشحن</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">شركة الشحن *</label>
                  <input
                    type="text"
                    value={shipmentCompany}
                    onChange={(e) => setShipmentCompany(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="مثال: أرامكس، سمسا، DHL"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">رقم بوليصة الشحن *</label>
                  <input
                    type="text"
                    value={shipmentBill}
                    onChange={(e) => setShipmentBill(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="رقم البوليصة"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* الأصناف */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">🛍️ الأصناف</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus size={20} />
                إضافة صنف
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const product = products.find(p => p.id === item.productId);
                const itemTotal = item.quantity * item.unitSalePrice;
                
                return (
                  <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                      >
                        <option value="">-- اختر المنتج --</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - تكلفة: {product.costPrice} ج
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full p-2 border rounded"
                        placeholder="الكمية"
                        required
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="text"
                        value={item.size}
                        onChange={(e) => updateItem(index, 'size', e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="المقاس"
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitSalePrice}
                        onChange={(e) => updateItem(index, 'unitSalePrice', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border rounded"
                        placeholder="السعر"
                        required
                      />
                    </div>

                    <div className="w-28 text-center font-bold pt-2">
                      {itemTotal.toFixed(2)} ج
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* المجاميع */}
          <div className="bg-gray-100 p-4 rounded-lg space-y-3">
            <div className="flex justify-between text-lg">
              <span>المجموع الفرعي:</span>
              <span className="font-bold">{subtotal.toFixed(2)} ج</span>
            </div>
            
            {/* حقل الخصم */}
            <div className="flex justify-between items-center border-t pt-2">
              <label className="text-sm font-medium text-gray-700">الخصم:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-32 p-2 border rounded-lg text-right"
                  placeholder="0.00"
                />
                <span className="text-gray-600">ج</span>
              </div>
            </div>

            <div className="flex justify-between text-xl font-bold text-blue-600 border-t pt-2">
              <span>الإجمالي:</span>
              <span>{total.toFixed(2)} ج</span>
            </div>
          </div>

          {/* طريقة الدفع */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">طريقة الدفع</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="CASH">💵 نقدي</option>
              <option value="CARD">💳 فيزا</option>
              <option value="CREDIT">📝 آجل</option>
            </select>
          </div>

          {/* ملاحظات */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border rounded-lg"
              rows="3"
              placeholder="ملاحظات إضافية..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate('/office-invoices')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              إلغاء
            </button>
            
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              <Save size={20} />
              {loading ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
