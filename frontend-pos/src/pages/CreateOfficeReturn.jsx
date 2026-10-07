import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  RotateCcw, 
  Search, 
  ArrowRight, 
  Package, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Building2, 
  Trash2,
  Calendar,
  User,
  Info,
  Plus,
  Barcode
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export default function CreateOfficeReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledInvoiceId = searchParams.get('invoiceId');

  // Mode: DIRECT (مرتجع مباشر لعميل) vs INVOICE (مرتجع بفاتورة أصلية)
  const [returnMode, setReturnMode] = useState(prefilledInvoiceId ? 'INVOICE' : 'DIRECT');

  const [loading, setLoading] = useState(false);

  // ==========================================
  // حالة النظام الأول: مرتجع مباشر لعميل
  // ==========================================
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // أصناف المرتجع المباشر
  const [directItems, setDirectItems] = useState([]);

  // حقول إدخال الصنف الجديد
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState(null);
  const [inputQuantity, setInputQuantity] = useState(1);
  const [inputPrice, setInputPrice] = useState('');
  const [inputSize, setInputSize] = useState('');
  const [inputReason, setInputReason] = useState('رغبة العميل');
  const [directNotes, setDirectNotes] = useState('');

  // ==========================================
  // حالة النظام الثاني: مرتجع بناءً على فاتورة
  // ==========================================
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceReturnItems, setInvoiceReturnItems] = useState([]);
  
  const [vaults, setVaults] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState('');
  
  const [generalReason, setGeneralReason] = useState('رغبة العميل');
  const [generalNotes, setGeneralNotes] = useState('');
  
  // Custom settlement overrides (للفواتير)
  const [manualSplit, setManualSplit] = useState(false);
  const [customDeductedFromPaid, setCustomDeductedFromPaid] = useState(0);
  const [customDeductedFromDebt, setCustomDeductedFromDebt] = useState(0);

  useEffect(() => {
    fetchCustomers();
    fetchVaults();
    if (prefilledInvoiceId) {
      loadInvoiceById(prefilledInvoiceId);
    }
  }, [prefilledInvoiceId]);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const res = await api.get('/customers');
      const list = res.data?.data || res.data || [];
      setCustomers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Error fetching customers:', e);
      toast.error('فشل في تحميل قائمة العملاء');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchVaults = async () => {
    try {
      const res = await api.get('/vaults');
      const data = res.data?.data || res.data || [];
      const activeVaults = Array.isArray(data) ? data.filter(v => v.isActive) : [];
      setVaults(activeVaults);
      if (activeVaults.length > 0 && !selectedVaultId) {
        setSelectedVaultId(activeVaults[0].id);
      }
    } catch (e) {
      console.error('Error fetching vaults:', e);
    }
  };

  // العميل المختار في الوضع المباشر
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;

  // فلترة قائمة العملاء
  const filteredCustomers = customers.filter(c => {
    if (!customerSearchQuery.trim()) return true;
    const query = customerSearchQuery.trim().toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(query);
    const phoneMatch = c.phone?.toLowerCase().includes(query);
    return nameMatch || phoneMatch;
  });

  // ==========================================
  // دوال النظام الأول: مرتجع مباشر لعميل
  // ==========================================
  const handleProductCodeSearch = async (code) => {
    if (!code || !code.trim()) {
      setProductSearchResults([]);
      return;
    }
    try {
      setSearchingProduct(true);
      const res = await api.get('/products/search', { params: { q: code.trim() } });
      const found = res.data?.data || [];
      setProductSearchResults(found);
      if (found.length === 1 && (found[0].sku === code.trim() || found[0].barcode === code.trim())) {
        selectProductForAdd(found[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingProduct(false);
    }
  };

  const selectProductForAdd = (product) => {
    setSelectedProductToAdd(product);
    const defaultPrice = product.retailPrice > 0 
      ? product.retailPrice 
      : (product.sellingPrice > 0 ? product.sellingPrice : (product.costPrice || 0));
    setInputPrice(defaultPrice);
    setProductSearchResults([]);
  };

  const handleAddDirectItem = () => {
    if (!selectedProductToAdd) {
      toast.error('يرجى اختيار الصنف أولاً بالكود أو الاسم');
      return;
    }
    const qty = parseInt(inputQuantity) || 1;
    const price = parseFloat(inputPrice);

    if (qty <= 0) {
      toast.error('الكمية يجب أن تكون أكبر من 0');
      return;
    }
    if (isNaN(price) || price <= 0) {
      toast.error('يرجى كتابة سعر بيع صحيح للقطعة');
      return;
    }

    const existingIndex = directItems.findIndex(
      it => it.productId === selectedProductToAdd.id && (it.size || '') === (inputSize || '')
    );

    const cost = parseFloat(selectedProductToAdd.costPrice || 0);

    if (existingIndex >= 0) {
      const updated = [...directItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].unitSalePrice = price;
      setDirectItems(updated);
      toast.success(`تم تحديث كمية الصنف (${updated[existingIndex].productName})`);
    } else {
      setDirectItems([
        ...directItems,
        {
          productId: selectedProductToAdd.id,
          productName: selectedProductToAdd.name,
          sku: selectedProductToAdd.sku || '-',
          barcode: selectedProductToAdd.barcode || '-',
          size: inputSize || null,
          quantity: qty,
          unitSalePrice: price,
          unitCostPrice: cost,
          returnReason: inputReason || 'رغبة العميل'
        }
      ]);
      toast.success(`تمت إضافة (${selectedProductToAdd.name}) للمرتجع`);
    }

    // تفريغ الحقول لإضافة صنف آخر
    setSelectedProductToAdd(null);
    setBarcodeInput('');
    setInputQuantity(1);
    setInputPrice('');
    setInputSize('');
    setProductSearchResults([]);
  };

  // إجماليات المرتجع المباشر
  const directTotalAmount = directItems.reduce((sum, it) => sum + (it.unitSalePrice * it.quantity), 0);
  const directTotalCost = directItems.reduce((sum, it) => sum + (it.unitCostPrice * it.quantity), 0);
  const directTotalProfit = directTotalAmount - directTotalCost;
  const directTotalPieces = directItems.reduce((sum, it) => sum + it.quantity, 0);

  const handleDirectReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error('يرجى اختيار العميل أولاً');
      return;
    }
    if (directItems.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل للمرتجع');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customerId: selectedCustomer.id,
        items: directItems.map(it => ({
          productId: it.productId,
          quantity: parseInt(it.quantity),
          size: it.size || null,
          unitSalePrice: parseFloat(it.unitSalePrice),
          returnReason: it.returnReason || 'مرتجع عميل'
        })),
        notes: directNotes || null
      };

      const res = await api.post('/store-returns', payload);
      toast.success(res.data?.message || 'تم تسجيل المرتجع وخصمه من حساب العميل وإعادة البضاعة للمخزن بنجاح!');
      navigate('/office-returns');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'فشل في تسجيل المرتجع');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // دوال النظام الثاني: مرتجع بناءً على فاتورة
  // ==========================================
  const loadInvoiceById = async (id) => {
    try {
      setSearching(true);
      const res = await api.get(`/office-invoices/${id}`);
      const invoice = res.data?.data || res.data;
      if (invoice) {
        setupInvoiceForReturn(invoice);
      }
    } catch (e) {
      console.error('Error loading invoice:', e);
      toast.error('فشل في تحميل بيانات الفاتورة');
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery || searchQuery.trim().length === 0) {
      toast.error('أدخل رقم الفاتورة أو اسم أو هاتف العميل');
      return;
    }

    try {
      setSearching(true);
      const res = await api.get(`/office-returns/search/${encodeURIComponent(searchQuery.trim())}`);
      const results = res.data?.data || [];
      setSearchResults(results);
      if (results.length === 0) {
        toast.error('لم يتم العثور على أي فاتورة مطابقة');
      } else if (results.length === 1) {
        setupInvoiceForReturn(results[0]);
        setSearchResults([]);
      }
    } catch (e) {
      console.error('Error searching invoices:', e);
      toast.error('خطأ أثناء البحث عن الفاتورة');
    } finally {
      setSearching(false);
    }
  };

  const setupInvoiceForReturn = (invoice) => {
    setSelectedInvoice(invoice);
    
    const items = (invoice.items || []).map(item => {
      const soldQty = item.quantity || item.soldQuantity || 0;
      const returnedQty = item.returnedQuantity || 0;
      const availableQty = Math.max(0, soldQty - returnedQty);

      return {
        invoiceItemId: item.id,
        productId: item.productId,
        productName: item.product?.name || item.productName || 'صنف',
        productSku: item.product?.sku || item.productSku || '---',
        size: item.size,
        soldQuantity: soldQty,
        returnedQuantity: returnedQty,
        availableQuantity: availableQty,
        returnQuantity: 0,
        unitSalePrice: item.unitSalePrice,
        unitCostPrice: item.unitCostPrice,
        returnReason: generalReason,
        isSelected: false
      };
    });

    setInvoiceReturnItems(items);
    setManualSplit(false);
  };

  const toggleInvoiceItemSelection = (index) => {
    const updated = [...invoiceReturnItems];
    const item = updated[index];
    item.isSelected = !item.isSelected;
    if (item.isSelected && item.returnQuantity === 0) {
      item.returnQuantity = item.availableQuantity > 0 ? 1 : 0;
    } else if (!item.isSelected) {
      item.returnQuantity = 0;
    }
    setInvoiceReturnItems(updated);
  };

  const updateInvoiceItemQuantity = (index, qty) => {
    const updated = [...invoiceReturnItems];
    const item = updated[index];
    const parsed = parseInt(qty) || 0;
    const bounded = Math.max(0, Math.min(item.availableQuantity, parsed));
    item.returnQuantity = bounded;
    item.isSelected = bounded > 0;
    setInvoiceReturnItems(updated);
  };

  const updateInvoiceItemReason = (index, reason) => {
    const updated = [...invoiceReturnItems];
    updated[index].returnReason = reason;
    setInvoiceReturnItems(updated);
  };

  const invoiceTotalReturnAmount = invoiceReturnItems.reduce((sum, item) => {
    if (item.isSelected && item.returnQuantity > 0) {
      return sum + (item.returnQuantity * item.unitSalePrice);
    }
    return sum;
  }, 0);

  const invoiceTotalReturnPieces = invoiceReturnItems.reduce((sum, i) => sum + (i.isSelected ? i.returnQuantity : 0), 0);

  const autoDeductedFromDebt = selectedInvoice 
    ? Math.min(selectedInvoice.remainingAmount || 0, invoiceTotalReturnAmount) 
    : 0;
  const autoDeductedFromPaid = Math.max(0, invoiceTotalReturnAmount - autoDeductedFromDebt);

  const effectiveDeductedFromDebt = manualSplit ? customDeductedFromDebt : autoDeductedFromDebt;
  const effectiveDeductedFromPaid = manualSplit ? customDeductedFromPaid : autoDeductedFromPaid;

  const handleInvoiceReturnSubmit = async (e) => {
    e.preventDefault();

    if (!selectedInvoice) {
      toast.error('يرجى اختيار الفاتورة أولاً');
      return;
    }

    const itemsToReturn = invoiceReturnItems.filter(i => i.isSelected && i.returnQuantity > 0);
    if (itemsToReturn.length === 0) {
      toast.error('يرجى تحديد قطعة واحدة على الأقل للإرجاع');
      return;
    }

    if (effectiveDeductedFromPaid > 0 && !selectedVaultId) {
      toast.error('يجب اختيار الخزينة لخصم المبلغ المسترد نقداً');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        invoiceId: selectedInvoice.id,
        items: itemsToReturn.map(i => ({
          productId: i.productId,
          invoiceItemId: i.invoiceItemId,
          quantity: i.returnQuantity,
          size: i.size,
          unitSalePrice: i.unitSalePrice,
          returnReason: i.returnReason || generalReason
        })),
        refundMethod: effectiveDeductedFromPaid > 0 && effectiveDeductedFromDebt > 0 ? 'MIXED' : (effectiveDeductedFromPaid > 0 ? 'VAULT_CASH' : 'DEBT_DEDUCTION'),
        deductedFromPaid: effectiveDeductedFromPaid,
        deductedFromDebt: effectiveDeductedFromDebt,
        vaultId: effectiveDeductedFromPaid > 0 ? selectedVaultId : undefined,
        returnReason: generalReason,
        notes: generalNotes
      };

      const response = await api.post('/office-returns', payload);
      toast.success(response.data?.message || 'تم تسجيل المرتجع بنجاح');
      navigate('/office-returns');
    } catch (error) {
      console.error('Error submitting return:', error);
      toast.error(error.response?.data?.error || error.message || 'فشل في تسجيل المرتجع');
    } finally {
      setLoading(false);
    }
  };

  const selectedVault = vaults.find(v => v.id === selectedVaultId);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/office-returns')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
          >
            <ArrowRight size={22} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RotateCcw className="text-teal-600" size={26} />
              تسجيل مرتجع لمبيعات المخزن الرئيسي
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              إرجاع بضاعة إلى المخزن الرئيسي، وتعديل حساب العميل، واستبعاد أرباح المرتجع
            </p>
          </div>
        </div>
      </div>

      {/* شريط التبديل بين النظامين */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
        <button
          type="button"
          onClick={() => setReturnMode('DIRECT')}
          className={`py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 ${
            returnMode === 'DIRECT'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <User size={18} />
          <span>مرتجع مباشر لعميل (اختيار العميل والأصناف)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">جديد</span>
        </button>

        <button
          type="button"
          onClick={() => setReturnMode('INVOICE')}
          className={`py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 ${
            returnMode === 'INVOICE'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Search size={18} />
          <span>مرتجع بناءً على فاتورة سابقة (بحث بالفاتورة)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* النظام الأول: مرتجع مباشر لعميل (مثل فاتورة البيع) */}
      {/* ======================================================== */}
      {returnMode === 'DIRECT' && (
        <div className="space-y-6">
          {/* خطوة 1: اختار العميل */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="text-teal-600" size={24} />
                <span>👤 خطوة 1: اختار العميل</span>
              </label>
              {selectedCustomer && (
                <span className="text-xs px-3 py-1.5 bg-teal-100 text-teal-800 font-bold rounded-lg border border-teal-300">
                  تم تحديد العميل: {selectedCustomer.name} ✓
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-extrabold text-teal-900 mb-2">
                  اختار العميل:
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-3.5 border-2 border-teal-500 rounded-xl bg-teal-50/40 font-bold text-gray-900 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm shadow-sm"
                >
                  <option value="">-- اضغط هنا واختار العميل من القائمة --</option>
                  {filteredCustomers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} {cust.phone ? `(${cust.phone})` : ''} — [الرصيد: {cust.balance || 0} ج]
                    </option>
                  ))}
                </select>
                {loadingCustomers && <p className="text-xs text-teal-600 mt-1 font-semibold">جاري تحميل قائمة العملاء...</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">
                  تصفية سريعة بالاسم أو رقم الهاتف (اختياري):
                </label>
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="اكتب لتصفية أسماء العملاء في القائمة..."
                  className="w-full p-3.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* بطاقة رصيد العميل المختار */}
            {selectedCustomer ? (
              <div className="p-4 bg-gradient-to-r from-teal-50 via-teal-50/40 to-white rounded-xl border border-teal-200 flex flex-wrap items-center justify-between gap-4 mt-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-600 text-white rounded-xl flex items-center justify-center font-bold text-lg">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{selectedCustomer.name}</h3>
                    <p className="text-xs text-gray-500">{selectedCustomer.phone || 'بدون هاتف مسجل'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-0.5">الرصيد الحالي المستحق</p>
                    <p className={`text-xl font-bold ${
                      selectedCustomer.balance > 0 ? 'text-red-600' : selectedCustomer.balance < 0 ? 'text-green-600' : 'text-gray-700'
                    }`}>
                      {selectedCustomer.balance > 0
                        ? `${selectedCustomer.balance.toFixed(2)} ج.م (عليه ديون)`
                        : selectedCustomer.balance < 0
                        ? `${Math.abs(selectedCustomer.balance).toFixed(2)} ج.م (دائن - ليه)`
                        : '0.00 ج.م (خالص)'}
                    </p>
                  </div>

                  {selectedCustomer.walletBalance > 0 && (
                    <div className="text-center border-r pr-6">
                      <p className="text-xs text-gray-500 mb-0.5">رصيد المحفظة</p>
                      <p className="text-xl font-bold text-teal-700">
                        {selectedCustomer.walletBalance.toFixed(2)} ج.م
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <Info size={16} />
                <span>اختر العميل من القائمة المنسدلة أولاً لمعرفة رصيده والبدء في تسجيل المرتجع.</span>
              </div>
            )}
          </div>

          {/* خطوة 2: إضافة الأصناف المرتجعة */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <Package size={20} className="text-teal-600" />
              <span>📦 خطوة 2: إضافة الأصناف المرتجعة (كأنك بتعمل فاتورة بيع)</span>
            </h2>

            {/* شريط الإدخال */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="md:col-span-5 relative">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  كود الصنف / الباركود أو اسم المنتج:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => {
                      setBarcodeInput(e.target.value);
                      handleProductCodeSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (productSearchResults.length === 1) {
                          selectProductForAdd(productSearchResults[0]);
                        } else if (selectedProductToAdd) {
                          handleAddDirectItem();
                        }
                      }
                    }}
                    placeholder="اكتب الباركود أو SKU واضغط Enter..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 pr-9"
                  />
                  <Barcode className="absolute right-2.5 top-3 text-gray-400" size={18} />
                </div>

                {/* قائمة الاقتراحات */}
                {productSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-30 bg-white border border-gray-300 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {productSearchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => selectProductForAdd(p)}
                        className="p-2.5 hover:bg-teal-50 cursor-pointer flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-bold text-gray-800">{p.name}</p>
                          <p className="text-gray-500 font-mono">كود: {p.sku || p.barcode || '-'}</p>
                        </div>
                        <span className="font-bold text-teal-700">
                          {p.retailPrice || p.sellingPrice || 0} ج
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">الكمية:</label>
                <input
                  type="number"
                  min="1"
                  value={inputQuantity}
                  onChange={(e) => setInputQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-bold text-center"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  سعر القطعة (قابل للتعديل):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  placeholder="السعر"
                  className="w-full p-2.5 border border-teal-400 bg-teal-50/20 rounded-lg text-sm font-bold text-teal-800 text-center focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">المقاس:</label>
                <input
                  type="text"
                  value={inputSize}
                  onChange={(e) => setInputSize(e.target.value)}
                  placeholder="مقاس"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-center"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddDirectItem}
                  disabled={!selectedProductToAdd && !barcodeInput}
                  className="w-full p-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-sm shadow"
                >
                  <Plus size={18} />
                  إضافة الصنف
                </button>
              </div>
            </div>

            {/* عرض الصنف المختار قبل الإضافة */}
            {selectedProductToAdd && (
              <div className="flex items-center justify-between p-2.5 bg-teal-50 rounded-lg border border-teal-200 text-xs">
                <span className="text-teal-900 font-bold">
                  تم تحديد الصنف: {selectedProductToAdd.name} (كود: {selectedProductToAdd.sku || selectedProductToAdd.barcode})
                </span>
                <span className="text-teal-700">
                  سعر البيع المقترح: <strong>{selectedProductToAdd.retailPrice || selectedProductToAdd.sellingPrice || 0} ج.م</strong>
                </span>
              </div>
            )}

            {/* جدول الأصناف المضافة */}
            {directItems.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">اسم الصنف</th>
                      <th className="p-3">الكود / الباركود</th>
                      <th className="p-3">المقاس</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">سعر القطعة (قابل للتعديل)</th>
                      <th className="p-3 text-center">الإجمالي</th>
                      <th className="p-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {directItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60">
                        <td className="p-3 text-gray-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-gray-900">{item.productName}</td>
                        <td className="p-3 font-mono text-gray-500">{item.sku || item.barcode}</td>
                        <td className="p-3 text-gray-600">{item.size || '-'}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              const updated = [...directItems];
                              updated[idx].quantity = val;
                              setDirectItems(updated);
                            }}
                            className="w-16 p-1 border rounded text-center font-bold"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitSalePrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...directItems];
                              updated[idx].unitSalePrice = val;
                              setDirectItems(updated);
                            }}
                            className="w-24 p-1 border border-teal-300 rounded text-center font-bold text-teal-800 bg-teal-50/30"
                          />
                        </td>
                        <td className="p-3 text-center font-bold text-gray-900">
                          {(item.quantity * item.unitSalePrice).toFixed(2)} ج.م
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setDirectItems(directItems.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 text-sm">
                📦 لم يتم إضافة أي صنف حتى الآن. اكتب كود الصنف أو الباركود واختر الكمية والسعر لإضافته.
              </div>
            )}
          </div>

          {/* خطوة 3: الملخص المالي وتأكيد المرتجع */}
          {directItems.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <DollarSign size={20} className="text-teal-600" />
                <span>💰 خطوة 3: الحسابات والخصم من العميل</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                  <p className="text-xs text-teal-700 mb-1 font-medium">إجمالي قيمة المرتجع</p>
                  <p className="text-2xl font-bold text-teal-900">{directTotalAmount.toFixed(2)} ج.م</p>
                  <p className="text-xs text-gray-500 mt-1">يُخصم تلقائياً من ديون العميل</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-xs text-blue-700 mb-1 font-medium">تكلفة البضاعة المرتجعة</p>
                  <p className="text-2xl font-bold text-blue-900">{directTotalCost.toFixed(2)} ج.م</p>
                  <p className="text-xs text-gray-500 mt-1">تُعاد فوراً إلى رصيد المخزن الرئيسي</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-700 mb-1 font-medium">أرباح مستبعدة من التقارير</p>
                  <p className="text-2xl font-bold text-amber-900">{directTotalProfit.toFixed(2)} ج.م</p>
                  <p className="text-xs text-gray-500 mt-1">تُطرح من الأرباح وقائمة الدخل</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-xs text-purple-700 mb-1 font-medium">رصيد العميل بعد المرتجع</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {selectedCustomer ? (selectedCustomer.balance - directTotalAmount).toFixed(2) : '0.00'} ج.م
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedCustomer && (selectedCustomer.balance - directTotalAmount) > 0 ? 'متبقي عليه ديون' : 'خالص أو رصيد بالمحفظة'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">ملاحظات على المرتجع:</label>
                <textarea
                  value={directNotes}
                  onChange={(e) => setDirectNotes(e.target.value)}
                  rows="2"
                  placeholder="أدخل أي ملاحظات حول سبب الإرجاع أو حالة البضاعة..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => navigate('/office-returns')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleDirectReturnSubmit}
                  disabled={loading || !selectedCustomer || directItems.length === 0}
                  className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 text-base"
                >
                  <CheckCircle size={20} />
                  {loading ? 'جاري تسجيل المرتجع...' : `تأكيد وتسجيل المرتجع (${directTotalPieces} قطعة - ${directTotalAmount.toFixed(2)} ج.م)`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* النظام الثاني: مرتجع بناءً على فاتورة سابقة (البحث) */}
      {/* ======================================================== */}
      {returnMode === 'INVOICE' && (
        <div className="space-y-6">
          {/* البحث عن الفاتورة */}
          {!selectedInvoice && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Search size={20} className="text-red-600" />
                البحث عن الفاتورة الأصلية المراد إرجاعها
              </h2>
              <form onSubmit={handleSearch} className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="اكتب رقم الفاتورة (مثال: OF-20260917-00001) أو اسم العميل أو هاتفه..."
                  className="flex-1 p-3.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Search size={18} />
                  {searching ? 'جاري البحث...' : 'بحث عن الفاتورة'}
                </button>
              </form>

              {/* نتائج البحث */}
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
                  <div className="bg-gray-50 p-3 text-xs font-bold text-gray-600 border-b">
                    نتائج البحث ({searchResults.length} فاتورة)
                  </div>
                  <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {searchResults.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setupInvoiceForReturn(inv);
                          setSearchResults([]);
                        }}
                        className="p-4 hover:bg-red-50/40 cursor-pointer flex justify-between items-center transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700">{inv.invoiceNumber}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                              {inv.type === 'REGULAR' ? 'زبون عادي' : inv.type === 'SHIPMENT' ? 'شحن' : 'عميل دائم'}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-gray-800 mt-1">
                            العميل: {inv.customerName} {inv.customerPhone ? `(${inv.customerPhone})` : ''}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            التاريخ: {new Date(inv.createdAt).toLocaleDateString('ar-EG')} • الأصناف المتاحة للإرجاع: {inv.totalAvailablePieces || 0} قطعة
                          </div>
                        </div>

                        <div className="text-left">
                          <p className="font-bold text-gray-900 text-sm">{inv.total?.toFixed(2)} ج.م</p>
                          <p className="text-xs text-emerald-600">مدفوع: {inv.paidAmount?.toFixed(2)} ج</p>
                          {inv.remainingAmount > 0 && (
                            <p className="text-xs text-red-600">متبقي: {inv.remainingAmount?.toFixed(2)} ج</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تفاصيل الفاتورة وبنود الإرجاع */}
          {selectedInvoice && (
            <form onSubmit={handleInvoiceReturnSubmit} className="space-y-6">
              {/* ملخص الفاتورة المحددة */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-lg">فاتورة رقم {selectedInvoice.invoiceNumber}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                        {selectedInvoice.type === 'REGULAR' ? 'زبون عادي' : selectedInvoice.type === 'SHIPMENT' ? 'شحن' : 'عميل دائم'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      العميل: <strong className="text-gray-700">{selectedInvoice.customerName}</strong> {selectedInvoice.customerPhone && `(${selectedInvoice.customerPhone})`}
                      {' • '}التاريخ: {new Date(selectedInvoice.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">إجمالي الفاتورة</span>
                    <span className="font-bold text-gray-800">{selectedInvoice.total?.toFixed(2)} ج.م</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">المدفوع</span>
                    <span className="font-bold text-emerald-600">{selectedInvoice.paidAmount?.toFixed(2)} ج.م</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">المتبقي (المديونية)</span>
                    <span className="font-bold text-red-600">{selectedInvoice.remainingAmount?.toFixed(2)} ج.م</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoice(null);
                      setInvoiceReturnItems([]);
                    }}
                    className="text-xs text-blue-600 hover:underline px-3 py-1 bg-blue-50 rounded-lg"
                  >
                    تغيير الفاتورة
                  </button>
                </div>
              </div>

              {/* جدول بنود الفاتورة */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <Package size={20} className="text-red-600" />
                  الأصناف المتاحة للإرجاع من الفاتورة
                </h2>

                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-right border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-600">
                        <th className="p-3 text-center">تحديد</th>
                        <th className="p-3">اسم المنتج</th>
                        <th className="p-3">الكود</th>
                        <th className="p-3">المقاس</th>
                        <th className="p-3 text-center">الكمية المباعة</th>
                        <th className="p-3 text-center">المرتجع سابقاً</th>
                        <th className="p-3 text-center">المتاح للإرجاع</th>
                        <th className="p-3 text-center">الكمية المراد إرجاعها</th>
                        <th className="p-3">سعر البيع</th>
                        <th className="p-3">إجمالي الإرجاع</th>
                        <th className="p-3">سبب الإرجاع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoiceReturnItems.map((item, idx) => {
                        const canReturn = item.availableQuantity > 0;
                        return (
                          <tr key={idx} className={item.isSelected ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={item.isSelected}
                                disabled={!canReturn}
                                onChange={() => toggleInvoiceItemSelection(idx)}
                                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                              />
                            </td>
                            <td className="p-3 font-semibold text-gray-800">{item.productName}</td>
                            <td className="p-3 font-mono text-xs text-gray-500">{item.productSku}</td>
                            <td className="p-3 text-gray-600 text-xs">{item.size || '-'}</td>
                            <td className="p-3 text-center font-bold text-gray-700">{item.soldQuantity}</td>
                            <td className="p-3 text-center text-amber-700">{item.returnedQuantity}</td>
                            <td className="p-3 text-center font-bold text-emerald-700">{item.availableQuantity}</td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max={item.availableQuantity}
                                value={item.returnQuantity}
                                disabled={!item.isSelected}
                                onChange={(e) => updateInvoiceItemQuantity(idx, e.target.value)}
                                className="w-16 p-1.5 border rounded-lg text-center font-bold text-red-600 border-red-300 disabled:bg-gray-100"
                              />
                            </td>
                            <td className="p-3 text-gray-800">{item.unitSalePrice?.toFixed(2)} ج.م</td>
                            <td className="p-3 font-bold text-red-700">
                              {(item.returnQuantity * item.unitSalePrice).toFixed(2)} ج.م
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={item.returnReason}
                                disabled={!item.isSelected}
                                onChange={(e) => updateInvoiceItemReason(idx, e.target.value)}
                                className="p-1 border rounded text-xs w-full disabled:bg-gray-100"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* تسوية المبلغ */}
                <div className="p-5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-900 text-base">إجمالي قيمة المرتجع:</span>
                    <span className="text-2xl font-bold text-red-600">{invoiceTotalReturnAmount.toFixed(2)} ج.م</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-amber-200">
                      <label className="text-xs font-bold text-blue-800 block mb-1">
                        📉 الخصم من مديونية الفاتورة:
                      </label>
                      <div className="text-xl font-bold text-blue-700">
                        {effectiveDeductedFromDebt.toFixed(2)} ج.م
                      </div>
                      <p className="text-xs text-gray-500 mt-1">يقلل رصيد الدين المتبقي على العميل</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-amber-200">
                      <label className="text-xs font-bold text-emerald-800 block mb-1">
                        💵 المبلغ المسترد نقداً من الخزينة:
                      </label>
                      <div className="text-xl font-bold text-emerald-700">
                        {effectiveDeductedFromPaid.toFixed(2)} ج.م
                      </div>
                      <p className="text-xs text-gray-500 mt-1">يُصرف كاش للعميل ويُخصم من الخزينة</p>
                    </div>
                  </div>

                  {effectiveDeductedFromPaid > 0 && (
                    <div className="bg-white p-4 rounded-lg border border-emerald-300 space-y-2">
                      <label className="block text-sm font-bold text-gray-800">
                        الخزينة المنصرف منها المبلغ النقدي ({effectiveDeductedFromPaid.toFixed(2)} ج.م) *
                      </label>
                      <select
                        value={selectedVaultId}
                        onChange={(e) => setSelectedVaultId(e.target.value)}
                        className="w-full p-3 border border-emerald-300 rounded-lg bg-emerald-50/40 font-bold text-gray-800"
                        required
                      >
                        <option value="">-- اختر الخزينة للصرف --</option>
                        {vaults.map((vault) => (
                          <option key={vault.id} value={vault.id}>
                            {vault.name} (الرصيد: {vault.balance?.toFixed(2) || '0.00'} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات إضافية على المرتجع</label>
                  <textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    rows="2"
                    placeholder="أدخل أي ملاحظات حول سبب الإرجاع أو حالة البضاعة..."
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/office-returns')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading || invoiceTotalReturnPieces === 0}
                    className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 text-base"
                  >
                    <RotateCcw size={20} />
                    {loading ? 'جاري تسجيل المرتجع...' : `تأكيد المرتجع (${invoiceTotalReturnPieces} قطعة - ${invoiceTotalReturnAmount.toFixed(2)} ج.م)`}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
