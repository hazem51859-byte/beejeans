import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, UserCircle, Shield } from 'lucide-react';
import api from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://bee-jeans-pos-production.up.railway.app/api/v1';

const userAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
};

export default function Users() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'CASHIER',
    branchId: '',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userAPI.getAll,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: userAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowModal(false);
      resetForm();
      toast.success('تم إضافة المستخدم بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل إضافة المستخدم');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => userAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowModal(false);
      setEditingUser(null);
      resetForm();
      toast.success('تم تحديث المستخدم بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل تحديث المستخدم');
    },
  });

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      fullName: '',
      phone: '',
      role: 'CASHIER',
      branchId: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      branchId: formData.branchId || null,
    };

    // Remove password if empty during update
    if (editingUser && !data.password) {
      delete data.password;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      fullName: user.fullName,
      phone: user.phone || '',
      role: user.role,
      branchId: user.branchId || '',
    });
    setShowModal(true);
  };

  const getRoleBadge = (role) => {
    const badges = {
      ADMIN: { color: 'bg-red-100 text-red-700', text: 'مدير نظام' },
      MANAGER: { color: 'bg-blue-100 text-blue-700', text: 'مدير فرع' },
      CASHIER: { color: 'bg-green-100 text-green-700', text: 'كاشير' },
    };
    return badges[role] || badges.CASHIER;
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
          <h1 className="text-2xl font-bold text-gray-800">المستخدمين</h1>
          <p className="text-gray-600 mt-1">إدارة مستخدمي النظام</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus size={20} />
          <span>إضافة مستخدم</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users?.data?.data?.map((user) => {
          const badge = getRoleBadge(user.role);
          
          return (
            <div key={user.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center">
                    <UserCircle className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{user.fullName}</h3>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(user)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 size={18} className="text-blue-600" />
                </button>
              </div>

              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${badge.color}`}>
                  <Shield size={16} />
                  <span>{badge.text}</span>
                </div>

                {user.branch && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">الفرع</p>
                    <p className="text-sm font-bold">{user.branch.name}</p>
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  <span className="font-medium">البريد:</span> {user.email}
                </div>

                {user.phone && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">الهاتف:</span> {user.phone}
                  </div>
                )}
              </div>

              <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                user.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {user.isActive ? '✓ نشط' : '✗ غير نشط'}
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
              {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الاسم الكامل *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="input-field"
                  placeholder="الاسم الكامل"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">اسم المستخدم *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input-field"
                  placeholder="username"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  كلمة المرور {editingUser ? '(اتركها فارغة للإبقاء)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  placeholder="••••••••"
                  required={!editingUser}
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
                <label className="block text-sm font-medium mb-2">الصلاحية *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="CASHIER">كاشير</option>
                  <option value="MANAGER">مدير فرع</option>
                  <option value="ADMIN">مدير نظام</option>
                </select>
              </div>

              {formData.role !== 'ADMIN' && (
                <div>
                  <label className="block text-sm font-medium mb-2">الفرع *</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">اختر الفرع</option>
                    {(branches?.data || []).map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editingUser ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
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
