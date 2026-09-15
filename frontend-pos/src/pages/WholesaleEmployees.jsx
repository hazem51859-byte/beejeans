import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Users, Plus, Edit2, Trash2, TrendingUp, DollarSign, 
  FileText, Award, Calendar, Search, Filter, Phone, Mail, ShoppingBag
} from 'lucide-react';
import api from '../services/api';

export default function WholesaleEmployees() {
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  // Fetch performance report
  const { data: reportResponse, isLoading } = useQuery({
    queryKey: ['wholesale-employees-report', startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await api.get('/wholesale-employees/performance', { params });
      return response.data;
    }
  });

  const employees = reportResponse?.data?.employees || [];
  const totals = reportResponse?.data?.totals || {};

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/wholesale-employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wholesale-employees-report']);
      setShowModal(false);
      resetForm();
      toast.success('تم إضافة موظف الجملة بنجاح');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء الإضافة');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/wholesale-employees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wholesale-employees-report']);
      setShowModal(false);
      setEditingEmp(null);
      resetForm();
      toast.success('تم تحديث بيانات الموظف');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء التحديث');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/wholesale-employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['wholesale-employees-report']);
      toast.success('تم إيقاف حساب الموظف');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'فشل في إيقاف حساب الموظف');
    }
  });

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', notes: '' });
  };

  const handleEdit = (emp) => {
    setEditingEmp(emp);
    setFormData({
      name: emp.name || '',
      phone: emp.phone || '',
      email: emp.email || '',
      notes: emp.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من إيقاف هذا الموظف؟')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingEmp) {
      updateMutation.mutate({ id: editingEmp.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filtered employees list by search term
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.phone && emp.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-primary-600" size={28} />
            موظفين الجملة (شغل المكتب)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة موظفي مبيعات المكتب وتقارير أدائهم وتقييم الأكثر مبيعات وحذباً للعملاء
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEmp(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-sm"
        >
          <Plus size={18} />
          إضافة موظف جملة جديد
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/80 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-lg shadow-sm">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700">إجمالي المبيعات بالجملة</p>
            <p className="text-xl font-black text-blue-900 mt-0.5">
              {(totals.totalSales || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/80 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-600 text-white rounded-lg shadow-sm">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700">إجمالي الأرباح المحققة</p>
            <p className="text-xl font-black text-emerald-900 mt-0.5">
              {(totals.totalProfit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/80 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-600 text-white rounded-lg shadow-sm">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-700">عدد الفواتير المنفذة</p>
            <p className="text-xl font-black text-purple-900 mt-0.5">
              {totals.totalInvoices || 0} فاتورة
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/80 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-600 text-white rounded-lg shadow-sm">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-700">الأكثر مبيعاً (البائع الأفضل)</p>
            <p className="text-lg font-black text-amber-900 truncate max-w-[150px] mt-0.5" title={totals.bestSeller}>
              {totals.bestSeller || 'لا يوجد'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="بحث باسم الموظف أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pr-10 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border">
            <Calendar size={16} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-600">الفترة:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold border-none focus:ring-0 p-0 text-gray-700"
            />
            <span className="text-xs text-gray-400">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold border-none focus:ring-0 p-0 text-gray-700"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-red-600 font-bold hover:underline"
            >
              إعادة ضبط
            </button>
          )}
        </div>
      </div>

      {/* Performance Report Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Award className="text-amber-500" size={20} />
            تقرير تقييم وأداء موظفي الجملة
          </h2>
          <span className="text-xs text-gray-500 font-medium">مرتبين حسب إجمالي المبيعات</span>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-sm text-gray-500 mt-2">جاري جلب تقارير الموظفين...</p>
          </div>
        ) : filteredEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-100/70 text-gray-700 font-bold border-b text-xs">
                <tr>
                  <th className="p-3 text-center w-16">الترتيب</th>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3 text-center">عدد الفواتير</th>
                  <th className="p-3 text-center">القطع المباعة</th>
                  <th className="p-3 text-left">إجمالي المبيعات</th>
                  <th className="p-3 text-left">الأرباح المحققة</th>
                  <th className="p-3 text-center w-40">نسبة المساهمة %</th>
                  <th className="p-3 text-center w-24">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp, index) => {
                  const isTop = index === 0 && emp.totalSales > 0;
                  const isSecond = index === 1 && emp.totalSales > 0;
                  const isThird = index === 2 && emp.totalSales > 0;

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 text-center font-extrabold">
                        {isTop ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold text-xs border border-amber-300">
                            🥇 1
                          </span>
                        ) : isSecond ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold text-xs border border-gray-300">
                            🥈 2
                          </span>
                        ) : isThird ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/10 text-amber-900 font-bold text-xs border border-amber-700/30">
                            🥉 3
                          </span>
                        ) : (
                          <span className="text-gray-500">#{index + 1}</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                          {emp.name.substring(0, 2)}
                        </div>
                        <div>
                          <p>{emp.name}</p>
                          {emp.email && <p className="text-xs text-gray-400 font-normal">{emp.email}</p>}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dir-ltr text-right font-medium">
                        {emp.phone || '-'}
                      </td>
                      <td className="p-3 text-center font-bold text-blue-700">
                        {emp.totalInvoices}
                      </td>
                      <td className="p-3 text-center font-bold text-purple-700">
                        {emp.totalItemsSold} قطعة
                      </td>
                      <td className="p-3 text-left font-black text-emerald-700">
                        {emp.totalSales.toFixed(2)} ج.م
                      </td>
                      <td className="p-3 text-left font-extrabold text-blue-800">
                        {emp.totalProfit.toFixed(2)} ج.م
                      </td>
                      <td className="p-3 text-center">
                        <div className="space-y-1">
                          <span className="font-extrabold text-xs text-gray-700">
                            {emp.contributionPercent.toFixed(1)}%
                          </span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isTop ? 'bg-amber-500' : 'bg-primary-600'}`}
                              style={{ width: `${Math.min(emp.contributionPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(emp)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="إيقاف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-300 mb-2" size={40} />
            <p className="text-gray-500 font-bold">لا يوجد موظفين مسجلين أو ينطبق عليهم التصفية</p>
            <button
              onClick={() => { setEditingEmp(null); resetForm(); setShowModal(true); }}
              className="mt-3 btn-secondary text-xs"
            >
              إضافة موظف جملة الآن
            </button>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Employee */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">
                {editingEmp ? 'تعديل بيانات موظف الجملة' : 'إضافة موظف جملة جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم الموظف البائع *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد علي (مبيعات المكتب)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  placeholder="010XXXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  placeholder="employee@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات / بيان</label>
                <textarea
                  rows="2"
                  placeholder="ملاحظات عن الموظف..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary text-xs flex items-center gap-1"
                >
                  {editingEmp ? 'حفظ التعديلات' : 'إضافة الموظف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
