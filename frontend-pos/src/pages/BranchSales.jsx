import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, TrendingUp, Package, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import api from '../services/api';

export default function BranchSales() {
  // Default to last 30 days
  const getDefaultDates = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const [dateFilter, setDateFilter] = useState(getDefaultDates());
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Fetch branch sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['branch-sales', dateFilter, selectedBranch],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        ...(selectedBranch !== 'all' && { branchId: selectedBranch })
      });
      const response = await api.get(`/reports/branch-sales?${params}`);
      console.log('Branch Sales API Response:', response.data.data); // للتأكد من البيانات
      return response.data.data;
    }
  });

  const data = salesData || { branches: [], topProducts: [], totals: {}, today: {} };
  
  // Get selected branch data
  const selectedBranchData = selectedBranch !== 'all' && data.branches.length > 0
    ? data.branches.find(b => b.branch?.id === selectedBranch) || data.branches[0]
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Store className="text-blue-600" size={32} />
          مبيعات الفروع
        </h1>
        <p className="text-gray-600 mt-1">تحليل شامل لمبيعات جميع الفروع</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline ml-1" />
              من تاريخ
            </label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline ml-1" />
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Store size={16} className="inline ml-1" />
              الفرع
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="input-field"
            >
              <option value="all">جميع الفروع</option>
              {data.branches?.map((branch) => (
                <option key={branch.branch?.id} value={branch.branch?.id}>
                  {branch.branch?.name || 'N/A'}
                </option>
              )) || []}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">إجمالي المبيعات</h3>
            <DollarSign size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">
            {(data.totals.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
          </p>
          <p className="text-xs opacity-75 mt-2">
            {(data.totals.totalSalesCount || 0).toLocaleString('en-US')} فاتورة
          </p>
        </div>

        <div className="card bg-gradient-to-br from-green-600 to-green-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">إجمالي الربح</h3>
            <TrendingUp size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">
            {(data.totals.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
          </p>
          <p className="text-xs opacity-75 mt-2">
            {data.totals.totalProfit > 0 ? 
              `${((data.totals.totalProfit / data.totals.totalSales) * 100).toFixed(1)}% هامش` 
              : '0%'}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">القطع المباعة</h3>
            <Package size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">
            {(data.totals.totalQuantity || 0).toLocaleString('en-US')}
          </p>
          <p className="text-xs opacity-75 mt-2">
            {(data.totals.branchesCount || 0).toLocaleString('en-US')} فرع نشط
          </p>
        </div>

        <div className="card bg-gradient-to-br from-orange-600 to-orange-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">مبيعات اليوم</h3>
            <Calendar size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">
            {(data.today.sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
          </p>
          <p className="text-xs opacity-75 mt-2">
            {(data.today.count || 0).toLocaleString('en-US')} فاتورة
          </p>
        </div>
      </div>

      {/* Branch Sales Table */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Store size={20} className="text-blue-600" />
          مبيعات الفروع
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-right py-3 px-4 font-semibold">الفرع</th>
                <th className="text-right py-3 px-4 font-semibold">قيمة التكلفة</th>
                <th className="text-right py-3 px-4 font-semibold">المبيعات</th>
                <th className="text-right py-3 px-4 font-semibold">الربح</th>
                <th className="text-right py-3 px-4 font-semibold">عدد الفواتير</th>
                <th className="text-right py-3 px-4 font-semibold">هامش الربح</th>
              </tr>
            </thead>
            <tbody>
              {data.branches.map((branchData) => {
                const profitMargin = branchData.totalSales > 0 
                  ? ((branchData.totalProfit / branchData.totalSales) * 100).toFixed(1)
                  : 0;

                return (
                  <tr key={branchData.branch.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{branchData.branch?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{branchData.branch?.code || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-orange-600">
                        {(branchData.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-blue-600">
                        {(branchData.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-green-600">
                        {(branchData.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(branchData.salesCount || 0).toLocaleString('en-US')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${
                        profitMargin >= 30 ? 'text-green-600' :
                        profitMargin >= 20 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {profitMargin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products by Branch */}
      {selectedBranchData && selectedBranchData.products && selectedBranchData.products.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package size={20} className="text-purple-600" />
            المنتجات المباعة - {selectedBranchData?.branch?.name || 'N/A'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right py-3 px-4 font-semibold">المنتج</th>
                  <th className="text-right py-3 px-4 font-semibold">الكود</th>
                  <th className="text-center py-3 px-4 font-semibold">الكمية المباعة</th>
                  <th className="text-right py-3 px-4 font-semibold">قيمة التكلفة</th>
                  <th className="text-right py-3 px-4 font-semibold">قيمة المبيعات</th>
                  <th className="text-right py-3 px-4 font-semibold">الربح</th>
                </tr>
              </thead>
              <tbody>
                {selectedBranchData.products.map((productData, idx) => {
                  const cost = productData.totalCost || ((productData.quantity || 0) * (productData.product?.costPrice || 0));
                  const sales = productData.totalSales || 0;
                  const profit = sales - cost;
                  
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{productData.product?.name || 'N/A'}</td>
                      <td className="py-3 px-4 font-mono text-sm text-gray-600">
                        {productData.product?.sku || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-purple-600">
                        {(productData.quantity || 0).toLocaleString('en-US')} قطعة
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-orange-600">
                          {cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-blue-600">
                          {sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-green-600">
                          {profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr className="font-bold">
                  <td colSpan="2" className="py-3 px-4 text-right">الإجمالي</td>
                  <td className="py-3 px-4 text-center text-purple-700">
                    {(selectedBranchData.totalQuantity || 0).toLocaleString('en-US')} قطعة
                  </td>
                  <td className="py-3 px-4 text-orange-700">
                    {(() => {
                      const totalCost = selectedBranchData.products.reduce((sum, p) => {
                        return sum + (p.totalCost || ((p.quantity || 0) * (p.product?.costPrice || 0)));
                      }, 0);
                      return totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()} ج.م
                  </td>
                  <td className="py-3 px-4 text-blue-700">
                    {(selectedBranchData.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                  </td>
                  <td className="py-3 px-4 text-green-700">
                    {(selectedBranchData.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
