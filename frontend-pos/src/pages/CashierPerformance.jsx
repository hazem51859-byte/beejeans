import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, DollarSign, Award, Clock, Activity, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

export default function CashierPerformance() {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedBranch, setSelectedBranch] = useState('');

  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data;
    }
  });

  const branches = branchesResponse?.data || [];

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['cashiers-performance', dateRange, selectedBranch],
    queryFn: async () => {
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (selectedBranch) params.branchId = selectedBranch;
      
      const response = await api.get('/cashiers/performance', { params });
      return response.data;
    }
  });

  const cashiers = performanceData?.data || [];
  const summary = performanceData?.summary || {};

  const getRankBadge = (index) => {
    if (index === 0) return { icon: '🥇', color: 'bg-yellow-100 text-yellow-800', text: 'المركز الأول' };
    if (index === 1) return { icon: '🥈', color: 'bg-gray-100 text-gray-800', text: 'المركز الثاني' };
    if (index === 2) return { icon: '🥉', color: 'bg-orange-100 text-orange-800', text: 'المركز الثالث' };
    return { icon: `#${index + 1}`, color: 'bg-blue-50 text-blue-700', text: `المركز ${index + 1}` };
  };

  const getPerformanceRating = (revenue) => {
    if (revenue >= 50000) return { label: 'ممتاز', color: 'text-green-600', icon: '⭐⭐⭐⭐⭐' };
    if (revenue >= 30000) return { label: 'جيد جداً', color: 'text-blue-600', icon: '⭐⭐⭐⭐' };
    if (revenue >= 15000) return { label: 'جيد', color: 'text-yellow-600', icon: '⭐⭐⭐' };
    if (revenue >= 5000) return { label: 'مقبول', color: 'text-orange-600', icon: '⭐⭐' };
    return { label: 'ضعيف', color: 'text-red-600', icon: '⭐' };
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📊 تقييم أداء الكاشيرات</h1>
        <p className="text-gray-600 mt-1">متابعة وتقييم أداء جميع الكاشيرات في كل الفروع</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">من تاريخ</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">الفرع</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="input-field"
            >
              <option value="">كل الفروع</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">إجمالي الكاشيرات</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{summary.totalCashiers || 0}</p>
            </div>
            <Users size={40} className="text-blue-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">يعملون حالياً</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{summary.currentlyWorking || 0}</p>
            </div>
            <Activity size={40} className="text-green-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">إجمالي المبيعات</p>
              <p className="text-3xl font-bold text-purple-700 mt-1">{summary.totalSales || 0}</p>
            </div>
            <TrendingUp size={40} className="text-purple-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 font-medium">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {(summary.totalRevenue || 0).toLocaleString('ar-EG')} ج.م
              </p>
            </div>
            <DollarSign size={40} className="text-amber-400" />
          </div>
        </div>
      </div>

      {/* Cashiers List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="card text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">جاري تحميل البيانات...</p>
          </div>
        ) : cashiers.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد بيانات كاشيرات في الفترة المحددة</p>
          </div>
        ) : (
          cashiers.map((cashier, index) => {
            const rank = getRankBadge(index);
            const rating = getPerformanceRating(cashier.performance.totalRevenue);
            
            return (
              <div 
                key={cashier.id} 
                className={`card border-2 ${index < 3 ? 'border-primary-200 shadow-lg' : 'border-gray-100'}`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Cashier Info */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Rank Badge */}
                    <div className={`${rank.color} w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0`}>
                      {rank.icon}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-800">{cashier.fullName}</h3>
                        {cashier.isCurrentlyWorking && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                            <CheckCircle size={12} />
                            يعمل الآن
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>@{cashier.username}</span>
                        <span>•</span>
                        <span>{cashier.branch?.name}</span>
                        {cashier.phone && (
                          <>
                            <span>•</span>
                            <span>{cashier.phone}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Performance Rating */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">التقييم:</span>
                        <span className={`text-sm font-bold ${rating.color}`}>
                          {rating.icon} {rating.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-600 mb-1">المبيعات</p>
                      <p className="text-xl font-bold text-blue-700">
                        {cashier.performance.totalSales}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-600 mb-1">الإيرادات</p>
                      <p className="text-lg font-bold text-green-700">
                        {(cashier.performance.totalRevenue).toLocaleString('ar-EG', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-600 mb-1">متوسط الفاتورة</p>
                      <p className="text-lg font-bold text-purple-700">
                        {(cashier.performance.averageOrderValue).toLocaleString('ar-EG', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-600 mb-1">الوردیات</p>
                      <p className="text-xl font-bold text-orange-700">
                        {cashier.performance.shiftsCount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Shift Info */}
                {cashier.isCurrentlyWorking && cashier.currentShift && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={14} />
                      <span className="font-medium">الوردية الحالية:</span>
                      <span>
                        بدأت في {new Date(cashier.currentShift.openedAt).toLocaleString('ar-EG')}
                      </span>
                      <span>•</span>
                      <span>
                        رصيد افتتاحي: {cashier.currentShift.openingBalance} ج.م
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
