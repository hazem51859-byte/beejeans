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

  // Get current shift (only for non-admin users)
  const { data: shiftData } = useQuery({
    queryKey: ['current-shift'],
    queryFn: shiftAPI.getCurrent,
    enabled: user?.role !== 'ADMIN', // Only fetch for CASHIER/MANAGER
  });

  // Get daily report
  const { data: dailyReport } = useQuery({
    queryKey: ['daily-report', user?.branchId],
    queryFn: () => reportAPI.getDaily(user?.branchId, { date: new Date() }),
    enabled: !!user?.branchId,
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

  const stats = [
    {
      name: 'مبيعات اليوم',
      value: dailyReport?.data?.data?.totalSales?.toFixed(2) || '0.00',
      unit: 'جنيه',
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      name: 'عدد المعاملات',
      value: dailyReport?.data?.data?.transactionCount || '0',
      unit: 'معاملة',
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      name: 'الضريبة',
      value: dailyReport?.data?.data?.totalTax?.toFixed(2) || '0.00',
      unit: 'جنيه',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      name: 'الخصومات',
      value: dailyReport?.data?.data?.totalDiscount?.toFixed(2) || '0.00',
      unit: 'جنيه',
      icon: Package,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
        <p className="text-gray-600">مرحباً {user?.fullName}، إليك ملخص اليوم</p>
      </div>

      {/* Current Shift Info */}
      {shiftData?.data?.data ? (
        <div className="card bg-green-50 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800">الشيفت الحالي</h3>
              <p className="text-sm text-green-700">
                رقم الشيفت: {shiftData.data.data.shiftNumber}
              </p>
              <p className="text-sm text-green-700">
                بدأ في: {dayjs(shiftData.data.data.openedAt).format('DD/MM/YYYY - HH:mm')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-left">
                <p className="text-sm text-green-700">الرصيد الافتتاحي</p>
                <p className="text-2xl font-bold text-green-800">
                  {shiftData.data.data.openingBalance} جنيه
                </p>
              </div>
              <button
                onClick={() => setShowCloseModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-bold"
              >
                <XCircle size={20} />
                إغلاق الشيفت
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card bg-yellow-50 border-2 border-yellow-200">
          <p className="text-yellow-800 font-medium">⚠️ لا يوجد شيفت مفتوح حالياً</p>
          <p className="text-sm text-yellow-700 mt-1">افتح شيفت جديد من الإعدادات للبدء في البيع</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{stat.unit}</p>
                </div>
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
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
          <h3 className="font-bold text-lg mb-4">توزيع طرق الدفع</h3>
          <div className="space-y-3">
            {dailyReport.data.data.paymentBreakdown.map((method) => (
              <div key={method.paymentMethod} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {method.paymentMethod === 'CASH' ? 'نقدي' : 
                     method.paymentMethod === 'CARD' ? 'بطاقة' :
                     method.paymentMethod === 'CREDIT' ? 'آجل' : 'متعدد'}
                  </p>
                  <p className="text-sm text-gray-500">{method._count} معاملة</p>
                </div>
                <p className="text-lg font-bold text-primary-600">
                  {method._sum.total?.toFixed(2)} جنيه
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="font-bold text-lg mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/pos" className="p-4 border rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center">
            <ShoppingBag className="mx-auto mb-2 text-primary-600" size={32} />
            <p className="font-medium">بيع جديد</p>
          </a>
          <a href="/my-products" className="p-4 border rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center">
            <Package className="mx-auto mb-2 text-primary-600" size={32} />
            <p className="font-medium">المنتجات</p>
          </a>
          <a href="/inventory" className="p-4 border rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center">
            <Package className="mx-auto mb-2 text-primary-600" size={32} />
            <p className="font-medium">المخزون</p>
          </a>
          <a href="/invoices" className="p-4 border rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center">
            <TrendingUp className="mx-auto mb-2 text-primary-600" size={32} />
            <p className="font-medium">الفواتير</p>
          </a>
        </div>
      </div>

      {/* Close Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">إغلاق الشيفت</h2>
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">رقم الشيفت</p>
                <p className="text-lg font-bold text-gray-800">{shiftData?.data?.data?.shiftNumber}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الرصيد النقدي الفعلي *</label>
                <input
                  type="number"
                  value={closingData.actualCash}
                  onChange={(e) => setClosingData({ ...closingData, actualCash: e.target.value })}
                  className="input-field"
                  step="0.01"
                  required
                  placeholder="أدخل المبلغ النقدي الموجود"
                />
                <p className="text-xs text-gray-500 mt-1">
                  الرصيد الافتتاحي: {shiftData?.data?.data?.openingBalance} ج.م
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={closingData.notes}
                  onChange={(e) => setClosingData({ ...closingData, notes: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="أي ملاحظات على الشيفت..."
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={closeShiftMutation.isLoading}
                >
                  {closeShiftMutation.isLoading ? 'جاري الإغلاق...' : 'إغلاق الشيفت'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50"
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
