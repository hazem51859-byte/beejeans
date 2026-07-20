import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Tag, Trash2 } from 'lucide-react';
import api from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const categoryAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export default function Categories() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    defaultCostPrice: '',
    defaultSellingPrice: '',
    hasColor: false,
    serialStartNumber: '',
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryAPI.getAll,
  });

  const createMutation = useMutation({
    mutationFn: categoryAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setShowModal(false);
      resetForm();
      toast.success('تم إضافة الصنف بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الصنف');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => categoryAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setShowModal(false);
      setEditingCategory(null);
      resetForm();
      toast.success('تم تحديث الصنف بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل تحديث الصنف');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoryAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      toast.success('تم حذف الصنف بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل حذف الصنف');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      defaultCostPrice: '',
      defaultSellingPrice: '',
      hasColor: false,
      serialStartNumber: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const attributes = {};
    if (formData.hasColor) attributes.color = true;
    
    const data = {
      name: formData.name,
      description: formData.description,
      defaultCostPrice: formData.defaultCostPrice ? parseFloat(formData.defaultCostPrice) : null,
      defaultSellingPrice: formData.defaultSellingPrice ? parseFloat(formData.defaultSellingPrice) : null,
      attributes: JSON.stringify(attributes),
      serialStartNumber: formData.serialStartNumber ? parseInt(formData.serialStartNumber) : null,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    const attributes = category.attributes ? JSON.parse(category.attributes) : {};
    setFormData({
      name: category.name,
      description: category.description || '',
      defaultCostPrice: category.defaultCostPrice?.toString() || '',
      defaultSellingPrice: category.defaultSellingPrice?.toString() || '',
      hasColor: !!attributes.color,
      serialStartNumber: category.serialStartNumber?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟ سيؤثر على المنتجات المرتبطة به.')) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الأصناف</h1>
          <p className="text-gray-600 mt-1">إدارة أصناف المنتجات والأسعار</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus size={20} />
          <span>إضافة صنف</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories?.data?.data?.map((category) => (
          <div key={category.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Tag className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-500">{category.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 size={18} className="text-blue-600" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Trash2 size={18} className="text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">سعر الشراء</p>
                  <p className="text-sm font-bold text-red-700">
                    {formatCurrency(category.defaultCostPrice)}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">سعر البيع</p>
                  <p className="text-sm font-bold text-green-700">
                    {formatCurrency(category.defaultSellingPrice)}
                  </p>
                </div>
              </div>

              {category.attributes && (() => {
                const attrs = JSON.parse(category.attributes);
                const fields = [];
                if (attrs.color) fields.push('لون');
                return fields.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">✓ التفاصيل المطلوبة:</p>
                    <p className="text-xs text-gray-700">{fields.join(' + ')}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'تعديل الصنف' : 'إضافة صنف جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">اسم الصنف *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="مثال: بنطلون جينز"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">الوصف</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    placeholder="وصف الصنف"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">سعر الشراء الافتراضي</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.defaultCostPrice}
                    onChange={(e) => setFormData({ ...formData, defaultCostPrice: e.target.value })}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">سعر البيع الافتراضي</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.defaultSellingPrice}
                    onChange={(e) => setFormData({ ...formData, defaultSellingPrice: e.target.value })}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-3">
                  التفاصيل المطلوبة عند إضافة المنتج:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasColor}
                      onChange={(e) => setFormData({ ...formData, hasColor: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm">يحتوي على لون</span>
                  </label>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-2">
                  رقم بداية السيريال (اختياري)
                </label>
                <input
                  type="number"
                  value={formData.serialStartNumber || ''}
                  onChange={(e) => setFormData({ ...formData, serialStartNumber: e.target.value })}
                  className="input-field"
                  placeholder="مثال: 1000"
                  disabled={editingCategory && editingCategory.serialStartNumber}
                />
                {editingCategory && editingCategory.serialStartNumber && (
                  <p className="text-sm text-gray-500 mt-1">
                    السيريال يبدأ من: {editingCategory.serialStartNumber} | آخر رقم مستخدم: {editingCategory.lastSerialUsed || 'لم يستخدم بعد'}
                  </p>
                )}
                {!editingCategory && (
                  <p className="text-sm text-gray-500 mt-1">
                    إذا لم تحدد، لن يتم إنشاء سيريالات تلقائية لهذا الصنف
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editingCategory ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategory(null);
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
