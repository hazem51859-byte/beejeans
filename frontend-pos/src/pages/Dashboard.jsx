import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, ShoppingBag, Package, TrendingUp, XCircle } from 'lucide-react';
import { reportAPI, shiftAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import { toast } from 'react-hot-toast';
import { useState } from 'react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingData, setClosingData] = useState({
    actualCash: '',
    notes: ''
  });

  const isAdmin = user?.role === 'ADMIN';

  // Get current shift (only for non-admin users)
  const { data: shiftData } = useQuery({
    queryKey: ['current-shift'],
    queryFn: shiftAPI.getCurrent,
    enabled: !isAdmin, // Only fetch for CASHIER/MANAGER
  });

  // Get daily report
  // Admin sees all branches, others see their branch only
  const { data: dailyReport } = useQuery({
    queryKey: ['daily-report', isAdmin ? 'all' : user?.branchId],
    queryFn: () => {
      const date = new Date().toISOString();
      if (isAdmin) {
        // Admin: get summary for all branches
        return reportAPI.getDaily(null, { date });
      } else {
        // Cashier/Manager: get their branch only
        return reportAPI.getDaily(user?.branchId, { date });
      }
    },
    enabled: !!user,
  });
  
  const closeShiftMutation = useMutation({
    mutationFn: (data) => shiftAPI.close(shiftData?.data?.data?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['current-shift']);
      queryClient.invalidateQueries(['daily-report']);
      setShowCloseModal(false);
      setClosingData({ actualCash: '', notes: '' });
      toast.success('تم إغلاق الشيفت بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء إغلاق الشيفت');
    }
  });
  
  const handleCloseShift = (e) => {
    e.preventDefault();
    closeShiftMutation.mutate({
      actualCash: parseFloat(closingData.actualCash),
      notes: closingData.notes
    });
  };

  // Normalize the daily report data
  const reportData = dailyReport?.data?.data || dailyReport?.data || {};
  
  const stats = [
    {
      name: isAdmin ? 'إجمالي المبيعات' : 'مبيعات اليوم',
      value: (reportData.totalSales || 0).toFixed(2),
      unit: 'جنيه',
      icon: DollarSign,
      color: 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/25',
    },
    {
      name: 'عدد المعاملات',
      value: reportData.transactionCount || 0,
      unit: 'معاملة',
      icon: ShoppingBag,
      color: 'bg-gradient-to-tr from-teal-600 to-cyan-500 shadow-lg shadow-teal-500/25',
    },
    {
      name: 'الضريبة',
      value: (reportData.totalTax || 0).toFixed(2),
      unit: 'جنيه',
      icon: TrendingUp,
      color: 'bg-gradient-to-tr from-sky-600 to-teal-500 shadow-lg shadow-sky-500/25',
    },
    {
      name: 'الخصومات',
      value: (reportData.totalDiscount || 0).toFixed(2),
      unit: 'جنيه',
      icon: Package,
      color: 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">لوحة التحكم الإدارية</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            مرحباً بك مجدداً <span className="font-bold text-emerald-600">{user?.fullName}</span>، إليك ملخص {isAdmin ? 'كل الفروع' : 'اليوم'}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200/60 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>تحديث مباشر</span>
        </div>
      </div>

      {/* Current Shift Info - Only for Cashier/Manager */}
      {!isAdmin && (
        <>
          {shiftData?.data?.data ? (
            <div className="card bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white border border-emerald-200/80">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-800 mb-2 inline-block">
                    الشيفت الحالي نشط
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">رقم الشيفت: {shiftData.data.data.shiftNumber}</h3>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    بدأ في: {dayjs(shiftData.data.data.openedAt).format('DD/MM/YYYY - HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-semibold">الرصيد الافتتاحي</p>
                    <p className="text-2xl font-black text-emerald-700 tracking-tight">
                      {shiftData.data.data.openingBalance} <span className="text-sm font-bold">ج.م</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="btn-danger py-2.5 px-4 text-sm shadow-md"
                  >
                    <XCircle size={18} />
                    إغلاق الشيفت
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-amber-50/80 border border-amber-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg">⚠️</div>
                <div>
                  <p className="text-amber-900 font-bold text-sm">لا يوجد شيفت مفتوح حالياً</p>
                  <p className="text-xs text-amber-700 mt-0.5">افتح شيفت جديد من قسم الإعدادات أو الشيفتات للبدء في إجراء عمليات البيع</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card group hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.name}</p>
                  <p className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
                    {stat.value}
                  </p>
                  <span className="inline-block mt-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{stat.unit}</span>
                </div>
                <div className={`${stat.color} w-13 h-13 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Methods Breakdown */}
      {dailyReport?.data?.data?.paymentBreakdown && (
        <div className="card">
          <h3 className="font-extrabold text-slate-900 text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            توزيع طرق الدفع
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {dailyReport.data.data.paymentBreakdown.map((method) => (
              <div key={method.paymentMethod} className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 hover:border-emerald-200 transition-colors">
                <div>
                  <p className="font-bold text-sm text-slate-800">
                    {method.paymentMethod === 'CASH' ? '💵 نقدي' : 
                     method.paymentMethod === 'CARD' ? '💳 بطاقة' :
                     method.paymentMethod === 'CREDIT' ? '📝 آجل' : '🔄 متعدد'}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{method._count} معاملة</p>
                </div>
                <p className="text-base font-black text-emerald-700">
                  {method._sum.total?.toFixed(2)} <span className="text-xs font-bold">ج.م</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="font-extrabold text-slate-900 text-lg mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          إجراءات سريعة
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {!isAdmin && (
            <a href="/pos" className="group p-5 border border-slate-200/80 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all bg-white text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingBag size={24} />
              </div>
              <p className="font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">بيع جديد</p>
            </a>
          )}
          <a href="/my-products" className="group p-5 border border-slate-200/80 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all bg-white text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Package size={24} />
            </div>
            <p className="font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">المنتجات</p>
          </a>
          <a href="/inventory" className="group p-5 border border-slate-200/80 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all bg-white text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Package size={24} />
            </div>
            <p className="font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">المخزون</p>
          </a>
          <a href="/invoices" className="group p-5 border border-slate-200/80 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all bg-white text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <p className="font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">الفواتير</p>
          </a>
        </div>
      </div>

      {/* Close Shift Modal - Only for Cashier/Manager */}
      {!isAdmin && showCloseModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100">
              <h2 className="text-lg font-black text-slate-900">إغلاق الشيفت الحالي</h2>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-100 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 font-bold">رقم الشيفت</p>
                  <p className="text-base font-black text-emerald-950 mt-0.5">{shiftData?.data?.data?.shiftNumber}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 font-semibold">الافتتاحي</p>
                  <p className="text-sm font-bold text-slate-800">{shiftData?.data?.data?.openingBalance} ج.م</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">الرصيد النقدي الفعلي بالخزينة *</label>
                <input
                  type="number"
                  value={closingData.actualCash}
                  onChange={(e) => setClosingData({ ...closingData, actualCash: e.target.value })}
                  className="input-field"
                  step="0.01"
                  required
                  placeholder="أدخل المبلغ النقدي الموجود"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">ملاحظات الإغلاق</label>
                <textarea
                  value={closingData.notes}
                  onChange={(e) => setClosingData({ ...closingData, notes: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="أي ملاحظات على الشيفت..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  className="btn-danger flex-1 py-2.5 text-sm"
                  disabled={closeShiftMutation.isLoading}
                >
                  {closeShiftMutation.isLoading ? 'جاري الإغلاق...' : 'إغلاق الشيفت'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="btn-secondary text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
