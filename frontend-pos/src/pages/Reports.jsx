import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download } from 'lucide-react';
import { reportAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

export default function Reports() {
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(7, 'days').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
  });

  const { data: salesSummary } = useQuery({
    queryKey: ['sales-summary', dateRange, user?.role],
    queryFn: () => reportAPI.getSalesSummary({
      branchId: user?.role === 'ADMIN' ? undefined : user?.branchId,
      ...dateRange,
    }),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', user?.branchId, dateRange],
    queryFn: () => reportAPI.getTopProducts(
      user?.role === 'ADMIN' ? 'all' : user?.branchId, 
      {
        limit: 10,
        ...dateRange,
      }
    ),
    enabled: !!user?.branchId || user?.role === 'ADMIN',
  });

  const summary = salesSummary?.data?.data;
  const products = topProducts?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقارير</h1>
          <p className="text-gray-600">تقارير وإحصائيات المبيعات</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download size={20} />
          تصدير التقرير
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="card">
        <div className="flex items-center gap-4">
          <Calendar className="text-gray-400" size={20} />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="input-field"
          />
          <span>إلى</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="input-field"
          />
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <p className="text-sm text-gray-600">إجمالي المبيعات</p>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              {summary.totalSales?.toFixed(2)} جنيه
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">عدد المعاملات</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {summary.transactionCount}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">متوسط قيمة البيع</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {summary.averageSale?.toFixed(2)} جنيه
            </p>
          </div>
        </div>
      )}

      {/* Top Products */}
      <div className="card">
        <h3 className="font-bold text-lg mb-4">أكثر المنتجات مبيعاً</h3>
        {products.length === 0 ? (
          <p className="text-center py-8 text-gray-500">لا توجد بيانات</p>
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.color && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        🎨 {product.color}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-primary-600">
                    {product.totalRevenue?.toFixed(2)} جنيه
                  </p>
                  <p className="text-sm text-gray-500">
                    {product.totalQuantity} قطعة مباعة
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
