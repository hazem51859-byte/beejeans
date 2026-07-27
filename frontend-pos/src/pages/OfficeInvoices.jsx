import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Printer, DollarSign, Package, User, TrendingUp } from 'lucide-react';
import api from '../services/api';

export default function OfficeInvoices() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchDashboard();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.type) params.append('type', filter.type);
      if (filter.status) params.append('status', filter.status);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);

      const response = await api.get(`/office-invoices?${params}`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);

      const response = await api.get(`/office-invoices/dashboard?${params}`);
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      REGULAR: { label: 'زبون عادي', icon: '🛒', color: 'bg-blue-100 text-blue-800' },
      SHIPMENT: { label: 'شحن', icon: '📦', color: 'bg-yellow-100 text-yellow-800' },
      CLIENT: { label: 'عميل', icon: '👤', color: 'bg-green-100 text-green-800' }
    };
    return types[type] || types.REGULAR;
  };

  const getStatusLabel = (status) => {
    const statuses = {
      PENDING: { label: 'معلقة', color: 'bg-yellow-100 text-yellow-800' },
      COMPLETED: { label: 'مكتملة', color: 'bg-green-100 text-green-800' },
      SHIPPED: { label: 'تم الشحن', color: 'bg-blue-100 text-blue-800' },
      DELIVERED: { label: 'تم التسليم', color: 'bg-purple-100 text-purple-800' },
      CANCELLED: { label: 'ملغاة', color: 'bg-red-100 text-red-800' }
    };
    return statuses[status] || statuses.PENDING;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📄 فواتير المكتب</h1>
          <p className="text-gray-600 mt-1">إدارة مبيعات المخزن الرئيسي</p>
        </div>
        <button
          onClick={() => navigate('/office-invoices/create')}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          فاتورة جديدة
        </button>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">إجمالي المبيعات</p>
                <p className="text-3xl font-bold mt-2">{dashboard.totalSales.toFixed(2)} ج</p>
              </div>
              <DollarSign size={40} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">الأرباح</p>
                <p className="text-3xl font-bold mt-2">{dashboard.totalProfit.toFixed(2)} ج</p>
              </div>
              <TrendingUp size={40} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">المحصل</p>
                <p className="text-3xl font-bold mt-2">{dashboard.totalCollected.toFixed(2)} ج</p>
              </div>
              <DollarSign size={40} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">المتبقي</p>
                <p className="text-3xl font-bold mt-2">{dashboard.totalRemaining.toFixed(2)} ج</p>
              </div>
              <DollarSign size={40} className="opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">النوع</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">الكل</option>
              <option value="REGULAR">زبون عادي</option>
              <option value="SHIPMENT">شحن</option>
              <option value="CLIENT">عميل</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">الكل</option>
              <option value="PENDING">معلقة</option>
              <option value="COMPLETED">مكتملة</option>
              <option value="SHIPPED">تم الشحن</option>
              <option value="DELIVERED">تم التسليم</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">لا توجد فواتير</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الفاتورة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدفوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتبقي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => {
                  const typeInfo = getTypeLabel(invoice.type);
                  const statusInfo = getStatusLabel(invoice.status);
                  
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {invoice.total.toFixed(2)} ج
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {invoice.paidAmount.toFixed(2)} ج
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                        {invoice.remainingAmount.toFixed(2)} ج
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/office-invoices/${invoice.id}/print`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="عرض"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => navigate(`/office-invoices/${invoice.id}/print`)}
                            className="text-green-600 hover:text-green-900"
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
    </div>
  );
}
