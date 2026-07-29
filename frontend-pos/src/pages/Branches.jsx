import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Store, Link as LinkIcon, Trash2 } from 'lucide-react';
import api from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://bee-jeans-pos-production.up.railway.app/api/v1';

const branchAPI = {
  getAll: () => api.get('/branches').then(res => res.data),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

export default function Branches() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
  });

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: branchAPI.getAll,
  });

  const createMutation = useMutation({
    mutationFn: branchAPI.create,
    onSuccess: (response) => {
      queryClient.invalidateQueries(['branches']);
      setShowModal(false);
      resetForm();
      const branch = response.data.data;
      toast.success(
        <div>
          <p className="font-bold">تم إضافة الفرع بنجاح!</p>
          <p className="text-sm mt-1">URL: {branch.url}</p>
          <p className="text-sm">Code: {branch.code}</p>
        </div>
      );
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الفرع');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => branchAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      setShowModal(false);
      setEditingBranch(null);
      resetForm();
      toast.success('تم تحديث الفرع بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل تحديث الفرع');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: branchAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      toast.success('تم حذف الفرع بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل حذف الفرع');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      phone: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address || '',
      city: branch.city || '',
      phone: branch.phone || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
      deleteMutation.mutate(id);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ!');
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الفروع</h1>
          <p className="text-gray-600 mt-1">إدارة فروع Bee 🐝 JEANS</p>
        </div>
        <button
          onClick={() => {
            setEditingBranch(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus size={20} />
          <span>إضافة فرع</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(branches?.data || []).map((branch) => (
          <div key={branch.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Store className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{branch.name}</h3>
                  <span className="text-sm text-gray-500">كود: {branch.code}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(branch)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 size={18} className="text-blue-600" />
                </button>
                <button
                  onClick={() => handleDelete(branch.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Trash2 size={18} className="text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">العنوان:</span>
                <span>{branch.address}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">المدينة:</span>
                <span>{branch.city}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">الهاتف:</span>
                <span dir="ltr">{branch.phone}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <LinkIcon size={16} className="text-gray-400" />
                <span className="text-xs text-gray-500">رابط تسجيل الدخول:</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                  /branch/{branch.url}
                </code>
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/branch/${branch.url}`)}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  نسخ
                </button>
              </div>
              <a 
                href={`/branch/${branch.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                🔗 فتح صفحة تسجيل الدخول
              </a>
            </div>

            <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              branch.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {branch.isActive ? '✓ نشط' : '✗ غير نشط'}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم الفرع *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="مثال: شبرا 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">العنوان *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                  placeholder="مثال: شارع 15"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المدينة *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input-field"
                  placeholder="مثال: القاهرة"
                  required
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

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editingBranch ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBranch(null);
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
