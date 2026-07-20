import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Users, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const partnerAPI = {
  getAll: () => api.get('/partners'),
  create: (data) => api.post('/partners', data),
  update: (id, data) => api.put(`/partners/${id}`, data),
  getReport: () => api.get('/partners/report'),
};

export default function Partners() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    capitalPaid: '',
    sharePercentage: '',
    notes: '',
  });

  const { data: partners, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: partnerAPI.getAll,
  });

  const { data: report } = useQuery({
    queryKey: ['partners-report'],
    queryFn: partnerAPI.getReport,
  });

  const createMutation = useMutation({
    mutationFn: partnerAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['partners']);
      queryClient.invalidateQueries(['partners-report']);
      setShowModal(false);
      resetForm();
      toast.success('تم إضافة الشريك بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الشريك');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => partnerAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['partners']);
      queryClient.invalidateQueries(['partners-report']);
      setShowModal(false);
      setEditingPartner(null);
      resetForm();
      toast.success('تم تحديث الشريك بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل تحديث الشريك');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      capitalPaid: '',
      sharePercentage: '',
      notes: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      capitalPaid: parseFloat(formData.capitalPaid),
      sharePercentage: parseFloat(formData.sharePercentage),
    };

    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      email: partner.email || '',
      phone: partner.phone || '',
      capitalPaid: partner.capitalPaid.toString(),
      sharePercentage: partner.sharePercentage.toString(),
      notes: partner.notes || '',
    });
    setShowModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const reportData = report?.data?.data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الشركاء</h1>
          <p className="text-gray-600 mt-1">إدارة الشركاء والحسابات</p>
        </div>
        <button
          onClick={() => {
            setEditingPartner(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus size={20} />
          <span>إضافة شريك</span>
        </button>
      </div>

      {/* التقرير المالي */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">رأس المال الإجمالي</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(reportData.totalCapital)}
                </p>
              </div>
              <div className="bg-blue-200 w-12 h-12 rounded-lg flex items-center justify-center">
                <DollarSign className="text-blue-700" size={24} />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">صافي الربح</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(reportData.netProfit)}
                </p>
              </div>
              <div className="bg-green-200 w-12 h-12 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-700" size={24} />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-purple-700">
                  {formatCurrency(reportData.totalSales)}
                </p>
              </div>
              <div className="bg-purple-200 w-12 h-12 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-purple-700" size={24} />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(reportData.totalExpenses)}
                </p>
              </div>
              <div className="bg-red-200 w-12 h-12 rounded-lg flex items-center justify-center">
                <TrendingDown className="text-red-700" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* قائمة الشركاء */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners?.data?.data?.map((partner) => {
          const partnerProfit = reportData
            ? (reportData.netProfit * partner.sharePercentage) / 100
            : 0;

          return (
            <div key={partner.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center">
                    <Users className="text-primary-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{partner.name}</h3>
                    <span className="text-sm text-gray-500">{partner.sharePercentage}%</span>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(partner)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 size={18} className="text-blue-600" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">رأس المال المدفوع</p>
                  <p className="text-lg font-bold text-gray-800">
                    {formatCurrency(partner.capitalPaid)}
                  </p>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">حصة الربح</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(partnerProfit)}
                  </p>
                </div>

                {partner.email && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">البريد:</span> {partner.email}
                  </div>
                )}

                {partner.phone && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">الهاتف:</span> {partner.phone}
                  </div>
                )}
              </div>

              <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                partner.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {partner.isActive ? '✓ نشط' : '✗ غير نشط'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPartner ? 'تعديل الشريك' : 'إضافة شريك جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="اسم الشريك"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="01XXXXXXXXX"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رأس المال المدفوع *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capitalPaid}
                  onChange={(e) => setFormData({ ...formData, capitalPaid: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">نسبة الشراكة (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.sharePercentage}
                  onChange={(e) => setFormData({ ...formData, sharePercentage: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editingPartner ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPartner(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
