import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  Calendar, 
  Eye, 
  Printer, 
  DollarSign, 
  Package, 
  TrendingDown, 
  Building2, 
  X,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export default function OfficeReturns() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({
    totalReturnsCount: 0,
    totalRefundAmount: 0,
    totalDeductedFromVault: 0,
    totalDeductedFromDebt: 0,
    totalItemsReturned: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, [startDate, endDate]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (searchQuery) params.append('query', searchQuery);

      const response = await api.get(`/office-returns?${params.toString()}`);
      const data = response.data?.data || [];
      const statistics = response.data?.stats || {
        totalReturnsCount: 0,
        totalRefundAmount: 0,
        totalDeductedFromVault: 0,
        totalDeductedFromDebt: 0,
        totalItemsReturned: 0
      };

      setReturns(data);
      setStats(statistics);
    } catch (error) {
      console.error('Error fetching office returns:', error);
      toast.error('فشل في جلب سجل المرتجعات');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReturns();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const openDetails = (ret) => {
    setSelectedReturn(ret);
    setShowDetailModal(true);
  };

  const getMethodBadge = (ret) => {
    if (ret.deductedFromPaid > 0 && ret.deductedFromDebt > 0) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
          ⚖️ تسوية مختلطة (كاش + دين)
        </span>
      );
    } else if (ret.deductedFromPaid > 0) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
          💵 استرداد نقدي من الخزينة
        </span>
      );
    } else if (ret.deductedFromDebt > 0) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
          📉 خصم من مديونية الفاتورة
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">
          {ret.refundMethod || 'تسوية'}
        </span>
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <RotateCcw size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">مرتجعات فواتير المكتب</h1>
              <p className="text-gray-500 text-sm mt-1">
                إدارة مرتجعات المخزن الرئيسي، وإعادة البضاعة للمخزن وتوثيق حركة الخزائن
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/office-returns/create')}
          className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow transition-all shadow-red-100"
        >
          <Plus size={20} />
          تسجيل مرتجع جديد
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Returns */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-2">
            <span>عدد المرتجعات</span>
            <span className="p-2 bg-gray-100 rounded-lg text-gray-600">
              <FileText size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{stats.totalReturnsCount}</div>
          <div className="text-xs text-gray-400 mt-1">عملية إرجاع مسجلة</div>
        </div>

        {/* Total Items Restocked */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-2">
            <span>القطع المسترجعة</span>
            <span className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Package size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.totalItemsReturned}</div>
          <div className="text-xs text-amber-700 mt-1">أعيدت للمخزن الرئيسي</div>
        </div>

        {/* Total Refund Value */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-2">
            <span>إجمالي المرتجعات</span>
            <span className="p-2 bg-red-50 rounded-lg text-red-600">
              <RotateCcw size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {stats.totalRefundAmount.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">إجمالي قيمة البضاعة</div>
        </div>

        {/* Deducted from Vault */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-2">
            <span>مسترد من الخزائن</span>
            <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {stats.totalDeductedFromVault.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-xs text-emerald-600 mt-1">تم خصمه نقداً للعملاء</div>
        </div>

        {/* Deducted from Debt */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-2">
            <span>مخصوم من الديون</span>
            <span className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <TrendingDown size={18} />
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {stats.totalDeductedFromDebt.toFixed(2)} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-xs text-blue-600 mt-1">تقليل مديونية العملاء</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم المرتجع، رقم الفاتورة الأصلية، أو اسم/هاتف العميل..."
              className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-gray-500 text-xs">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-0 text-sm p-0 focus:ring-0 text-gray-700"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-gray-500 text-xs">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-0 text-sm p-0 focus:ring-0 text-gray-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gray-800 hover:bg-black text-white text-sm font-semibold rounded-lg transition"
            >
              بحث
            </button>
            {(searchQuery || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition"
                title="إعادة ضبط الفلاتر"
              >
                إلغاء الفلتر
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
            <p className="mt-3 text-gray-500 text-sm">جاري تحميل سجل المرتجعات...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <RotateCcw size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">لا توجد مرتجعات مسجلة</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
              لم يتم العثور على أي مرتجعات مطابقة لمعايير البحث الحالية. يمكنك تسجيل مرتجع جديد الآن.
            </p>
            <button
              onClick={() => navigate('/office-returns/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700"
            >
              <Plus size={16} />
              تسجيل أول مرتجع
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-600">
                  <th className="p-4">رقم المرتجع</th>
                  <th className="p-4">الفاتورة الأصلية</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">القطع</th>
                  <th className="p-4">إجمالي المرتجع</th>
                  <th className="p-4">طريقة التسوية</th>
                  <th className="p-4">الخزينة المنصرف منها</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {returns.map((ret) => {
                  const totalPieces = (ret.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
                  return (
                    <tr key={ret.id} className="hover:bg-red-50/20 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-md text-xs">
                          {ret.returnNumber}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-gray-800">
                        {ret.invoice ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-blue-600 font-semibold">{ret.invoice.invoiceNumber}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">---</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{ret.customerName}</div>
                        {ret.customerPhone && (
                          <div className="text-xs text-gray-500 font-mono">{ret.customerPhone}</div>
                        )}
                      </td>
                      <td className="p-4 text-gray-600 text-xs">
                        <div className="flex items-center gap-1">
                          <Clock size={13} className="text-gray-400" />
                          <span>{new Date(ret.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div className="text-gray-400 mt-0.5 text-[11px]">
                          {new Date(ret.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-700">
                        {totalPieces} <span className="text-xs text-gray-400 font-normal">قطعة</span>
                      </td>
                      <td className="p-4 font-bold text-red-600">
                        {ret.totalAmount.toFixed(2)} <span className="text-xs text-gray-500 font-normal">ج.م</span>
                      </td>
                      <td className="p-4">
                        {getMethodBadge(ret)}
                      </td>
                      <td className="p-4 text-xs">
                        {ret.vault ? (
                          <div className="flex items-center gap-1 font-semibold text-gray-800">
                            <span>{ret.vault.type === 'CASH' ? '💵' : ret.vault.type === 'VISA' ? '💳' : '📱'}</span>
                            <span>{ret.vault.name}</span>
                            <span className="text-emerald-700 font-bold">({ret.deductedFromPaid.toFixed(2)} ج)</span>
                          </div>
                        ) : ret.deductedFromDebt > 0 ? (
                          <span className="text-blue-700 font-medium">خصم من الدين ({ret.deductedFromDebt.toFixed(2)} ج)</span>
                        ) : (
                          <span className="text-gray-400">---</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openDetails(ret)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="عرض تفاصيل المرتجع"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => window.print()}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            title="طباعة"
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <RotateCcw size={20} />
                  تفاصيل المرتجع: {selectedReturn.returnNumber}
                </h2>
                <p className="text-red-100 text-xs mt-1">
                  تاريخ المعاملة: {new Date(selectedReturn.createdAt).toLocaleString('ar-EG')}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Customer & Invoice Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 block mb-1">العميل</span>
                  <p className="font-bold text-gray-900">{selectedReturn.customerName}</p>
                  {selectedReturn.customerPhone && (
                    <p className="text-xs text-gray-600 font-mono mt-0.5">{selectedReturn.customerPhone}</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 block mb-1">الفاتورة الأصلية</span>
                  <p className="font-mono font-bold text-blue-700">{selectedReturn.invoice?.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    إجمالي الفاتورة: {selectedReturn.invoice?.total?.toFixed(2)} ج.م
                  </p>
                </div>

                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <span className="text-xs text-red-600 block mb-1">إجمالي قيمة المرتجع</span>
                  <p className="text-xl font-bold text-red-700">
                    {selectedReturn.totalAmount.toFixed(2)} ج.م
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    أعيدت البضاعة للمخزن الرئيسي
                  </p>
                </div>
              </div>

              {/* Returned Items Table */}
              <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Package size={18} className="text-red-600" />
                  الأصناف المرتجعة
                </h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="p-3">الصنف</th>
                        <th className="p-3">المقاس</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3">سعر البيع</th>
                        <th className="p-3">الإجمالي</th>
                        <th className="p-3">سبب الإرجاع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedReturn.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-bold text-gray-900">{item.product?.name}</div>
                            <div className="text-xs font-mono text-gray-400">{item.product?.sku}</div>
                          </td>
                          <td className="p-3 font-semibold text-gray-700">{item.size || '---'}</td>
                          <td className="p-3 text-center font-bold text-red-600 bg-red-50/50">
                            {item.quantity}
                          </td>
                          <td className="p-3 text-gray-800">{item.unitSalePrice.toFixed(2)} ج</td>
                          <td className="p-3 font-bold text-gray-900">{item.totalSalePrice.toFixed(2)} ج</td>
                          <td className="p-3 text-xs text-gray-600">
                            {item.returnReason || selectedReturn.returnReason || 'غير محدد'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Settlement Details */}
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2">
                <h3 className="font-bold text-amber-900 flex items-center gap-2 text-sm">
                  <DollarSign size={16} />
                  تفاصيل التسوية المالية
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-1">
                  <div className="bg-white p-3 rounded-lg border border-amber-100">
                    <span className="text-xs text-gray-500 block">المبلغ المسترد نقداً من الخزينة:</span>
                    <span className="font-bold text-emerald-700 text-lg">
                      {selectedReturn.deductedFromPaid.toFixed(2)} ج.م
                    </span>
                    {selectedReturn.vault && (
                      <div className="text-xs text-gray-600 mt-1">
                        الخزينة: {selectedReturn.vault.name} ({selectedReturn.vault.type})
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-amber-100">
                    <span className="text-xs text-gray-500 block">المبلغ المخصوم من مديونية الفاتورة:</span>
                    <span className="font-bold text-blue-700 text-lg">
                      {selectedReturn.deductedFromDebt.toFixed(2)} ج.م
                    </span>
                    <div className="text-xs text-gray-600 mt-1">
                      تم تقليل المتبقي على العميل
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedReturn.notes && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                  <span className="font-bold text-gray-800 block text-xs mb-1">ملاحظات:</span>
                  {selectedReturn.notes}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-800 hover:bg-black text-white text-sm font-semibold rounded-lg flex items-center gap-2"
              >
                <Printer size={16} />
                طباعة إشعار المرتجع
              </button>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
