import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, DollarSign, Calendar, Filter, X, FileText } from 'lucide-react';
import api from '../services/api';

export default function Expenses() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState({
    category: 'RENT',
    description: '',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    branchId: '',
    receiptNumber: '',
    notes: '',
  });

  // Queries
  const { data: expensesResponse, isLoading } = useQuery({
    queryKey: ['expenses', filterCategory, filterBranch, startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterBranch) params.branchId = filterBranch;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/expenses', { params });
      return response.data;
    },
  });

  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data;
    },
  });

  const expenses = expensesResponse?.data?.expenses || [];
  const totalAmount = expensesResponse?.data?.total || 0;
  const branches = branchesResponse?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowModal(false);
      resetForm();
      toast.success('تم تسجيل المصروف بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowModal(false);
      setEditingExpense(null);
      resetForm();
      toast.success('تم تعديل المصروف بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('تم حذف المصروف');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء الحذف');
    }
  });

  const resetForm = () => {
    setFormData({
      category: 'RENT',
      description: '',
      amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
      branchId: '',
      receiptNumber: '',
      notes: '',
    });
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
      branchId: expense.branchId || '',
      receiptNumber: expense.receiptNumber || '',
      notes: expense.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المصروف؟')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      amount: parseFloat(formData.amount),
      branchId: formData.branchId || null
    };

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: dataToSend });
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  const getCategoryText = (cat) => {
    const categories = {
      RENT: 'إيجار فرع / مخزن',
      SALARY: 'مرتبات وأجور',
      ELECTRICITY: 'كهرباء',
      WATER: 'مياه',
      PURCHASES: 'مشتريات نثرية',
      OTHER: 'مصروفات أخرى',
    };
    return categories[cat] || cat;
  };

  const getCategoryColor = (cat) => {
    const colors = {
      RENT: 'text-blue-600 bg-blue-50 border-blue-200',
      SALARY: 'text-purple-600 bg-purple-50 border-purple-200',
      ELECTRICITY: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      WATER: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      PURCHASES: 'text-orange-600 bg-orange-50 border-orange-200',
      OTHER: 'text-gray-600 bg-gray-50 border-gray-200',
    };
    return colors[cat] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المصروفات العامة</h1>
          <p className="text-gray-600 mt-1">تتبع وتسجيل المصروفات التشغيلية (إيجار، كهرباء، مرتبات...) وتأثيرها على الأرباح والشركاء</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary self-start">
          <Plus size={20} />
          <span>تسجيل مصروف</span>
        </button>
      </div>

      {/* بطاقة الإجمالي */}
      <div className="card max-w-sm border-r-4 border-red-500 bg-red-50/30 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">إجمالي المصروفات في الفترة المحددة</p>
          <p className="text-3xl font-black text-red-600 mt-1">{totalAmount.toFixed(2)} ج.م</p>
        </div>
        <div className="bg-red-100 p-3 rounded-full text-red-600">
          <DollarSign size={28} />
        </div>
      </div>

      {/* الفلترة */}
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Filter size={18} />
          <span>فلترة وتصفية المصروفات</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600">فئة المصروف</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input-field py-1.5 text-sm"
            >
              <option value="">كل الفئات</option>
              <option value="RENT">إيجار فرع / مخزن</option>
              <option value="SALARY">مرتبات وأجور</option>
              <option value="ELECTRICITY">كهرباء</option>
              <option value="WATER">مياه</option>
              <option value="PURCHASES">مشتريات نثرية</option>
              <option value="OTHER">مصروفات أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600">الفرع المنسوب له</label>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="input-field py-1.5 text-sm"
            >
              <option value="">كل الفروع / عام</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {/* جدول المصروفات */}
      <div className="card overflow-auto">
        {isLoading ? (
          <p className="text-center text-gray-500 py-6">جاري تحميل المصروفات...</p>
        ) : expenses.length === 0 ? (
          <p className="text-center text-gray-500 py-6">لا توجد مصروفات مسجلة للفترة المحددة</p>
        ) : (
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b text-gray-600 font-bold bg-gray-50">
                <th className="p-3">التاريخ</th>
                <th className="p-3">الفئة</th>
                <th className="p-3">الوصف</th>
                <th className="p-3">الفرع</th>
                <th className="p-3">رقم الإيصال</th>
                <th className="p-3 text-left">المبلغ</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-gray-600">
                    {new Date(expense.expenseDate).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${getCategoryColor(expense.category)}`}>
                      {getCategoryText(expense.category)}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-gray-800">
                    {expense.description}
                    {expense.notes && <span className="block text-xs text-gray-400 font-normal">{expense.notes}</span>}
                  </td>
                  <td className="p-3 text-gray-500">
                    {expense.branch?.name || 'مصروف عام'}
                  </td>
                  <td className="p-3 font-mono text-gray-600">
                    {expense.receiptNumber || 'N/A'}
                  </td>
                  <td className="p-3 font-bold text-red-600 text-left">
                    {expense.amount.toFixed(2)} ج.م
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(expense)}
                        className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(expense.id)}
                        className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: تسجيل / تعديل مصروف */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingExpense ? 'تعديل مصروف تشغيلي' : 'تسجيل مصروف تشغيلي جديد'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الفئة *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="RENT">إيجار فرع / مخزن</option>
                  <option value="SALARY">مرتبات وأجور</option>
                  <option value="ELECTRICITY">كهرباء</option>
                  <option value="WATER">مياه</option>
                  <option value="PURCHASES">مشتريات نثرية</option>
                  <option value="OTHER">مصروفات أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الوصف / البيان *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="مثال: فاتورة كهرباء شهر يوليو"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">المبلغ *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="input-field font-bold text-red-600"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">التاريخ *</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الفرع المنسوب له المصروف</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="input-field"
                >
                  <option value="">مصروف عام / الإدارة</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">اختياري - حدد إذا كان المصروف خاصاً بفرع معين لربطه بتقريره</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رقم الإيصال / الفاتورة</label>
                <input
                  type="text"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                  className="input-field"
                  placeholder="رقم مرجع الإيصال إن وجد"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات إضافية</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                  placeholder="أي تفاصيل أو ملاحظات..."
                />
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button type="submit" className="btn-primary flex-1">
                  {editingExpense ? 'تحديث' : 'تسجيل وحفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingExpense(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50"
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
