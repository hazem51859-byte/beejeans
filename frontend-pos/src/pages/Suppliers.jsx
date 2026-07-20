import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Truck, DollarSign, Package, X } from 'lucide-react';
import api from '../services/api';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const [purchaseData, setPurchaseData] = useState({
    supplierId: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, size: null, color: '' }],
    totalAmount: 0,
    paidAmount: 0,
    notes: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    notes: '',
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data;
    },
  });

  const { data: purchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const response = await api.get('/purchases');
      return response.data;
    },
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
  });

  const categories = categoriesResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      setShowModal(false);
      resetForm();
      toast.success('تم إضافة المورد بنجاح');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      setShowModal(false);
      setEditingSupplier(null);
      resetForm();
      toast.success('تم تحديث المورد');
    },
  });

  const createPurchaseMutation = useMutation({
    mutationFn: (data) => api.post('/purchases', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchases']);
      queryClient.invalidateQueries(['suppliers']);
      setShowPurchaseModal(false);
      resetPurchaseForm();
      toast.success('تم تسجيل الوارد');
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ supplierId, data }) => api.post(`/suppliers/${supplierId}/payment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      queryClient.invalidateQueries(['purchases']);
      setShowPaymentModal(false);
      setSelectedSupplier(null);
      setPaymentData({ amount: 0, notes: '' });
      toast.success('تم تسجيل الدفعة بنجاح وتحديث الحساب');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تسجيل الدفعة');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      notes: '',
    });
  };

  const resetPurchaseForm = () => {
    setPurchaseData({
      supplierId: '',
      items: [{ description: '', quantity: 1, unitPrice: 0, size: '', color: '' }],
      totalAmount: 0,
      paidAmount: 0,
      notes: '',
    });
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openPurchaseModal = (supplier) => {
    setSelectedSupplier(supplier);
    setPurchaseData({ ...purchaseData, supplierId: supplier.id });
    setShowPurchaseModal(true);
  };

  const openPaymentModal = (supplier) => {
    setSelectedSupplier(supplier);
    setShowPaymentModal(true);
  };

  const addPurchaseItem = () => {
    setPurchaseData({
      ...purchaseData,
      items: [...purchaseData.items, { description: '', quantity: 1, unitPrice: 0, size: null, color: '' }],
    });
  };

  const updatePurchaseItem = (index, field, value) => {
    const newItems = [...purchaseData.items];
    newItems[index][field] = value;
    
    // لما يختار صنف، نحط السعر الافتراضي من الـ category
    if (field === 'description' && value) {
      const selectedCategory = categories.find(cat => cat.name === value);
      if (selectedCategory && selectedCategory.defaultCostPrice) {
        newItems[index]['unitPrice'] = selectedCategory.defaultCostPrice;
      }
    }
    
    const total = newItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setPurchaseData({ ...purchaseData, items: newItems, totalAmount: total });
  };

  const removePurchaseItem = (index) => {
    const newItems = purchaseData.items.filter((_, i) => i !== index);
    const total = newItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setPurchaseData({ ...purchaseData, items: newItems, totalAmount: total });
  };

  const handlePurchaseSubmit = (e) => {
    e.preventDefault();
    const remainingAmount = purchaseData.totalAmount - purchaseData.paidAmount;
    createPurchaseMutation.mutate({
      ...purchaseData,
      supplierName: selectedSupplier.name,
      supplierPhone: selectedSupplier.phone,
      remainingAmount,
      invoiceNumber: `PUR-${Date.now()}`,
      purchaseDate: new Date().toISOString(),
    });
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    recordPaymentMutation.mutate({
      supplierId: selectedSupplier.id,
      data: { 
        amount: parseFloat(paymentData.amount),
        notes: paymentData.notes
      },
    });
  };

  const getSupplierPurchases = (supplierId) => {
    const purchasesArray = purchases?.data?.purchases || (Array.isArray(purchases?.data) ? purchases.data : []);
    return purchasesArray.filter(p => p.supplierId === supplierId) || [];
  };

  const calculateSupplierBalance = (supplier) => {
    const supplierPurchases = getSupplierPurchases(supplier.id);
    return {
      totalAmount: supplier.totalPurchases || 0,
      paidAmount: supplier.totalPaid || 0,
      remaining: supplier.balance || 0,
      purchasesCount: supplierPurchases.length,
    };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الموردين</h1>
          <p className="text-gray-600 mt-1">إدارة الموردين والمشتريات</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          <span>مورد جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {suppliers?.data?.map((supplier) => {
          const balance = calculateSupplierBalance(supplier);
          const supplierPurchases = getSupplierPurchases(supplier.id);
          
          return (
            <div key={supplier.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center">
                    <Truck className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{supplier.name}</h3>
                    <p className="text-sm text-gray-500">{supplier.phone}</p>
                  </div>
                </div>
                <button onClick={() => handleEdit(supplier)} className="text-gray-600 hover:text-gray-800">
                  <Edit2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">إجمالي المشتريات</p>
                  <p className="text-lg font-bold text-blue-700">{balance.totalAmount.toFixed(2)} ج.م</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">المدفوع</p>
                  <p className="text-lg font-bold text-green-700">{balance.paidAmount.toFixed(2)} ج.م</p>
                </div>
                <div className={`p-3 rounded-lg ${balance.remaining > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-600 mb-1">المتبقي (علينا)</p>
                  <p className={`text-lg font-bold ${balance.remaining > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                    {balance.remaining.toFixed(2)} ج.م
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">عدد الفواتير</p>
                  <p className="text-lg font-bold text-gray-700">{balance.purchasesCount}</p>
                </div>
              </div>

              {supplierPurchases.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold mb-2">آخر المشتريات:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {supplierPurchases.slice(0, 3).map((purchase) => (
                      <div key={purchase.id} className="bg-gray-50 p-2 rounded text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium">{purchase.invoiceNumber}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(purchase.purchaseDate).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        {purchase.items?.map((item, idx) => (
                          <div key={idx} className="text-xs text-gray-600">
                            • {item.productName || item.description}
                            {item.size && ` (${item.size})`}
                            {item.color && ` - ${item.color}`}
                            {' - '}{item.quantity} قطعة
                            {' × '}{item.unitPrice} = {(item.quantity * item.unitPrice).toFixed(2)} ج.م
                          </div>
                        ))}
                        <div className="flex justify-between mt-1 pt-1 border-t">
                          <span className="text-xs font-medium">الإجمالي: {purchase.totalAmount} ج.م</span>
                          <span className="text-xs text-red-600">الباقي: {purchase.remainingAmount} ج.م</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => openPurchaseModal(supplier)} className="btn-primary flex-1">
                  <Package size={16} />
                  تسجيل وارد
                </button>
                {balance.remaining > 0 && (
                  <button onClick={() => openPaymentModal(supplier)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                    <DollarSign size={16} />
                    دفع
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: إضافة/تعديل مورد */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingSupplier ? 'تعديل مورد' : 'مورد جديد'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الهاتف</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">العنوان</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  {editingSupplier ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSupplier(null);
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

      {/* Modal: تسجيل وارد */}
      {showPurchaseModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">تسجيل وارد - {selectedSupplier.name}</h2>
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">تفاصيل البضاعة</label>
                {purchaseData.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 mb-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="col-span-2">
                        <label className="block text-xs mb-1">الصنف</label>
                        <select
                          value={item.description}
                          onChange={(e) => updatePurchaseItem(index, 'description', e.target.value)}
                          className="input-field"
                          required
                        >
                          <option value="">اختر الصنف...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs mb-1">اللون</label>
                        <input
                          type="text"
                          value={item.color}
                          onChange={(e) => updatePurchaseItem(index, 'color', e.target.value)}
                          className="input-field"
                          placeholder="أسود"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">الكمية</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updatePurchaseItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="input-field"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 font-bold text-gray-700">
                          سعر الشراء (للقطعة الواحدة)
                          <span className="text-blue-600 text-[10px] font-normal mr-1">
                            (سيتم تحميله تلقائياً من الصنف)
                          </span>
                        </label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updatePurchaseItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="input-field"
                          min="0"
                          step="0.01"
                          required
                          placeholder="سعر الشراء"
                        />
                      </div>
                    </div>
                    {purchaseData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePurchaseItem(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        <X size={16} className="inline" /> حذف
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPurchaseItem}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  + إضافة صنف آخر
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="col-span-2 bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">الإجمالي</p>
                  <p className="text-2xl font-bold text-blue-700">{purchaseData.totalAmount.toFixed(2)} ج.م</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">المدفوع</label>
                  <input
                    type="number"
                    value={purchaseData.paidAmount}
                    onChange={(e) => setPurchaseData({ ...purchaseData, paidAmount: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">المتبقي (آجل)</p>
                  <p className="text-xl font-bold text-red-700">
                    {(purchaseData.totalAmount - purchaseData.paidAmount).toFixed(2)} ج.م
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={purchaseData.notes}
                  onChange={(e) => setPurchaseData({ ...purchaseData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="btn-primary flex-1">
                  تسجيل الوارد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedSupplier(null);
                    resetPurchaseForm();
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

      {/* Modal: دفع */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">دفعة جديدة - {selectedSupplier.name}</h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">المتبقي علينا</p>
                <p className="text-2xl font-bold text-red-700">
                  {calculateSupplierBalance(selectedSupplier).remaining.toFixed(2)} ج.م
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">المبلغ المدفوع *</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  تسجيل الدفعة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedSupplier(null);
                    setPaymentData({ amount: 0, notes: '' });
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
