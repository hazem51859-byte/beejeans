import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { returnsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Plus, Eye, CheckCircle, Package, TrendingDown, RotateCcw, Search, Trash2, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ======================================================
// قسم مرتجعات المخزن الرئيسي (النظام الجديد)
// ======================================================
function StoreReturnSystem() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeView, setActiveView] = useState('create'); // 'create' | 'history'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [items, setItems] = useState([]);
  const [productCode, setProductCode] = useState('');
  const [notes, setNotes] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const productCodeRef = useRef(null);

  // ---- الفلاتر للسجل ----
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyCustomerId, setHistoryCustomerId] = useState('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // جلب العملاء
  const { data: customersRes } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });
  const allCustomers = customersRes?.data?.data || customersRes?.data || [];

  // جلب بيانات عميل محدد (للرصيد)
  const { data: customerDetailRes } = useQuery({
    queryKey: ['customer-detail', selectedCustomer?.id],
    queryFn: () => api.get(`/customers/${selectedCustomer.id}`),
    enabled: !!selectedCustomer?.id,
  });
  const customerDetail = customerDetailRes?.data?.data || null;

  // جلب سجل المرتجعات
  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['store-returns', historyDateFrom, historyDateTo, historyCustomerId],
    queryFn: () => api.get('/store-returns', {
      params: {
        startDate: historyDateFrom || undefined,
        endDate: historyDateTo || undefined,
        customerId: historyCustomerId || undefined,
      }
    }),
    enabled: activeView === 'history',
  });
  const historyData = historyRes?.data?.data || historyRes?.data || [];

  // جلب إحصائيات
  const { data: statsRes } = useQuery({
    queryKey: ['store-returns-stats'],
    queryFn: () => api.get('/store-returns/stats'),
  });
  const stats = statsRes?.data?.data || {};

  // إنشاء المرتجع
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/store-returns', data),
    onSuccess: () => {
      toast.success('✅ تم تسجيل المرتجع بنجاح وإرجاع البضاعة للمخزن');
      queryClient.invalidateQueries(['store-returns']);
      queryClient.invalidateQueries(['store-returns-stats']);
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['customer-detail']);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'خطأ في تسجيل المرتجع');
    }
  });

  const filteredCustomers = allCustomers.filter(c =>
    c.name?.includes(customerSearch) || c.phone?.includes(customerSearch)
  ).slice(0, 10);

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setItems([]);
    setProductCode('');
    setNotes('');
  };

  // البحث عن المنتج بالكود/البيركود
  const handleProductSearch = async (e) => {
    if (e.key !== 'Enter' && e.type !== 'click') return;
    if (!productCode.trim()) return;

    try {
      const res = await api.get('/products/search', { params: { q: productCode.trim() } });
      const products = res.data?.data || res.data || [];
      const product = Array.isArray(products) ? products[0] : products;

      if (!product?.id) {
        toast.error('المنتج غير موجود');
        return;
      }

      // هل المنتج موجود بالفعل؟
      const existingIdx = items.findIndex(i => i.productId === product.id);
      if (existingIdx >= 0) {
        const updated = [...items];
        updated[existingIdx].quantity += 1;
        setItems(updated);
        toast.success(`تمت إضافة قطعة إضافية: ${product.name}`);
      } else {
        setItems(prev => [...prev, {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: 1,
          unitSalePrice: product.sellingPrice || 0,
          unitCostPrice: product.costPrice || 0,
          size: product.size || '',
          returnReason: '',
        }]);
        toast.success(`تم إضافة: ${product.name}`);
      }
      setProductCode('');
      productCodeRef.current?.focus();
    } catch (err) {
      toast.error('خطأ في البحث عن المنتج');
    }
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'quantity' || field === 'unitSalePrice' ? parseFloat(value) || 0 : value;
    setItems(updated);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, i) => sum + (i.unitSalePrice * i.quantity), 0);
  const totalCost = items.reduce((sum, i) => sum + (i.unitCostPrice * i.quantity), 0);
  const totalProfit = totalAmount - totalCost;

  const handleSubmit = () => {
    if (!selectedCustomer) { toast.error('يرجى اختيار العميل'); return; }
    if (items.length === 0) { toast.error('يرجى إضافة أصناف'); return; }
    const invalidItem = items.find(i => !i.unitSalePrice || i.unitSalePrice <= 0 || i.quantity <= 0);
    if (invalidItem) { toast.error(`يرجى التأكد من سعر وكمية: ${invalidItem.productName}`); return; }

    createMutation.mutate({
      customerId: selectedCustomer.id,
      items: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitSalePrice: i.unitSalePrice,
        size: i.size || null,
        returnReason: i.returnReason || null,
      })),
      notes,
    });
  };

  // حساب الرصيد الصافي للعميل
  const salesDebt = customerDetail?.salesDebt || 0;
  const officeDebt = customerDetail?.officeDebt || 0;
  const walletBalance = customerDetail?.walletBalance || 0;
  const netBalance = salesDebt + officeDebt - walletBalance;

  const fmt = (n) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' ج.م';

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="card bg-orange-50 border-r-4 border-orange-500 py-3">
          <p className="text-xs text-gray-500">إجمالي المرتجعات</p>
          <p className="text-xl font-bold text-orange-700">{stats.totalReturns || 0}</p>
        </div>
        <div className="card bg-red-50 border-r-4 border-red-500 py-3">
          <p className="text-xs text-gray-500">قيمة المرتجعات</p>
          <p className="text-lg font-bold text-red-700">{fmt(stats.totalAmount)}</p>
        </div>
        <div className="card bg-blue-50 border-r-4 border-blue-500 py-3">
          <p className="text-xs text-gray-500">إجمالي التكلفة</p>
          <p className="text-lg font-bold text-blue-700">{fmt(stats.totalCost)}</p>
        </div>
        <div className="card bg-purple-50 border-r-4 border-purple-500 py-3">
          <p className="text-xs text-gray-500">الأرباح المُشطَبة</p>
          <p className="text-lg font-bold text-purple-700">{fmt(stats.totalProfit)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b">
        <button
          onClick={() => setActiveView('create')}
          className={`px-5 py-2 text-sm font-semibold border-b-2 transition-colors ${activeView === 'create' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          ➕ مرتجع جديد
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`px-5 py-2 text-sm font-semibold border-b-2 transition-colors ${activeView === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          📋 سجل المرتجعات
        </button>
      </div>

      {/* CREATE VIEW */}
      {activeView === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Customer + Product Entry */}
          <div className="lg:col-span-2 space-y-4">

            {/* Customer Search */}
            <div className="card">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <User size={18} className="text-blue-600" /> اختيار العميل
              </h3>
              <div className="relative">
                <input
                  type="text"
                  className="input-field"
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  value={selectedCustomer ? selectedCustomer.name : customerSearch}
                  onChange={(e) => {
                    if (selectedCustomer) setSelectedCustomer(null);
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                />
                {selectedCustomer && (
                  <button
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                    onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                  ><X size={16} /></button>
                )}
                {showCustomerDropdown && !selectedCustomer && filteredCustomers.length > 0 && (
                  <div className="absolute top-full right-0 left-0 z-50 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between"
                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Balance Info */}
              {selectedCustomer && customerDetail && (
                <div className="mt-3 grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg text-center">
                  <div>
                    <p className="text-xs text-gray-500">ديون المخزن</p>
                    <p className={`font-bold text-sm ${officeDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(officeDebt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">رصيد المحفظة</p>
                    <p className={`font-bold text-sm ${walletBalance > 0 ? 'text-green-600' : 'text-gray-400'}`}>{fmt(walletBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">الصافي عليه</p>
                    <p className={`font-bold text-sm ${netBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>{fmt(netBalance)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Product Search */}
            <div className="card">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Search size={18} className="text-green-600" /> إضافة الأصناف بالكود / الباركود
              </h3>
              <div className="flex gap-2">
                <input
                  ref={productCodeRef}
                  type="text"
                  className="input-field flex-1"
                  placeholder="اكتب الكود أو الباركود ثم اضغط Enter..."
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  onKeyDown={handleProductSearch}
                  disabled={!selectedCustomer}
                />
                <button
                  className="btn-primary px-4"
                  onClick={handleProductSearch}
                  disabled={!selectedCustomer || !productCode.trim()}
                >
                  إضافة
                </button>
              </div>
              {!selectedCustomer && (
                <p className="text-xs text-amber-600 mt-2">⚠️ اختر العميل أولاً</p>
              )}
            </div>

            {/* Items Table */}
            {items.length > 0 && (
              <div className="card overflow-x-auto">
                <h3 className="font-bold text-gray-700 mb-3">الأصناف المرتجعة ({items.length})</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-right">المنتج</th>
                      <th className="px-3 py-2 text-center w-20">الكمية</th>
                      <th className="px-3 py-2 text-center w-32">سعر القطعة</th>
                      <th className="px-3 py-2 text-center w-28">الإجمالي</th>
                      <th className="px-3 py-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-gray-400">{item.sku}</p>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="input-field text-center py-1 px-2 w-full"
                            value={item.quantity}
                            min="1"
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="input-field text-center py-1 px-2 w-full"
                            value={item.unitSalePrice}
                            min="0"
                            step="0.5"
                            onChange={(e) => updateItem(idx, 'unitSalePrice', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-red-600">
                          {fmt(item.unitSalePrice * item.quantity)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            className="text-red-400 hover:text-red-600"
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notes */}
            <div className="card">
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
              <textarea
                className="input-field"
                rows="2"
                placeholder="أي ملاحظات..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Summary */}
          <div className="space-y-4">
            <div className="card bg-gradient-to-b from-red-50 to-orange-50 border border-red-200 sticky top-4">
              <h3 className="font-bold text-lg text-gray-800 mb-4 text-center">ملخص المرتجع</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600 text-sm">العميل</span>
                  <span className="font-bold text-sm">{selectedCustomer?.name || '---'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600 text-sm">عدد الأصناف</span>
                  <span className="font-bold">{items.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600 text-sm">إجمالي القطع</span>
                  <span className="font-bold">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>

                <div className="bg-white rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">قيمة المرتجع</span>
                    <span className="font-semibold text-red-600">{fmt(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">إجمالي التكلفة</span>
                    <span className="font-semibold text-blue-600">{fmt(totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-500">الربح المُشطَب</span>
                    <span className="font-semibold text-orange-600">{fmt(totalProfit)}</span>
                  </div>
                </div>

                <div className="bg-red-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">سيُخصَم من حساب العميل</p>
                  <p className="text-2xl font-extrabold text-red-700">{fmt(totalAmount)}</p>
                </div>

                <div className="text-xs text-gray-500 bg-blue-50 rounded p-2">
                  <p>✅ البضاعة ستعود للمخزن الرئيسي</p>
                  <p>✅ يُخصَم من ديون العميل تلقائياً</p>
                  <p>✅ الأرباح تُحدَّث في التقرير الشهري</p>
                </div>
              </div>

              <button
                className="w-full mt-4 btn-primary bg-red-600 hover:bg-red-700 py-3 text-base font-bold"
                onClick={handleSubmit}
                disabled={!selectedCustomer || items.length === 0 || createMutation.isPending}
              >
                {createMutation.isPending ? '⏳ جاري التسجيل...' : '✅ تأكيد المرتجع'}
              </button>
              {items.length > 0 && (
                <button
                  className="w-full mt-2 btn-secondary text-sm"
                  onClick={resetForm}
                >
                  🗑️ مسح الكل
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeView === 'history' && (
        <div>
          {/* Filters */}
          <div className="card mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">من تاريخ</label>
                <input type="date" className="input-field" value={historyDateFrom} onChange={(e) => setHistoryDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">إلى تاريخ</label>
                <input type="date" className="input-field" value={historyDateTo} onChange={(e) => setHistoryDateTo(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">العميل</label>
                <select className="input-field" value={historyCustomerId} onChange={(e) => setHistoryCustomerId(e.target.value)}>
                  <option value="">كل العملاء</option>
                  {allCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="card overflow-x-auto">
            {historyLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <RotateCcw size={40} className="mx-auto mb-2 opacity-30" />
                <p>لا توجد مرتجعات</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-right">رقم المرتجع</th>
                    <th className="px-4 py-2 text-right">العميل</th>
                    <th className="px-4 py-2 text-center">القطع</th>
                    <th className="px-4 py-2 text-center">قيمة المرتجع</th>
                    <th className="px-4 py-2 text-center">التكلفة</th>
                    <th className="px-4 py-2 text-center">ربح مُشطَب</th>
                    <th className="px-4 py-2 text-center">التاريخ</th>
                    <th className="px-4 py-2 text-center">تفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((ret) => (
                    <tr key={ret.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-bold text-blue-600">{ret.returnNumber}</td>
                      <td className="px-4 py-2">
                        <p className="font-medium">{ret.customerName}</p>
                        <p className="text-xs text-gray-400">{ret.customerPhone}</p>
                      </td>
                      <td className="px-4 py-2 text-center font-bold">
                        {ret.items?.reduce((s, i) => s + i.quantity, 0) || 0}
                      </td>
                      <td className="px-4 py-2 text-center font-bold text-red-600">{fmt(ret.totalAmount)}</td>
                      <td className="px-4 py-2 text-center text-blue-600">{fmt(ret.totalCost)}</td>
                      <td className="px-4 py-2 text-center text-orange-600">{fmt(ret.totalProfit)}</td>
                      <td className="px-4 py-2 text-center text-gray-500 text-xs">
                        {new Date(ret.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          className="btn-secondary text-xs px-3 py-1"
                          onClick={() => { setSelectedHistoryItem(ret); setShowDetailModal(true); }}
                        >
                          <Eye size={14} className="inline ml-1" />عرض
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold text-sm">
                  <tr>
                    <td colSpan="3" className="px-4 py-2 text-right">الإجمالي:</td>
                    <td className="px-4 py-2 text-center text-red-600">
                      {fmt(historyData.reduce((s, r) => s + r.totalAmount, 0))}
                    </td>
                    <td className="px-4 py-2 text-center text-blue-600">
                      {fmt(historyData.reduce((s, r) => s + r.totalCost, 0))}
                    </td>
                    <td className="px-4 py-2 text-center text-orange-600">
                      {fmt(historyData.reduce((s, r) => s + r.totalProfit, 0))}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedHistoryItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">تفاصيل المرتجع</h2>
                <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowDetailModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 bg-gray-50 p-4 rounded-lg text-sm">
                <div><span className="text-gray-500">رقم المرتجع:</span> <strong>{selectedHistoryItem.returnNumber}</strong></div>
                <div><span className="text-gray-500">التاريخ:</span> <strong>{new Date(selectedHistoryItem.createdAt).toLocaleString('ar-EG')}</strong></div>
                <div><span className="text-gray-500">العميل:</span> <strong>{selectedHistoryItem.customerName}</strong></div>
                <div><span className="text-gray-500">الهاتف:</span> <strong>{selectedHistoryItem.customerPhone || '---'}</strong></div>
                <div><span className="text-gray-500">بواسطة:</span> <strong>{selectedHistoryItem.createdBy?.fullName || '---'}</strong></div>
              </div>

              <table className="w-full text-sm border rounded-lg overflow-hidden mb-4">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-right">المنتج</th>
                    <th className="px-3 py-2 text-center">الكمية</th>
                    <th className="px-3 py-2 text-center">سعر البيع</th>
                    <th className="px-3 py-2 text-center">التكلفة</th>
                    <th className="px-3 py-2 text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedHistoryItem.items?.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-2">
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-xs text-gray-400">{item.product?.sku}</p>
                      </td>
                      <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                      <td className="px-3 py-2 text-center">{fmt(item.unitSalePrice)}</td>
                      <td className="px-3 py-2 text-center text-blue-600">{fmt(item.unitCostPrice)}</td>
                      <td className="px-3 py-2 text-center font-bold text-red-600">{fmt(item.totalSalePrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td colSpan="4" className="px-3 py-2 text-right">إجمالي المرتجع:</td>
                    <td className="px-3 py-2 text-center text-red-600">{fmt(selectedHistoryItem.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">قيمة المرتجع</p>
                  <p className="font-bold text-red-600">{fmt(selectedHistoryItem.totalAmount)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">التكلفة</p>
                  <p className="font-bold text-blue-600">{fmt(selectedHistoryItem.totalCost)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">الربح المُشطَب</p>
                  <p className="font-bold text-orange-600">{fmt(selectedHistoryItem.totalProfit)}</p>
                </div>
              </div>

              {selectedHistoryItem.notes && (
                <div className="mt-3 bg-gray-50 rounded p-3 text-sm">
                  <span className="font-semibold">ملاحظات: </span>{selectedHistoryItem.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// الصفحة الرئيسية (تجمع النظامين)
// ======================================================
export default function ReturnsManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('branch'); // 'branch' | 'store'
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerDecision, setManagerDecision] = useState('');
  const [managerNotes, setManagerNotes] = useState('');

  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['returns', statusFilter],
    queryFn: () => returnsAPI.getAll({ status: statusFilter === 'all' ? undefined : statusFilter }),
    enabled: activeTab === 'branch',
  });

  const { data: statsData } = useQuery({
    queryKey: ['returns-stats'],
    queryFn: () => returnsAPI.getStats({}),
    enabled: activeTab === 'branch',
  });

  const returns = Array.isArray(returnsData?.data) ? returnsData.data : (Array.isArray(returnsData?.data?.data) ? returnsData.data.data : []);
  const stats = statsData?.data || {};

  const managerReviewMutation = useMutation({
    mutationFn: ({ id, data }) => returnsAPI.managerReview(id, data),
    onSuccess: () => {
      toast.success('تم مراجعة المرتجع بنجاح');
      queryClient.invalidateQueries(['returns']);
      queryClient.invalidateQueries(['returns-stats']);
      setShowManagerModal(false);
      setSelectedReturn(null);
      setManagerDecision('');
      setManagerNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في مراجعة المرتجع');
    }
  });

  const handleManagerReview = () => {
    if (!managerDecision) { toast.error('يجب اختيار القرار'); return; }
    managerReviewMutation.mutate({ id: selectedReturn.id, data: { decision: managerDecision, notes: managerNotes } });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING_MANAGER': 'bg-yellow-100 text-yellow-800',
      'SENT_TO_LOCAL': 'bg-blue-100 text-blue-800',
      'SENT_TO_MAIN': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-green-100 text-green-800'
    };
    const labels = {
      'PENDING_MANAGER': 'في انتظار المانجر',
      'SENT_TO_LOCAL': 'تم الإرسال للمخزن المحلي',
      'SENT_TO_MAIN': 'تم الإرسال للمخزن الرئيسي',
      'COMPLETED': 'مكتمل'
    };
    return <span className={`px-3 py-1 rounded-full text-sm font-bold ${badges[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة المرتجعات</h1>
          <p className="text-gray-500 text-sm mt-1">مرتجعات الفروع • مرتجعات المخزن الرئيسي</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('branch')}
          className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'branch' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          🏪 مرتجعات الفروع
        </button>
        <button
          onClick={() => setActiveTab('store')}
          className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'store' ? 'bg-white shadow text-red-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          🏭 مرتجعات المخزن الرئيسي
        </button>
      </div>

      {/* BRANCH RETURNS TAB */}
      {activeTab === 'branch' && (
        <div>
          <div className="flex justify-end mb-4">
            {(user?.role === 'CASHIER' || user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
              <button onClick={() => navigate('/create-return')} className="btn-primary flex items-center gap-2">
                <Plus size={20} /> مرتجع فرع جديد
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card bg-red-50 border-2 border-red-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500 rounded-full"><TrendingDown size={24} className="text-white" /></div>
                <div>
                  <p className="text-sm text-gray-600">إجمالي المرتجعات</p>
                  <p className="text-2xl font-bold">{stats.totalReturns || 0}</p>
                </div>
              </div>
            </div>
            <div className="card bg-orange-50 border-2 border-orange-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-full"><Package size={24} className="text-white" /></div>
                <div>
                  <p className="text-sm text-gray-600">إجمالي القطع</p>
                  <p className="text-2xl font-bold">{stats.totalItems || 0}</p>
                </div>
              </div>
            </div>
            <div className="card bg-purple-50 border-2 border-purple-200">
              <div>
                <p className="text-sm text-gray-600 mb-2">قيمة البيع المرتجعة</p>
                <p className="text-2xl font-bold text-purple-600">{(stats.totalSaleAmount || 0).toFixed(2)} ج.م</p>
              </div>
            </div>
            <div className="card bg-red-50 border-2 border-red-300">
              <div>
                <p className="text-sm text-gray-600 mb-2">قيمة التكلفة المرتجعة</p>
                <p className="text-2xl font-bold text-red-600">{(stats.totalCostAmount || 0).toFixed(2)} ج.م</p>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-2">
              {['all', 'PENDING_MANAGER', 'SENT_TO_LOCAL', 'SENT_TO_MAIN', 'COMPLETED'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded text-sm font-medium ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {s === 'all' ? `الكل (${stats.totalReturns || 0})` :
                   s === 'PENDING_MANAGER' ? `انتظار المانجر (${stats.byStatus?.PENDING_MANAGER || 0})` :
                   s === 'SENT_TO_LOCAL' ? `المخزن المحلي (${stats.byStatus?.SENT_TO_LOCAL || 0})` :
                   s === 'SENT_TO_MAIN' ? `المخزن الرئيسي (${stats.byStatus?.SENT_TO_MAIN || 0})` :
                   `مكتمل (${stats.byStatus?.COMPLETED || 0})`}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-right">رقم المرتجع</th>
                  <th className="px-4 py-2 text-right">رقم الفاتورة</th>
                  <th className="px-4 py-2 text-right">الفرع</th>
                  <th className="px-4 py-2 text-center">عدد القطع</th>
                  <th className="px-4 py-2 text-center">قيمة التكلفة</th>
                  <th className="px-4 py-2 text-center">السبب</th>
                  <th className="px-4 py-2 text-center">الحالة</th>
                  <th className="px-4 py-2 text-center">التاريخ</th>
                  <th className="px-4 py-2 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="9" className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></td></tr>
                ) : returns.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-8 text-gray-500">لا توجد مرتجعات</td></tr>
                ) : (
                  returns.map((returnItem) => (
                    <tr key={returnItem.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2"><span className="font-bold text-blue-600">{returnItem.returnNumber}</span></td>
                      <td className="px-4 py-2">{returnItem.sale?.invoiceNumber}</td>
                      <td className="px-4 py-2">{returnItem.branch?.name}</td>
                      <td className="px-4 py-2 text-center font-bold">{returnItem.items?.reduce((sum, item) => sum + item.quantity, 0)}</td>
                      <td className="px-4 py-2 text-center font-bold text-red-600">{returnItem.totalCostAmount.toFixed(2)} ج.م</td>
                      <td className="px-4 py-2 text-center"><span className="text-sm bg-gray-100 px-2 py-1 rounded">{returnItem.returnReason}</span></td>
                      <td className="px-4 py-2 text-center">{getStatusBadge(returnItem.status)}</td>
                      <td className="px-4 py-2 text-center text-sm">{new Date(returnItem.createdAt).toLocaleDateString('ar-EG')}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => { setSelectedReturn(returnItem); setShowDetailModal(true); }} className="btn-secondary text-sm flex items-center gap-1">
                            <Eye size={16} />عرض
                          </button>
                          {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && returnItem.status === 'PENDING_MANAGER' && (
                            <button onClick={() => { setSelectedReturn(returnItem); setShowManagerModal(true); }} className="btn-primary text-sm flex items-center gap-1">
                              <CheckCircle size={16} />مراجعة
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Detail Modal */}
          {showDetailModal && selectedReturn && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">تفاصيل المرتجع</h2>
                    <button onClick={() => { setShowDetailModal(false); setSelectedReturn(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded">
                    <div><span className="text-sm text-gray-600">رقم المرتجع:</span><p className="font-bold">{selectedReturn.returnNumber}</p></div>
                    <div><span className="text-sm text-gray-600">رقم الفاتورة:</span><p className="font-bold">{selectedReturn.sale?.invoiceNumber}</p></div>
                    <div><span className="text-sm text-gray-600">الفرع:</span><p className="font-bold">{selectedReturn.branch?.name}</p></div>
                    <div><span className="text-sm text-gray-600">العميل:</span><p className="font-bold">{selectedReturn.customerName || 'غير محدد'}</p></div>
                    <div><span className="text-sm text-gray-600">طريقة الاسترداد:</span><p className="font-bold">{selectedReturn.refundMethod}</p></div>
                    <div><span className="text-sm text-gray-600">الحالة:</span><div className="mt-1">{getStatusBadge(selectedReturn.status)}</div></div>
                  </div>
                  <div className="overflow-x-auto border rounded mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-right">المنتج</th>
                          <th className="px-4 py-2 text-center">الكمية</th>
                          <th className="px-4 py-2 text-center">سعر التكلفة</th>
                          <th className="px-4 py-2 text-center">الحالة</th>
                          <th className="px-4 py-2 text-center">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReturn.items?.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-2"><p className="font-bold">{item.product?.name}</p><p className="text-sm text-gray-500">{item.product?.sku}</p></td>
                            <td className="px-4 py-2 text-center font-bold">{item.quantity}</td>
                            <td className="px-4 py-2 text-center">{item.unitCostPrice.toFixed(2)} ج.م</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${item.condition === 'GOOD' ? 'bg-green-100 text-green-800' : item.condition === 'DAMAGED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {item.condition === 'GOOD' ? 'جيدة' : item.condition === 'DAMAGED' ? 'تالفة' : 'معيبة'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center font-bold text-red-600">{item.totalCostPrice.toFixed(2)} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {selectedReturn.managerDecision && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                      <h3 className="font-bold mb-2">قرار المانجر:</h3>
                      <p>{selectedReturn.managerDecision === 'SEND_TO_LOCAL' ? '✓ إرسال للمخزن المحلي' : '✓ إرسال للمخزن الرئيسي'}</p>
                      {selectedReturn.managerNotes && <p><strong>ملاحظات:</strong> {selectedReturn.managerNotes}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manager Modal */}
          {showManagerModal && selectedReturn && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-lg w-full p-6">
                <h2 className="text-2xl font-bold mb-4">مراجعة المرتجع</h2>
                <div className="mb-4 p-4 bg-gray-50 rounded border">
                  <p className="mb-2"><strong>رقم المرتجع:</strong> {selectedReturn.returnNumber}</p>
                  <p className="mb-2"><strong>عدد القطع:</strong> {selectedReturn.items?.reduce((sum, item) => sum + item.quantity, 0)}</p>
                  <p><strong>قيمة التكلفة:</strong> <span className="text-red-600 font-bold">{selectedReturn.totalCostAmount.toFixed(2)} ج.م</span></p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">القرار *</label>
                  <select value={managerDecision} onChange={(e) => setManagerDecision(e.target.value)} className="input-field">
                    <option value="">-- اختر القرار --</option>
                    <option value="SEND_TO_LOCAL">إرسال للمخزن المحلي</option>
                    <option value="SEND_TO_MAIN">إرسال للمخزن الرئيسي</option>
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">ملاحظات</label>
                  <textarea value={managerNotes} onChange={(e) => setManagerNotes(e.target.value)} className="input-field" rows="3" placeholder="أي ملاحظات إضافية..." />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleManagerReview} disabled={!managerDecision || managerReviewMutation.isPending} className="flex-1 btn-primary disabled:opacity-50">
                    {managerReviewMutation.isPending ? 'جاري الحفظ...' : '✓ تأكيد القرار'}
                  </button>
                  <button onClick={() => { setShowManagerModal(false); setSelectedReturn(null); setManagerDecision(''); setManagerNotes(''); }} className="flex-1 btn-secondary">إلغاء</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STORE RETURNS TAB */}
      {activeTab === 'store' && <StoreReturnSystem />}
    </div>
  );
}
