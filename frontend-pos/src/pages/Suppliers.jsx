import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Truck, DollarSign, Package, X } from 'lucide-react';
import api from '../services/api';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'FABRIC', // FABRIC, MANUFACTURING, WASHING
    phone: '',
    address: '',
    notes: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    notes: '',
    invoiceAllocations: [], // توزيع المبلغ على الفواتير
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

  const recordPaymentMutation = useMutation({
    mutationFn: ({ supplierId, data }) => api.post(`/suppliers/${supplierId}/payment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      queryClient.invalidateQueries(['purchases']);
      setShowPaymentModal(false);
      setSelectedSupplier(null);
      setPaymentData({ amount: 0, notes: '' });
      toast.success('تم تسجيل الدفع بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تسجيل الدفعة');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      toast.success('تم حذف المورد بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في حذف المورد');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'FABRIC',
      phone: '',
      address: '',
      notes: '',
    });
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      type: supplier.type || 'FABRIC',
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

  const openPaymentModal = async (supplier) => {
    try {
      // جلب بيانات المورد الكاملة مع الفواتير
      const response = await api.get(`/suppliers/${supplier.id}`);
      const supplierData = response.data.data;
      
      // جمع كل الفواتير المستحقة حسب نوع المورد
      let unpaidInvoices = [];
      
      if (supplier.type === 'FABRIC' && supplierData.fabricPurchases) {
        unpaidInvoices = supplierData.fabricPurchases
          .filter(purchase => purchase.totalCost > purchase.amountPaid)
          .map(purchase => ({
            id: purchase.id,
            type: 'FABRIC',
            invoiceNumber: `FABRIC-${purchase.id.substring(0, 8)}`,
            date: purchase.purchaseDate,
            total: purchase.totalCost,
            amountPaid: purchase.amountPaid,
            remaining: purchase.totalCost - purchase.amountPaid,
            allocation: 0,
          }));
      } else if (supplier.type === 'MANUFACTURING' && supplierData.manufacturingOrders) {
        unpaidInvoices = supplierData.manufacturingOrders
          .filter(order => order.totalCost > order.amountPaid)
          .map(order => ({
            id: order.id,
            type: 'MANUFACTURING',
            invoiceNumber: `MANUF-${order.id.substring(0, 8)}`,
            date: order.sentDate,
            total: order.totalCost,
            amountPaid: order.amountPaid,
            remaining: order.totalCost - order.amountPaid,
            allocation: 0,
          }));
      } else if (supplier.type === 'WASHING' && supplierData.washingOrders) {
        unpaidInvoices = supplierData.washingOrders
          .filter(order => order.totalCost > order.amountPaid)
          .map(order => ({
            id: order.id,
            type: 'WASHING',
            invoiceNumber: `WASH-${order.id.substring(0, 8)}`,
            date: order.sentDate,
            total: order.totalCost,
            amountPaid: order.amountPaid,
            remaining: order.totalCost - order.amountPaid,
            allocation: 0,
          }));
      }
      
      setSelectedSupplier(supplierData);
      setPaymentData({
        amount: 0,
        notes: '',
        invoiceAllocations: unpaidInvoices,
      });
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error loading supplier data:', error);
      toast.error('فشل في تحميل بيانات المورد');
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    
    const totalAllocated = paymentData.invoiceAllocations.reduce((sum, inv) => sum + (parseFloat(inv.allocation) || 0), 0);
    
    if (totalAllocated <= 0) {
      toast.error('يرجى توزيع المبلغ على الفواتير');
      return;
    }
    
    // فلترة الفواتير اللي تم توزيع مبالغ عليها فقط
    const allocatedInvoices = paymentData.invoiceAllocations
      .filter(inv => inv.allocation > 0)
      .map(inv => ({
        id: inv.id,
        type: inv.type,
        amount: parseFloat(inv.allocation),
      }));
    
    recordPaymentMutation.mutate({
      supplierId: selectedSupplier.id,
      data: { 
        amount: totalAllocated,
        notes: paymentData.notes,
        invoiceAllocations: allocatedInvoices,
      },
    });
  };
  
  const autoDistributePayment = (amount) => {
    const totalAmount = parseFloat(amount) || 0;
    let remaining = totalAmount;
    
    const updatedAllocations = paymentData.invoiceAllocations.map(inv => {
      if (remaining <= 0) return { ...inv, allocation: 0 };
      
      const toAllocate = Math.min(remaining, inv.remaining);
      remaining -= toAllocate;
      
      return { ...inv, allocation: toAllocate };
    });
    
    setPaymentData({ ...paymentData, amount: totalAmount, invoiceAllocations: updatedAllocations });
  };
  
  const updateInvoiceAllocation = (index, value) => {
    const newValue = parseFloat(value) || 0;
    const invoice = paymentData.invoiceAllocations[index];
    
    // التأكد من عدم تجاوز المبلغ المتبقي
    const allocatedValue = Math.min(newValue, invoice.remaining);
    
    const updatedAllocations = [...paymentData.invoiceAllocations];
    updatedAllocations[index] = { ...invoice, allocation: allocatedValue };
    
    // حساب الإجمالي
    const totalAllocated = updatedAllocations.reduce((sum, inv) => sum + (inv.allocation || 0), 0);
    
    setPaymentData({ ...paymentData, amount: totalAllocated, invoiceAllocations: updatedAllocations });
  };

  const getSupplierPurchases = (supplierId) => {
    const purchasesArray = purchases?.data?.purchases || (Array.isArray(purchases?.data) ? purchases.data : []);
    return purchasesArray.filter(p => p.supplierId === supplierId) || [];
  };

  const calculateSupplierBalance = (supplier) => {
    // عدد الفواتير = 1 لو عنده رصيد، 0 لو مفيش
    // TODO: المفروض نجيب العدد الحقيقي من fabric/manufacturing/washing حسب النوع
    const purchasesCount = supplier.balance > 0 ? 1 : 0;
    
    return {
      totalAmount: supplier.totalPurchases || supplier.balance || 0,
      paidAmount: supplier.totalPaid || 0,
      remaining: supplier.balance || 0,
      purchasesCount: purchasesCount,
    };
  };

  return (
    <div className="pb-16">
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
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(supplier)} className="text-gray-600 hover:text-gray-800">
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
                        deleteMutation.mutate(supplier.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X size={18} />
                  </button>
                </div>
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
                <button 
                  onClick={() => openPaymentModal(supplier)} 
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    balance.remaining > 0 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                  disabled={balance.remaining <= 0}
                >
                  <DollarSign size={16} />
                  {balance.remaining > 0 ? 'دفع' : 'لا يوجد مستحقات'}
                </button>
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
                <label className="block text-sm font-medium mb-2">نوع المورد *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="FABRIC">مورد قماش</option>
                  <option value="MANUFACTURING">مورد تصنيع</option>
                  <option value="WASHING">مورد غسيل</option>
                </select>
              </div>
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

      {/* Modal: دفع */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8">
            <h2 className="text-xl font-bold mb-4">دفعة جديدة - {selectedSupplier.name}</h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">المتبقي علينا</p>
                <p className="text-2xl font-bold text-red-700">
                  {calculateSupplierBalance(selectedSupplier).remaining.toFixed(2)} ج.م
                </p>
              </div>

              {/* الفواتير المستحقة */}
              {paymentData.invoiceAllocations.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-3 font-bold">توزيع الدفعة على الفواتير</div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="p-2 text-right">رقم الفاتورة</th>
                          <th className="p-2 text-right">التاريخ</th>
                          <th className="p-2 text-right">الإجمالي</th>
                          <th className="p-2 text-right">المدفوع</th>
                          <th className="p-2 text-right">المتبقي</th>
                          <th className="p-2 text-right">المبلغ المدفوع الآن</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentData.invoiceAllocations.map((invoice, index) => (
                          <tr key={invoice.id} className="border-t">
                            <td className="p-2 font-medium">{invoice.invoiceNumber}</td>
                            <td className="p-2 text-xs">{new Date(invoice.date).toLocaleDateString('ar-EG')}</td>
                            <td className="p-2">{invoice.total.toFixed(2)} ج.م</td>
                            <td className="p-2 text-green-700">{invoice.amountPaid.toFixed(2)} ج.م</td>
                            <td className="p-2 text-red-700 font-bold">{invoice.remaining.toFixed(2)} ج.م</td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={invoice.allocation || ''}
                                onChange={(e) => updateInvoiceAllocation(index, e.target.value)}
                                className="input-field w-full"
                                min="0"
                                max={invoice.remaining}
                                step="0.01"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-blue-50 p-3 flex justify-between items-center border-t-2">
                    <span className="font-bold">إجمالي المبلغ المدفوع:</span>
                    <span className="text-xl font-bold text-blue-700">
                      {paymentData.invoiceAllocations.reduce((sum, inv) => sum + (inv.allocation || 0), 0).toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              )}

              {paymentData.invoiceAllocations.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
                  <p className="text-yellow-800">لا توجد فواتير مستحقة لهذا المورد</p>
                </div>
              )}

              {/* توزيع تلقائي */}
              {paymentData.invoiceAllocations.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium mb-2">توزيع تلقائي للمبلغ</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input-field flex-1"
                      placeholder="أدخل المبلغ"
                      min="0"
                      step="0.01"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = e.target.previousElementSibling;
                        autoDistributePayment(input.value);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      توزيع تلقائي
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">سيتم توزيع المبلغ على الفواتير بالترتيب</p>
                </div>
              )}

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
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={paymentData.invoiceAllocations.length === 0}
                >
                  تسجيل الدفعة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedSupplier(null);
                    setPaymentData({ amount: 0, notes: '', invoiceAllocations: [] });
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
