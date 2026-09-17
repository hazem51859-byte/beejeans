import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Search } from 'lucide-react';
import api from '../services/api';

export default function CreateOfficeInvoice() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Office Customers (REGULAR/SHIPMENT)
  const [officeCustomers, setOfficeCustomers] = useState([]);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searchingPhone, setSearchingPhone] = useState(false);
  
  // بيانات الفاتورة
  const [invoiceType, setInvoiceType] = useState('REGULAR'); // REGULAR, SHIPMENT, CLIENT
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shipmentCompany, setShipmentCompany] = useState('');
  const [shipmentBill, setShipmentBill] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, CARD, CREDIT
  const [vaultId, setVaultId] = useState(''); // الخزينة المختارة
  const [vaults, setVaults] = useState([]); // قائمة الخزائن
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // البائع (موظف الجملة)
  const [sellerId, setSellerId] = useState('');
  const [wholesaleEmployees, setWholesaleEmployees] = useState([]);
  
  // الأصناف
  const [items, setItems] = useState([
    { productId: '', productCode: '', quantity: 1, unitSalePrice: 0, availableQuantity: 0 }
  ]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchWholesaleEmployees();
    fetchVaults();
  }, []);

  // البحث عن office customers بالهاتف مع debounce
  useEffect(() => {
    if (invoiceType !== 'CLIENT' && phoneSearch.length >= 3) {
      const timer = setTimeout(() => {
        searchOfficeCustomersByPhone(phoneSearch);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setOfficeCustomers([]);
    }
  }, [phoneSearch, invoiceType]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', { 
        params: { 
          status: 'ACTIVE',
          limit: 1000 // جيب كل المنتجات
        } 
      });
      const productData = response.data?.data || response.data;
      const productList = Array.isArray(productData) ? productData : [];
      console.log('📦 Products loaded:', productList.length);
      setProducts(productList);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      const customerData = response.data?.data || response.data;
      const customers = Array.isArray(customerData) ? customerData : [];
      setCustomers(customers.filter(c => c.isActive));
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchWholesaleEmployees = async () => {
    try {
      const response = await api.get('/wholesale-employees');
      const data = response.data?.data || response.data;
      setWholesaleEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching wholesale employees:', error);
      setWholesaleEmployees([]);
    }
  };

  const fetchVaults = async () => {
    try {
      const response = await api.get('/vaults');
      const data = response.data?.data || response.data;
      const vaultsList = Array.isArray(data) ? data : [];
      setVaults(vaultsList.filter(v => v.isActive));
      
      // اختيار أول خزينة بشكل افتراضي
      if (vaultsList.length > 0 && !vaultId) {
        setVaultId(vaultsList[0].id);
      }
    } catch (error) {
      console.error('Error fetching vaults:', error);
      setVaults([]);
    }
  };

  // البحث عن Office Customers بالهاتف
  const searchOfficeCustomersByPhone = async (phone) => {
    if (!phone || phone.length < 3) {
      setOfficeCustomers([]);
      return;
    }
    
    setSearchingPhone(true);
    try {
      const response = await api.get('/office-customers/search', {
        params: { 
          phone,
          type: invoiceType // REGULAR or SHIPMENT
        }
      });
      const data = response.data?.data || response.data;
      setOfficeCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching office customers:', error);
      setOfficeCustomers([]);
    } finally {
      setSearchingPhone(false);
    }
  };

  // اختيار office customer
  const selectOfficeCustomer = (customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setPhoneSearch(customer.phone);
    if (customer.shipmentCompany) {
      setShipmentCompany(customer.shipmentCompany);
    }
    setOfficeCustomers([]);
  };

  // بحث المنتج بالكود مع debounce
  const handleProductCodeChange = (index, code) => {
    const updated = [...items];
    updated[index].productCode = code;
    setItems(updated);
    
    // Cancel previous timer
    if (updated[index].searchTimer) {
      clearTimeout(updated[index].searchTimer);
    }
    
    // فقط لو الكود 4 أرقام أو أكتر
    if (code.length >= 4) {
      updated[index].searchTimer = setTimeout(() => {
        searchProduct(index, code);
      }, 300); // انتظر 300ms بعد آخر حرف
      setItems(updated);
    }
  };
  
  const searchProduct = async (index, code) => {
    const updated = [...items];
    
    console.log('🔍 Searching for product:', code);
    console.log('📦 Available products:', products.length);
    
    // البحث عن المنتج بالباركود فقط
    const product = products.find(p => 
      p.barcode === code ||
      p.barcode?.toLowerCase() === code.toLowerCase()
    );
    
    console.log('✅ Found product:', product?.name || 'Not found');
    
    if (product) {
      updated[index].productId = product.id;
      updated[index].unitSalePrice = product.sellingPrice || product.costPrice * 1.3;
      
      // جلب الكمية المتاحة في المخزن الرئيسي
      try {
        const inventoryRes = await api.get(`/inventory/product/${product.id}`);
        const inventoryData = inventoryRes.data?.data || inventoryRes.data;
        
        if (Array.isArray(inventoryData) && inventoryData.length > 0) {
          // البحث عن المخزن الرئيسي بكود MAIN
          const mainInventory = inventoryData.find(inv => 
            inv.branch?.code === 'MAIN' || inv.branchId === '9e415f52-f384-4155-be58-52b645d4d308'
          );
          // لو ملقاش MAIN خد الإجمالي
          const totalQty = mainInventory 
            ? mainInventory.quantity 
            : inventoryData.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
          updated[index].availableQuantity = totalQty;
          console.log('📊 Available quantity:', totalQty);
        } else {
          updated[index].availableQuantity = 0;
          console.log('⚠️ No inventory data');
        }
      } catch (err) {
        console.error('Error fetching inventory:', err);
        updated[index].availableQuantity = 0;
      }
    } else {
      updated[index].productId = '';
      updated[index].unitSalePrice = 0;
      updated[index].availableQuantity = 0;
    }
    
    setItems(updated);
  };

  // البحث عن العملاء
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (customer.phone && customer.phone.includes(customerSearch)) ||
    (customer.code && customer.code.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  // اختيار عميل
  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setCustomerSearch('');
  };

  // إضافة صنف جديد
  const addItem = () => {
    setItems([...items, { productId: '', productCode: '', quantity: 1, unitSalePrice: 0, availableQuantity: 0 }]);
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

      // التحقق من اختيار الخزينة إذا كان الدفع ليس آجل
      if (paymentMethod !== 'CREDIT' && !vaultId) {
        alert('من فضلك اختر الخزينة');
        setLoading(false);
        return;
      }

      const totals = calculateTotals();

      const selectedSeller = wholesaleEmployees.find(e => e.id === sellerId);

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
        vaultId: paymentMethod !== 'CREDIT' ? vaultId : undefined, // إرسال الخزينة المختارة
        paidAmount: paymentMethod === 'CREDIT' ? 0 : totals.total,
        notes,
        sellerId: sellerId || undefined,
        sellerName: selectedSeller ? selectedSeller.name : undefined
      };

      const response = await api.post('/office-invoices', invoiceData);
      const createdInvoice = response.data?.data || response.data;
      const invoiceId = createdInvoice?.id;
      
      if (!invoiceId) {
        throw new Error('لم يتم إرجاع رقم الفاتورة');
      }
      
      alert('✅ تم إنشاء الفاتورة بنجاح!');
      
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

  const { subtotal, total } = calculateTotals();

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
                  onChange={(e) => {
                    setInvoiceType(e.target.value);
                    setSelectedCustomer(null);
                    setCustomerId('');
                  }}
                  className="w-4 h-4"
                />
                <span className="text-lg">🛒 زبون عادي</span>
              </label>
              
              <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="radio"
                  value="SHIPMENT"
                  checked={invoiceType === 'SHIPMENT'}
                  onChange={(e) => {
                    setInvoiceType(e.target.value);
                    setSelectedCustomer(null);
                    setCustomerId('');
                  }}
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

          {/* اسم البائع (موظف الجملة) */}
          <div className="bg-amber-50/70 p-4 rounded-lg border border-amber-200">
            <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              👤 اسم البائع (موظف الجملة)
            </label>
            <select
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              className="w-full p-3 border rounded-lg bg-white font-semibold text-gray-800 focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- اختر البائع (اختياري) --</option>
              {wholesaleEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.phone ? `(${emp.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* بيانات العميل */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoiceType === 'CLIENT' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">بحث عن عميل *</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="ابحث باسم العميل أو الهاتف أو الكود..."
                      className="w-full p-3 pr-10 border rounded-lg"
                      disabled={selectedCustomer}
                    />
                  </div>
                  
                  {/* نتائج البحث */}
                  {customerSearch && !selectedCustomer && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-600">
                            {customer.phone && `📱 ${customer.phone}`}
                            {customer.code && ` • ${customer.code}`}
                          </div>
                          <div className="text-sm font-bold text-red-600 mt-1">
                            الرصيد: {customer.balance.toFixed(2)} ج
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* العميل المختار */}
                  {selectedCustomer && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-green-800">{selectedCustomer.name}</div>
                          <div className="text-sm text-gray-600">{selectedCustomer.phone}</div>
                          <div className="text-sm font-bold text-red-600 mt-1">
                            الرصيد المستحق: {selectedCustomer.balance.toFixed(2)} ج
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCustomerId('');
                            setCustomerName('');
                            setCustomerPhone('');
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕ إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* رقم الهاتف للـ REGULAR & SHIPMENT */}
            {invoiceType !== 'CLIENT' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  رقم الهاتف {invoiceType === 'REGULAR' ? '(للبحث عن زبون سابق)' : '(للبحث عن عميل شحن سابق)'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneSearch}
                    onChange={(e) => {
                      setPhoneSearch(e.target.value);
                      setCustomerPhone(e.target.value);
                    }}
                    className="w-full p-3 border rounded-lg"
                    placeholder="اكتب رقم الهاتف للبحث..."
                  />
                  
                  {searchingPhone && (
                    <div className="absolute left-3 top-3 text-gray-400">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  
                  {/* نتائج البحث - Office Customers */}
                  {phoneSearch.length >= 3 && officeCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {officeCustomers.map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => selectOfficeCustomer(customer)}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-600">
                            📱 {customer.phone}
                            {customer.shipmentCompany && ` • 📦 ${customer.shipmentCompany}`}
                          </div>
                          <div className="text-sm text-green-600 mt-1">
                            {customer.totalInvoices} فاتورة • {customer.totalSales.toFixed(2)} ج إجمالي
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {phoneSearch.length >= 3 && !searchingPhone && officeCustomers.length === 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      💡 زبون جديد - اكتب بياناته بالأسفل
                    </div>
                  )}
                </div>
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
                disabled={invoiceType === 'CLIENT' && selectedCustomer}
              />
            </div>

            {invoiceType === 'CLIENT' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  disabled={invoiceType === 'CLIENT' && selectedCustomer}
                />
              </div>
            )}
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
                      <label className="text-xs text-gray-600 mb-1 block">كود المنتج</label>
                      <input
                        type="text"
                        value={item.productCode}
                        onChange={(e) => handleProductCodeChange(index, e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="اكتب الكود..."
                      />
                      {product && (
                        <div className="mt-1 space-y-1">
                          <div className="text-xs text-green-600 font-medium">
                            ✓ {product.name} - {item.unitSalePrice} ج
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-600">متاح في المخزن: </span>
                            <span className={`font-bold ${item.availableQuantity > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {item.availableQuantity} قطعة
                            </span>
                            {item.quantity > item.availableQuantity && (
                              <span className="text-red-600 mr-2">⚠ الكمية المطلوبة أكبر من المتاح!</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-24">
                      <label className="text-xs text-gray-600 mb-1 block">الكمية</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full p-2 border rounded"
                        required
                      />
                    </div>

                    <div className="w-32">
                      <label className="text-xs text-gray-600 mb-1 block">السعر</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitSalePrice}
                        onChange={(e) => updateItem(index, 'unitSalePrice', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border rounded"
                        required
                      />
                    </div>

                    <div className="w-28 text-center font-bold pt-6">
                      {itemTotal.toFixed(2)} ج
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded mt-5"
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
              <option value="CREDIT">📝 آجل</option>
            </select>
          </div>

          {/* اختيار الخزينة (يظهر فقط لو مش آجل) */}
          {paymentMethod !== 'CREDIT' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الخزينة *
              </label>
              <select
                value={vaultId}
                onChange={(e) => setVaultId(e.target.value)}
                className="w-full p-3 border rounded-lg bg-yellow-50 border-yellow-300"
                required
              >
                <option value="">-- اختر الخزينة --</option>
                {vaults.map((vault) => {
                  const icon = vault.type === 'CASH' ? '💵' : vault.type === 'VISA' ? '💳' : '📱';
                  return (
                    <option key={vault.id} value={vault.id}>
                      {icon} {vault.name}
                    </option>
                  );
                })}
              </select>
              {vaultId && (
                <p className="text-xs text-gray-600 mt-1">
                  الرصيد الحالي: {vaults.find(v => v.id === vaultId)?.balance?.toFixed(2) || '0.00'} جنيه
                </p>
              )}
            </div>
          )}

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
