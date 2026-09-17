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
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export default function CreateOfficeReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledInvoiceId = searchParams.get('invoiceId');

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  
  const [vaults, setVaults] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState('');
  
  const [generalReason, setGeneralReason] = useState('رغبة العميل');
  const [generalNotes, setGeneralNotes] = useState('');
  
  // Custom settlement overrides
  const [manualSplit, setManualSplit] = useState(false);
  const [customDeductedFromPaid, setCustomDeductedFromPaid] = useState(0);
  const [customDeductedFromDebt, setCustomDeductedFromDebt] = useState(0);

  useEffect(() => {
    fetchVaults();
    if (prefilledInvoiceId) {
      loadInvoiceById(prefilledInvoiceId);
    }
  }, [prefilledInvoiceId]);

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
    
    // إعداد بنود الفاتورة مع خانات الإرجاع
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

    setReturnItems(items);
    setManualSplit(false);
  };

  const toggleItemSelection = (index) => {
    const updated = [...returnItems];
    const item = updated[index];
    item.isSelected = !item.isSelected;
    if (item.isSelected && item.returnQuantity === 0) {
      item.returnQuantity = item.availableQuantity > 0 ? 1 : 0;
    } else if (!item.isSelected) {
      item.returnQuantity = 0;
    }
    setReturnItems(updated);
  };

  const updateItemQuantity = (index, qty) => {
    const updated = [...returnItems];
    const item = updated[index];
    const parsed = parseInt(qty) || 0;
    const bounded = Math.max(0, Math.min(item.availableQuantity, parsed));
    item.returnQuantity = bounded;
    item.isSelected = bounded > 0;
    setReturnItems(updated);
  };

  const updateItemReason = (index, reason) => {
    const updated = [...returnItems];
    updated[index].returnReason = reason;
    setReturnItems(updated);
  };

  // الحسابات المالية
  const calculateTotalReturn = () => {
    return returnItems.reduce((sum, item) => {
      if (item.isSelected && item.returnQuantity > 0) {
        return sum + (item.returnQuantity * item.unitSalePrice);
      }
      return sum;
    }, 0);
  };

  const totalReturnAmount = calculateTotalReturn();
  const totalReturnPieces = returnItems.reduce((sum, i) => sum + (i.isSelected ? i.returnQuantity : 0), 0);

  // احتساب التوزيع التلقائي:
  // أولاً يخصم من الدين، والباقي يُسترد نقداً من الخزينة
  const autoDeductedFromDebt = selectedInvoice 
    ? Math.min(selectedInvoice.remainingAmount || 0, totalReturnAmount) 
    : 0;
  const autoDeductedFromPaid = Math.max(0, totalReturnAmount - autoDeductedFromDebt);

  const effectiveDeductedFromDebt = manualSplit ? customDeductedFromDebt : autoDeductedFromDebt;
  const effectiveDeductedFromPaid = manualSplit ? customDeductedFromPaid : autoDeductedFromPaid;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedInvoice) {
      toast.error('يرجى اختيار الفاتورة أولاً');
      return;
    }

    const itemsToReturn = returnItems.filter(i => i.isSelected && i.returnQuantity > 0);
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
      <div className="flex items-center justify-between bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/office-returns')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowRight size={22} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RotateCcw className="text-red-600" size={24} />
              تسجيل مرتجع لمبيعات المخزن الرئيسي
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              إرجاع بضاعة إلى المخزن الرئيسي وخصم قيمتها من الخزينة أو من مديونية العميل
            </p>
          </div>
        </div>
      </div>

      {/* 1. Search for Invoice Section (if not selected) */}
      {!selectedInvoice && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <Search size={20} className="text-blue-600" />
            البحث عن الفاتورة الأصلية المراد إرجاعها
          </h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="اكتب رقم الفاتورة (مثال: OF-20260917-00001) أو اسم العميل أو هاتفه..."
              className="flex-1 p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              <Search size={18} />
              {searching ? 'جاري البحث...' : 'بحث عن الفاتورة'}
            </button>
          </form>

          {/* Search Results List */}
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
                      <div className="font-bold text-gray-900">{inv.total?.toFixed(2)} ج.م</div>
                      {inv.remainingAmount > 0 ? (
                        <div className="text-xs text-red-600 font-bold">متبقي دين: {inv.remainingAmount?.toFixed(2)} ج</div>
                      ) : (
                        <div className="text-xs text-emerald-600 font-bold">مسددة بالكامل</div>
                      )}
                      <button
                        type="button"
                        className="mt-2 text-xs font-bold text-red-600 hover:underline"
                      >
                        اختيار هذه الفاتورة ←
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Selected Invoice Overview & Return Form */}
      {selectedInvoice && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Info Card */}
          <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-5 rounded-xl border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded">
                  الفاتورة المختارة
                </span>
                <span className="font-mono font-bold text-lg text-blue-900">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="text-gray-800 font-bold mt-1.5 flex items-center gap-2">
                <User size={16} className="text-gray-500" />
                <span>{selectedInvoice.customerName}</span>
                {selectedInvoice.customerPhone && (
                  <span className="text-xs text-gray-500 font-mono">({selectedInvoice.customerPhone})</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-4">
                <span>تاريخ الفاتورة: {new Date(selectedInvoice.createdAt).toLocaleDateString('ar-EG')}</span>
                <span>طريقة الدفع الأصلية: {selectedInvoice.paymentMethod === 'CREDIT' ? 'آجل' : 'كاش'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-left">
              <div className="bg-white p-3 rounded-lg border border-blue-200 text-center min-w-[100px]">
                <span className="text-xs text-gray-500 block">إجمالي الفاتورة</span>
                <span className="font-bold text-gray-900 text-base">{selectedInvoice.total?.toFixed(2)} ج</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center min-w-[100px]">
                <span className="text-xs text-emerald-600 block">المدفوع</span>
                <span className="font-bold text-emerald-700 text-base">{selectedInvoice.paidAmount?.toFixed(2)} ج</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-red-200 text-center min-w-[100px]">
                <span className="text-xs text-red-600 block">المتبقي دين</span>
                <span className="font-bold text-red-700 text-base">{selectedInvoice.remainingAmount?.toFixed(2)} ج</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoice(null);
                  setReturnItems([]);
                }}
                className="text-xs text-gray-500 hover:text-red-600 p-2 hover:bg-white rounded-lg transition"
                title="تغيير الفاتورة"
              >
                تغيير الفاتورة
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Package size={18} className="text-red-600" />
                  أصناف الفاتورة المراد إرجاعها للمخزن الرئيسي
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  حدد الأصناف والكميات المراد إرجاعها. سيتم إرجاع البضاعة فورياً لرصيد المخزن الرئيسي (MAIN).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-bold text-gray-600 border-b border-gray-200">
                    <th className="p-3 text-center w-12">اختيار</th>
                    <th className="p-3">اسم المنتج / الكود</th>
                    <th className="p-3">المقاس</th>
                    <th className="p-3 text-center">الكمية المباعة</th>
                    <th className="p-3 text-center">المرتجع سابقاً</th>
                    <th className="p-3 text-center">المتاح للإرجاع</th>
                    <th className="p-3 text-center w-32">الكمية المرتجعة الآن</th>
                    <th className="p-3">سعر البيع</th>
                    <th className="p-3">إجمالي قيمة المرتجع</th>
                    <th className="p-3">سبب الإرجاع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returnItems.map((item, index) => {
                    const isAvailable = item.availableQuantity > 0;
                    const lineTotal = (item.returnQuantity || 0) * item.unitSalePrice;

                    return (
                      <tr 
                        key={item.invoiceItemId || index}
                        className={`transition-colors ${item.isSelected ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            disabled={!isAvailable}
                            onChange={() => toggleItemSelection(index)}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer disabled:opacity-30"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-gray-900">{item.productName}</div>
                          <div className="text-xs font-mono text-gray-400">{item.productSku}</div>
                        </td>
                        <td className="p-3 font-semibold text-gray-700">{item.size || '---'}</td>
                        <td className="p-3 text-center font-semibold text-gray-700">{item.soldQuantity}</td>
                        <td className="p-3 text-center text-amber-700 font-bold">{item.returnedQuantity}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {item.availableQuantity}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.availableQuantity}
                            value={item.returnQuantity || ''}
                            disabled={!isAvailable}
                            onChange={(e) => updateItemQuantity(index, e.target.value)}
                            className={`w-20 p-2 text-center font-bold border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none ${
                              item.isSelected && item.returnQuantity > 0 
                                ? 'border-red-500 bg-white text-red-700 font-bold' 
                                : 'border-gray-300 bg-gray-50'
                            }`}
                            placeholder="0"
                          />
                        </td>
                        <td className="p-3 text-gray-700">{item.unitSalePrice.toFixed(2)} ج</td>
                        <td className="p-3 font-bold text-red-600">
                          {lineTotal > 0 ? `${lineTotal.toFixed(2)} ج` : '0.00'}
                        </td>
                        <td className="p-3">
                          <select
                            value={item.returnReason}
                            onChange={(e) => updateItemReason(index, e.target.value)}
                            disabled={!item.isSelected}
                            className="p-1.5 text-xs border rounded-lg bg-white disabled:bg-gray-100 disabled:opacity-50"
                          >
                            <option value="رغبة العميل">رغبة العميل</option>
                            <option value="عيب تصنيع">عيب تصنيع</option>
                            <option value="مقاس غير مناسب">مقاس غير مناسب</option>
                            <option value="صنف غير مطابق">صنف غير مطابق</option>
                            <option value="استبدال">استبدال</option>
                            <option value="أخرى">أخرى</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Settlement & Financial Breakdown Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 border-b pb-3">
              <DollarSign size={20} className="text-emerald-600" />
              التسوية المالية وقيمة المرتجع
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <span className="text-xs text-gray-500 block mb-1">القطع المراد إرجاعها:</span>
                <span className="text-2xl font-bold text-gray-900">{totalReturnPieces}</span>
                <span className="text-xs text-gray-500 mr-1">قطعة</span>
              </div>

              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <span className="text-xs text-red-600 block mb-1">إجمالي قيمة المرتجع:</span>
                <span className="text-2xl font-bold text-red-700">{totalReturnAmount.toFixed(2)}</span>
                <span className="text-xs text-red-600 mr-1">ج.م</span>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <span className="text-xs text-blue-600 block mb-1">المتبقي دين على الفاتورة:</span>
                <span className="text-2xl font-bold text-blue-800">
                  {selectedInvoice.remainingAmount?.toFixed(2)}
                </span>
                <span className="text-xs text-blue-600 mr-1">ج.م</span>
              </div>
            </div>

            {/* Smart Settlement breakdown */}
            <div className="bg-amber-50/70 p-5 rounded-xl border border-amber-200 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">كيفية تسوية المبلغ المرتجع ({totalReturnAmount.toFixed(2)} ج.م)</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    يقوم النظام تلقائياً بخصم المرتجع من الدين المتبقي على الفاتورة أولاً، وما زاد يُرد نقداً من الخزينة للعميل.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualSplit}
                    onChange={(e) => {
                      setManualSplit(e.target.checked);
                      if (e.target.checked) {
                        setCustomDeductedFromDebt(autoDeductedFromDebt);
                        setCustomDeductedFromPaid(autoDeductedFromPaid);
                      }
                    }}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  تخصيص يدوي للمبالغ
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Deduct from Debt */}
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <label className="text-xs font-bold text-blue-800 block mb-1">
                    📉 المبلغ المخصوم من مديونية الفاتورة:
                  </label>
                  {manualSplit ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalReturnAmount}
                      value={customDeductedFromDebt}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCustomDeductedFromDebt(val);
                        setCustomDeductedFromPaid(Math.max(0, totalReturnAmount - val));
                      }}
                      className="w-full p-2 border rounded font-bold text-blue-700"
                    />
                  ) : (
                    <div className="text-xl font-bold text-blue-700">
                      {autoDeductedFromDebt.toFixed(2)} ج.م
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">يقلل رصيد الدين المتبقي على العميل</p>
                </div>

                {/* Deduct / Refund from Vault */}
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <label className="text-xs font-bold text-emerald-800 block mb-1">
                    💵 المبلغ المسترد نقداً للعميل من الخزينة:
                  </label>
                  {manualSplit ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalReturnAmount}
                      value={customDeductedFromPaid}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCustomDeductedFromPaid(val);
                        setCustomDeductedFromDebt(Math.max(0, totalReturnAmount - val));
                      }}
                      className="w-full p-2 border rounded font-bold text-emerald-700"
                    />
                  ) : (
                    <div className="text-xl font-bold text-emerald-700">
                      {autoDeductedFromPaid.toFixed(2)} ج.م
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">يُصرف كاش للعميل ويُخصم من الخزينة</p>
                </div>
              </div>

              {/* Vault Selection if any cash is refunded */}
              {effectiveDeductedFromPaid > 0 && (
                <div className="bg-white p-4 rounded-lg border border-emerald-300 space-y-2">
                  <label className="block text-sm font-bold text-gray-800">
                    الخزينة المنصرف منها المبلغ النقدي ({effectiveDeductedFromPaid.toFixed(2)} ج.م) *
                  </label>
                  <select
                    value={selectedVaultId}
                    onChange={(e) => setSelectedVaultId(e.target.value)}
                    className="w-full p-3 border border-emerald-300 rounded-lg bg-emerald-50/40 font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">-- اختر الخزينة للصرف --</option>
                    {vaults.map((vault) => {
                      const icon = vault.type === 'CASH' ? '💵' : vault.type === 'VISA' ? '💳' : '📱';
                      return (
                        <option key={vault.id} value={vault.id}>
                          {icon} {vault.name} (الرصيد المتاح: {vault.balance?.toFixed(2) || '0.00'} ج.م)
                        </option>
                      );
                    })}
                  </select>

                  {selectedVault && (
                    <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                      <span>الرصيد الحالي: <strong className="text-gray-800">{selectedVault.balance?.toFixed(2)} ج</strong></span>
                      <span>الرصيد بعد صرف المرتجع: <strong className={selectedVault.balance - effectiveDeductedFromPaid < 0 ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                        {(selectedVault.balance - effectiveDeductedFromPaid).toFixed(2)} ج
                      </strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* General Notes */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات إضافية على المرتجع</label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات حول سبب الإرجاع أو حالة البضاعة المستلمة..."
                rows="2"
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Actions */}
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
              disabled={loading || totalReturnPieces === 0}
              className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              <RotateCcw size={20} />
              {loading ? 'جاري تسجيل المرتجع...' : `تأكيد المرتجع (${totalReturnPieces} قطعة - ${totalReturnAmount.toFixed(2)} ج.م)`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
