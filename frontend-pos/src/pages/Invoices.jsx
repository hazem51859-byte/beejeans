import { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { FileText, Search, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Invoices() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  
  const [selectedBranch, setSelectedBranch] = useState(isAdmin ? '' : user?.branchId);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState(null);

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data;
    },
    enabled: isAdmin,
  });

  // Filter out MAIN warehouse from branch list
  const branchList = Array.isArray(branches) 
    ? branches.filter(b => b.code !== 'MAIN') 
    : (branches?.data?.filter(b => b.code !== 'MAIN') || []);

  const { data: sales } = useQuery({
    queryKey: ['sales', selectedBranch, startDate, endDate],
    queryFn: async () => {
      const params = { startDate, endDate };
      if (selectedBranch) params.branchId = selectedBranch;
      const response = await api.get('/sales', { params });
      return response.data;
    },
  });

  // normalize sales - exclude MAIN warehouse
  const salesList = (Array.isArray(sales) ? sales : (sales?.data || []))
    .filter(sale => sale.branch?.code !== 'MAIN');

  // Calculate totals
  const totalSales = salesList.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
  const salesCount = salesList.length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الفواتير</h1>
          <p className="text-gray-600 mt-1">سجل كامل للفواتير والمبيعات</p>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium mb-2">الفرع</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="input-field"
              >
                <option value="">كل الفروع</option>
                {branchList.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-green-700">{totalSales.toFixed(2)} ج.م</p>
            </div>
            <DollarSign className="text-green-600" size={32} />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">عدد الفواتير</p>
              <p className="text-2xl font-bold text-gray-700">{salesCount}</p>
            </div>
            <FileText className="text-gray-600" size={32} />
          </div>
        </div>
      </div>

      {/* قائمة الفواتير */}
      <div className="card">
        <h3 className="font-bold mb-4">سجل الفواتير</h3>
        {salesList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-3 text-sm">رقم الفاتورة</th>
                  <th className="text-right p-3 text-sm">التاريخ</th>
                  <th className="text-right p-3 text-sm">الكاشير</th>
                  {isAdmin && <th className="text-right p-3 text-sm">الفرع</th>}
                  <th className="text-right p-3 text-sm">الإجمالي</th>
                  <th className="text-right p-3 text-sm">طريقة الدفع</th>
                </tr>
              </thead>
              <tbody>
                {salesList.map((sale) => {
                  return (
                  <tr 
                    key={sale.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedSaleForDetails(sale);
                      setShowDetailsModal(true);
                    }}
                  >
                    <td className="p-3 text-sm font-mono font-medium text-primary-600">{sale.invoiceNumber}</td>
                    <td className="p-3 text-sm">{new Date(sale.createdAt).toLocaleString('ar-EG')}</td>
                    <td className="p-3 text-sm">{sale.cashier?.fullName}</td>
                    {isAdmin && <td className="p-3 text-sm">{sale.branch?.name}</td>}
                    <td className="p-3 text-sm font-bold text-green-700">{sale.total.toFixed(2)} ج.م</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sale.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {sale.paymentMethod === 'CASH' ? 'كاش' : 'فيزا'}
                      </span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">لا توجد فواتير</p>
        )}
      </div>

      {/* Modal تفاصيل الفاتورة */}
      {showDetailsModal && selectedSaleForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">تفاصيل الفاتورة - {selectedSaleForDetails.invoiceNumber}</h2>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSaleForDetails(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><strong>التاريخ:</strong> {new Date(selectedSaleForDetails.createdAt).toLocaleString('ar-EG')}</div>
              <div><strong>الكاشير:</strong> {selectedSaleForDetails.cashier?.fullName}</div>
              <div><strong>الفرع:</strong> {selectedSaleForDetails.branch?.name}</div>
              <div><strong>طريقة الدفع:</strong> {selectedSaleForDetails.paymentMethod === 'CASH' ? 'كاش 💵' : 'فيزا 💳'}</div>
              {selectedSaleForDetails.customerName && (
                <div><strong>العميل:</strong> {selectedSaleForDetails.customerName}</div>
              )}
            </div>

            <h3 className="font-bold mb-3">المنتجات</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-right p-3 text-sm">المنتج</th>
                    <th className="text-center p-3 text-sm">المقاس</th>
                    <th className="text-center p-3 text-sm">اللون</th>
                    <th className="text-center p-3 text-sm">السيريال</th>
                    <th className="text-center p-3 text-sm">الكمية</th>
                    <th className="text-center p-3 text-sm">السعر</th>
                    <th className="text-center p-3 text-sm">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSaleForDetails.items?.map((item, index) => {
                    return (
                    <tr key={index} className="border-b">
                      <td className="p-3 text-sm">
                        {item.product?.name}
                      </td>
                      <td className="p-3 text-sm text-center">
                        {item.size ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            📏 {item.size}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-center">
                        {item.product?.color ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {item.product.color}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-center font-mono text-xs">{item.serialNumber || '-'}</td>
                      <td className="p-3 text-sm text-center">{item.quantity}</td>
                      <td className="p-3 text-sm text-center">{item.unitPrice.toFixed(2)}</td>
                      <td className="p-3 text-sm text-center font-bold">{item.total.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan="6" className="p-3 text-sm text-right font-bold">الإجمالي:</td>
                    <td className="p-3 text-sm text-center font-bold text-green-700">{selectedSaleForDetails.total.toFixed(2)} ج.م</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedSaleForDetails(null);
              }}
              className="w-full btn-secondary"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
