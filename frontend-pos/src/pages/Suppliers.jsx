import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Truck, DollarSign, Package, X, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReadyPurchaseModal, setShowReadyPurchaseModal] = useState(false);
  const [showMiscExpenseModal, setShowMiscExpenseModal] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  const [readyPurchaseData, setReadyPurchaseData] = useState({
    supplierId: '',
    supplierName: '',
    productId: '',
    searchCode: '',
    productName: '',
    quantity: 1,
    unitCostPrice: 0,
    paidAmount: 0,
    notes: ''
  });
  
  const [miscExpenseData, setMiscExpenseData] = useState({
    supplierId: '',
    supplierName: '',
    description: '',
    totalAmount: 0,
    paidAmount: 0,
    notes: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'FABRIC', // FABRIC, MANUFACTURING, WASHING, READY, MISCELLANEOUS
    phone: '',
    address: '',
    notes: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    vaultId: '',
    notes: '',
    invoiceAllocations: [], // توزيع المبلغ على الفواتير
  });

  const { data: vaultsResponse } = useQuery({
    queryKey: ['vaults'],
    queryFn: async () => {
      const response = await api.get('/vaults');
      return response.data;
    },
  });
  const vaults = Array.isArray(vaultsResponse?.data) ? vaultsResponse.data : (Array.isArray(vaultsResponse) ? vaultsResponse : []);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data;
    },
  });

  const { data: productsResponse } = useQuery({
    queryKey: ['products-for-purchase'],
    queryFn: async () => {
      const response = await api.get('/products?all=true');
      return response.data;
    },
  });

  const productsList = Array.isArray(productsResponse?.data) 
    ? productsResponse.data 
    : (Array.isArray(productsResponse?.data?.products) ? productsResponse.data.products : []);

  const createReadyPurchaseMutation = useMutation({
    mutationFn: (purchasePayload) => api.post('/purchases', purchasePayload),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      queryClient.invalidateQueries(['purchases']);
      queryClient.invalidateQueries(['products']);
      setShowReadyPurchaseModal(false);
      setReadyPurchaseData({
        supplierId: '',
        supplierName: '',
        productId: '',
        searchCode: '',
        productName: '',
        quantity: 1,
        unitCostPrice: 0,
        paidAmount: 0,
        notes: ''
      });
      toast.success('تم تسجيل فاتورة شراء البضاعة الجاهزة وتحديث سعر التكلفة بالصنف ماستر');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'فشل في تسجيل الفاتورة');
    }
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

  const deleteCompletedFabricPurchaseMutation = useMutation({
    mutationFn: (purchaseId) => api.delete(`/suppliers/fabric-purchases/${purchaseId}`),
    onSuccess: async () => {
      toast.success('تم حذف فاتورة القماش بنجاح');
      if (selectedSupplier) {
        const response = await api.get(`/suppliers/${selectedSupplier.id}`);
        setSelectedSupplier(response.data.data);
      }
      queryClient.invalidateQueries(['suppliers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في حذف الفاتورة');
    },
  });

  const deleteCompletedManufacturingOrderMutation = useMutation({
    mutationFn: (orderId) => api.delete(`/suppliers/manufacturing-orders/${orderId}`),
    onSuccess: async () => {
      toast.success('تم حذف أمر التصنيع بنجاح');
      if (selectedSupplier) {
        const response = await api.get(`/suppliers/${selectedSupplier.id}`);
        setSelectedSupplier(response.data.data);
      }
      queryClient.invalidateQueries(['suppliers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في حذف الأمر');
    },
  });

  const deleteCompletedWashingOrderMutation = useMutation({
    mutationFn: (orderId) => api.delete(`/suppliers/washing-orders/${orderId}`),
    onSuccess: async () => {
      toast.success('تم حذف أمر الغسيل بنجاح');
      if (selectedSupplier) {
        const response = await api.get(`/suppliers/${selectedSupplier.id}`);
        setSelectedSupplier(response.data.data);
      }
      queryClient.invalidateQueries(['suppliers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في حذف الأمر');
    },
  });

  const createMiscExpenseMutation = useMutation({
    mutationFn: ({ supplierId, data }) => api.post(`/suppliers/${supplierId}/miscellaneous-expenses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      setShowMiscExpenseModal(false);
      setMiscExpenseData({
        supplierId: '',
        supplierName: '',
        description: '',
        totalAmount: 0,
        paidAmount: 0,
        notes: ''
      });
      toast.success('تم تسجيل المصروف المتنوع بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في تسجيل المصروف');
    }
  });

  const deleteCompletedMiscExpenseMutation = useMutation({
    mutationFn: (expenseId) => api.delete(`/suppliers/miscellaneous-expenses/${expenseId}`),
    onSuccess: async () => {
      toast.success('تم حذف المصروف بنجاح');
      if (selectedSupplier) {
        const response = await api.get(`/suppliers/${selectedSupplier.id}`);
        setSelectedSupplier(response.data.data);
      }
      queryClient.invalidateQueries(['suppliers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في حذف المصروف');
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
          .filter(purchase => (purchase.totalCost || 0) > (purchase.paidAmount || 0))
          .map(purchase => ({
            id: purchase.id,
            type: 'FABRIC',
            invoiceNumber: purchase.invoiceNumber || `FABRIC-${purchase.id.substring(0, 8)}`,
            date: purchase.purchaseDate,
            total: purchase.totalCost || 0,
            amountPaid: purchase.paidAmount || 0,
            remaining: (purchase.totalCost || 0) - (purchase.paidAmount || 0),
            allocation: 0,
          }));
      } else if (supplier.type === 'MANUFACTURING' && supplierData.manufacturingOrders) {
        unpaidInvoices = supplierData.manufacturingOrders
          .filter(order => order.status === 'COMPLETED' && (order.totalManufacturingCost || 0) > (order.paidAmount || 0))
          .map(order => ({
            id: order.id,
            type: 'MANUFACTURING',
            invoiceNumber: order.orderNumber || `MFG-${order.id.substring(0, 8)}`,
            date: order.sentDate,
            total: order.totalManufacturingCost || 0,
            amountPaid: order.paidAmount || 0,
            remaining: (order.totalManufacturingCost || 0) - (order.paidAmount || 0),
            allocation: 0,
          }));
      } else if (supplier.type === 'WASHING' && supplierData.washingOrders) {
        unpaidInvoices = supplierData.washingOrders
          .filter(order => order.status === 'COMPLETED' && (order.totalWashingCost || 0) > (order.paidAmount || 0))
          .map(order => ({
            id: order.id,
            type: 'WASHING',
            invoiceNumber: order.orderNumber || `WASH-${order.id.substring(0, 8)}`,
            date: order.sentDate,
            total: order.totalWashingCost || 0,
            amountPaid: order.paidAmount || 0,
            remaining: (order.totalWashingCost || 0) - (order.paidAmount || 0),
            allocation: 0,
          }));
      } else if ((supplier.type === 'READY' || !supplier.type) && supplierData.purchases) {
        unpaidInvoices = supplierData.purchases
          .filter(purchase => (purchase.totalAmount || 0) > (purchase.paidAmount || 0))
          .map(purchase => ({
            id: purchase.id,
            type: 'PURCHASE',
            invoiceNumber: purchase.invoiceNumber || `PUR-${purchase.id.substring(0, 8)}`,
            date: purchase.purchaseDate,
            total: purchase.totalAmount || 0,
            amountPaid: purchase.paidAmount || 0,
            remaining: (purchase.totalAmount || 0) - (purchase.paidAmount || 0),
            allocation: 0,
          }));
      } else if (supplier.type === 'MISCELLANEOUS' && supplierData.miscellaneousExpenses) {
        unpaidInvoices = supplierData.miscellaneousExpenses
          .filter(expense => (expense.totalAmount || 0) > (expense.paidAmount || 0))
          .map(expense => ({
            id: expense.id,
            type: 'MISCELLANEOUS',
            invoiceNumber: expense.expenseNumber || `MISC-${expense.id.substring(0, 8)}`,
            date: expense.expenseDate,
            total: expense.totalAmount || 0,
            amountPaid: expense.paidAmount || 0,
            remaining: (expense.totalAmount || 0) - (expense.paidAmount || 0),
            allocation: 0,
            description: expense.description
          }));
      }
      
      setSelectedSupplier(supplierData);
      setPaymentData({
        amount: 0,
        vaultId: vaults.length > 0 ? vaults[0].id : '',
        notes: '',
        invoiceAllocations: unpaidInvoices,
      });
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error loading supplier data:', error);
      toast.error('فشل في تحميل بيانات المورد');
    }
  };

  const openDetailsModal = async (supplier) => {
    try {
      const response = await api.get(`/suppliers/${supplier.id}`);
      setSelectedSupplier(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
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
    
    if (!paymentData.vaultId) {
      toast.error('يرجى اختيار الخزينة التي سيخرج منها المبلغ');
      return;
    }

    recordPaymentMutation.mutate({
      supplierId: selectedSupplier.id,
      data: { 
        amount: totalAllocated,
        vaultId: paymentData.vaultId,
        paymentMethod: 'CASH',
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
    // حساب عدد الفواتير من الـ _count حسب نوع المورد
    let purchasesCount = 0;
    if (supplier.type === 'FABRIC') {
      purchasesCount = supplier._count?.fabricPurchases || 0;
    } else if (supplier.type === 'MANUFACTURING') {
      purchasesCount = supplier._count?.manufacturingOrders || 0;
    } else if (supplier.type === 'WASHING') {
      purchasesCount = supplier._count?.washingOrders || 0;
    } else if (supplier.type === 'MISCELLANEOUS') {
      purchasesCount = supplier._count?.miscellaneousExpenses || 0;
    } else {
      purchasesCount = supplier._count?.purchases || 0;
    }
    
    return {
      totalAmount: supplier.totalPurchases || 0,
      paidAmount: supplier.totalPaid || 0,
      remaining: supplier.balance || 0,
      purchasesCount,
    };
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'FABRIC':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">مورد قماش</span>;
      case 'MANUFACTURING':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-medium">مورد تصنيع</span>;
      case 'WASHING':
        return <span className="bg-cyan-100 text-cyan-800 text-xs px-2.5 py-0.5 rounded-full font-medium">مورد غسيل</span>;
      case 'READY':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-medium">مورد بضاعة جاهزة</span>;
      case 'MISCELLANEOUS':
        return <span className="bg-orange-100 text-orange-800 text-xs px-2.5 py-0.5 rounded-full font-medium">مصروفات متنوعة</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-full font-medium">{type}</span>;
    }
  };

  const filteredSuppliers = suppliers?.data?.filter(supplier => {
    if (activeFilterTab === 'ALL') return true;
    return supplier.type === activeFilterTab;
  }) || [];

  return (
    <div className="pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الموردين</h1>
          <p className="text-gray-600 mt-1">إدارة الموردين والمشتريات والبضاعة الجاهزة</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          <span>مورد جديد</span>
        </button>
      </div>

      {/* فلاتر أنواع الموردين */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-3">
        <button
          onClick={() => setActiveFilterTab('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeFilterTab === 'ALL' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          الكل ({suppliers?.data?.length || 0})
        </button>
        <button
          onClick={() => setActiveFilterTab('FABRIC')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeFilterTab === 'FABRIC' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          موردين قماش ({suppliers?.data?.filter(s => s.type === 'FABRIC').length || 0})
        </button>
        <button
          onClick={() => setActiveFilterTab('MANUFACTURING')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeFilterTab === 'MANUFACTURING' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          موردين تصنيع ({suppliers?.data?.filter(s => s.type === 'MANUFACTURING').length || 0})
        </button>
        <button
          onClick={() => setActiveFilterTab('WASHING')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeFilterTab === 'WASHING' ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          موردين غسيل ({suppliers?.data?.filter(s => s.type === 'WASHING').length || 0})
        </button>
        <button
          onClick={() => setActiveFilterTab('READY')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeFilterTab === 'READY' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          موردين بضاعة جاهزة ({suppliers?.data?.filter(s => s.type === 'READY').length || 0})
        </button>
        <button
          onClick={() => setActiveFilterTab('MISCELLANEOUS')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeFilterTab === 'MISCELLANEOUS' ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          مصروفات متنوعة ({suppliers?.data?.filter(s => s.type === 'MISCELLANEOUS').length || 0})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSuppliers.map((supplier) => {
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{supplier.name}</h3>
                      {getTypeBadge(supplier.type)}
                    </div>
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

              <div className="flex flex-wrap gap-2">
                {supplier.type === 'READY' && (
                  <button
                    onClick={() => {
                      setReadyPurchaseData({
                        supplierId: supplier.id,
                        supplierName: supplier.name,
                        productId: '',
                        searchCode: '',
                        productName: '',
                        quantity: 1,
                        unitCostPrice: 0,
                        paidAmount: 0,
                        notes: ''
                      });
                      setShowReadyPurchaseModal(true);
                    }}
                    className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 font-bold px-3 py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"
                  >
                    <Plus size={16} />
                    <span>شراء بضاعة جاهزة</span>
                  </button>
                )}
                {supplier.type === 'MISCELLANEOUS' && (
                  <button
                    onClick={() => {
                      setMiscExpenseData({
                        supplierId: supplier.id,
                        supplierName: supplier.name,
                        description: '',
                        totalAmount: 0,
                        paidAmount: 0,
                        notes: ''
                      });
                      setShowMiscExpenseModal(true);
                    }}
                    className="flex-1 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-300 font-bold px-3 py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"
                  >
                    <Plus size={16} />
                    <span>إضافة مصروف</span>
                  </button>
                )}
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
                <button
                  onClick={() => openDetailsModal(supplier)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  title="التفاصيل"
                >
                  <Package size={16} />
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
                  <option value="READY">مورد بضاعة جاهزة</option>
                  <option value="MISCELLANEOUS">مصروفات متنوعة</option>
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
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">الخزينة الصادر منها المبلغ والسداد *</label>
                <select
                  value={paymentData.vaultId}
                  onChange={(e) => setPaymentData({ ...paymentData, vaultId: e.target.value })}
                  className="input-field font-bold text-gray-800 bg-blue-50 border-blue-300"
                  required
                >
                  <option value="">-- اختر الخزينة --</option>
                  {vaults.map((vault) => {
                    const icon = vault.type === 'CASH' ? '💵' : vault.type === 'VISA' ? '💳' : '📱';
                    return (
                      <option key={vault.id} value={vault.id}>
                        {icon} {vault.name} (الرصيد: {vault.balance?.toFixed(2) || '0.00'} ج.م)
                      </option>
                    );
                  })}
                </select>
                {paymentData.vaultId && (
                  <p className="text-xs text-gray-600 mt-1">
                    الرصيد الحالي المتوفر بالخزينة: {vaults.find(v => v.id === paymentData.vaultId)?.balance?.toFixed(2) || '0.00'} جنيه
                  </p>
                )}
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

      {/* Modal: تفاصيل المورد */}
      {showDetailsModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">تفاصيل المورد - {selectedSupplier.name}</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-600 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>

            {/* Fabric Purchases */}
            {selectedSupplier.type === 'FABRIC' && selectedSupplier.fabricPurchases && selectedSupplier.fabricPurchases.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-3">مشتريات القماش</h3>
                <div className="space-y-3">
                  {selectedSupplier.fabricPurchases.map((purchase) => {
                    const remaining = purchase.totalCost - purchase.paidAmount;
                    return (
                      <div key={purchase.id} className="border rounded-lg overflow-hidden bg-blue-50">
                        <div className="bg-blue-100 p-3 flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-5 gap-3">
                            <div>
                              <p className="text-xs text-gray-600">رقم الفاتورة</p>
                              <p className="font-bold text-sm">{purchase.invoiceNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">التاريخ</p>
                              <p className="text-sm">{new Date(purchase.purchaseDate).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">الإجمالي</p>
                              <p className="text-sm font-bold">{purchase.totalCost.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المدفوع</p>
                              <p className="text-sm text-green-700 font-bold">{purchase.paidAmount.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المتبقي</p>
                              <p className={`text-sm font-bold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {remaining.toFixed(2)} ج.م
                              </p>
                            </div>
                          </div>
                          {remaining <= 0 && (
                            <button
                              onClick={() => {
                                if (confirm(`حذف فاتورة القماش ${purchase.invoiceNumber}؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
                                  deleteCompletedFabricPurchaseMutation.mutate(purchase.id);
                                }
                              }}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center gap-1 mr-2"
                              title="حذف الفاتورة المكتملة"
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manufacturing Orders */}
            {selectedSupplier.type === 'MANUFACTURING' && selectedSupplier.manufacturingOrders && selectedSupplier.manufacturingOrders.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-3">أوامر التصنيع</h3>
                <div className="space-y-3">
                  {selectedSupplier.manufacturingOrders.map((order) => {
                    const totalCost = order.totalManufacturingCost || 0;
                    const remaining = totalCost - order.paidAmount;
                    return (
                      <div key={order.id} className="border rounded-lg overflow-hidden bg-purple-50">
                        <div className="bg-purple-100 p-3 flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-5 gap-3">
                            <div>
                              <p className="text-xs text-gray-600">رقم الأمر</p>
                              <p className="font-bold text-sm">{order.orderNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">التاريخ</p>
                              <p className="text-sm">{new Date(order.sentDate).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">الإجمالي</p>
                              <p className="text-sm font-bold">{totalCost.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المدفوع</p>
                              <p className="text-sm text-green-700 font-bold">{order.paidAmount.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المتبقي</p>
                              <p className={`text-sm font-bold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {remaining.toFixed(2)} ج.م
                              </p>
                            </div>
                          </div>
                          {remaining <= 0 && (
                            <button
                              onClick={() => {
                                if (confirm(`حذف أمر التصنيع ${order.orderNumber}؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
                                  deleteCompletedManufacturingOrderMutation.mutate(order.id);
                                }
                              }}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center gap-1 mr-2"
                              title="حذف الأمر المكتمل"
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Washing Orders */}
            {selectedSupplier.type === 'WASHING' && selectedSupplier.washingOrders && selectedSupplier.washingOrders.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-3">أوامر الغسيل</h3>
                <div className="space-y-3">
                  {selectedSupplier.washingOrders.map((order) => {
                    const totalCost = order.totalWashingCost || 0;
                    const remaining = totalCost - order.paidAmount;
                    return (
                      <div key={order.id} className="border rounded-lg overflow-hidden bg-cyan-50">
                        <div className="bg-cyan-100 p-3 flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-5 gap-3">
                            <div>
                              <p className="text-xs text-gray-600">رقم الأمر</p>
                              <p className="font-bold text-sm">{order.orderNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">التاريخ</p>
                              <p className="text-sm">{new Date(order.sentDate).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">الإجمالي</p>
                              <p className="text-sm font-bold">{totalCost.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المدفوع</p>
                              <p className="text-sm text-green-700 font-bold">{order.paidAmount.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المتبقي</p>
                              <p className={`text-sm font-bold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {remaining.toFixed(2)} ج.م
                              </p>
                            </div>
                          </div>
                          {remaining <= 0 && (
                            <button
                              onClick={() => {
                                if (confirm(`حذف أمر الغسيل ${order.orderNumber}؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
                                  deleteCompletedWashingOrderMutation.mutate(order.id);
                                }
                              }}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center gap-1 mr-2"
                              title="حذف الأمر المكتمل"
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ready Goods Purchases */}
            {(selectedSupplier.type === 'READY' || selectedSupplier.type === 'PURCHASE') && selectedSupplier.purchases && selectedSupplier.purchases.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-3 text-emerald-800">مشتريات البضاعة الجاهزة</h3>
                <div className="space-y-3">
                  {selectedSupplier.purchases.map((purchase) => {
                    const remaining = (purchase.totalAmount || 0) - (purchase.paidAmount || 0);
                    return (
                      <div key={purchase.id} className="border rounded-lg overflow-hidden bg-emerald-50">
                        <div className="bg-emerald-100 p-3 flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-5 gap-3">
                            <div>
                              <p className="text-xs text-gray-600">رقم الفاتورة</p>
                              <p className="font-bold text-sm">{purchase.invoiceNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">التاريخ</p>
                              <p className="text-sm">{new Date(purchase.purchaseDate).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">الإجمالي</p>
                              <p className="text-sm font-bold">{(purchase.totalAmount || 0).toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المدفوع</p>
                              <p className="text-sm text-green-700 font-bold">{(purchase.paidAmount || 0).toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المتبقي</p>
                              <p className={`text-sm font-bold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {remaining.toFixed(2)} ج.م
                              </p>
                            </div>
                          </div>
                        </div>
                        {purchase.items && purchase.items.length > 0 && (
                          <div className="p-3 bg-white border-t space-y-1">
                            {purchase.items.map((item, idx) => (
                              <div key={idx} className="text-xs flex justify-between text-gray-700">
                                <span>• {item.productName || item.product?.name || 'صنف جاهز'} ({item.quantity} قطعة)</span>
                                <span>سعر القطعة: {item.unitPrice} ج.م | الإجمالي: {(item.quantity * item.unitPrice).toFixed(2)} ج.م</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Miscellaneous Expenses */}
            {selectedSupplier.type === 'MISCELLANEOUS' && selectedSupplier.miscellaneousExpenses && selectedSupplier.miscellaneousExpenses.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-3 text-orange-800">المصروفات المتنوعة</h3>
                <div className="space-y-3">
                  {selectedSupplier.miscellaneousExpenses.map((expense) => {
                    const remaining = expense.totalAmount - expense.paidAmount;
                    return (
                      <div key={expense.id} className="border rounded-lg overflow-hidden bg-orange-50">
                        <div className="bg-orange-100 p-3 flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-5 gap-3">
                            <div>
                              <p className="text-xs text-gray-600">رقم المصروف</p>
                              <p className="font-bold text-sm">{expense.expenseNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">التاريخ</p>
                              <p className="text-sm">{new Date(expense.expenseDate).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">الإجمالي</p>
                              <p className="text-sm font-bold">{expense.totalAmount.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المدفوع</p>
                              <p className="text-sm text-green-700 font-bold">{expense.paidAmount.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المتبقي</p>
                              <p className={`text-sm font-bold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {remaining.toFixed(2)} ج.م
                              </p>
                            </div>
                          </div>
                          {remaining <= 0 && (
                            <button
                              onClick={() => {
                                if (confirm(`حذف المصروف ${expense.expenseNumber}؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
                                  deleteCompletedMiscExpenseMutation.mutate(expense.id);
                                }
                              }}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center gap-1 mr-2"
                              title="حذف المصروف المكتمل"
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                          )}
                        </div>
                        <div className="p-3 bg-white border-t">
                          <p className="text-sm text-gray-700"><span className="font-medium">الوصف:</span> {expense.description}</p>
                          {expense.notes && (
                            <p className="text-xs text-gray-600 mt-1"><span className="font-medium">ملاحظات:</span> {expense.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payments */}
            {selectedSupplier.payments && selectedSupplier.payments.length > 0 && (
              <div>
                <h3 className="font-bold mb-3">الدفعات</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-right text-sm">التاريخ</th>
                        <th className="p-3 text-right text-sm">المبلغ</th>
                        <th className="p-3 text-right text-sm">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSupplier.payments.map((payment) => (
                        <tr key={payment.id} className="border-t">
                          <td className="p-3 text-sm">{new Date(payment.paymentDate).toLocaleDateString('ar-EG')}</td>
                          <td className="p-3 text-sm font-bold text-green-700">{payment.amount.toFixed(2)} ج.م</td>
                          <td className="p-3 text-sm">{payment.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: شراء بضاعة جاهزة */}
      {showReadyPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl my-8">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">شراء بضاعة جاهزة</h2>
                <p className="text-xs text-gray-500">المورد: {readyPurchaseData.supplierName}</p>
              </div>
              <button 
                onClick={() => setShowReadyPurchaseModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!readyPurchaseData.productId) {
                toast.error('يرجى اختيار الصنف أولاً');
                return;
              }
              if (!readyPurchaseData.quantity || readyPurchaseData.quantity <= 0) {
                toast.error('يرجى إدخال كمية صحيحة');
                return;
              }
              if (!readyPurchaseData.unitCostPrice || readyPurchaseData.unitCostPrice <= 0) {
                toast.error('يرجى إدخال سعر القطعة');
                return;
              }

              const invoiceNumber = `READY-${Date.now().toString().slice(-6)}`;
              createReadyPurchaseMutation.mutate({
                invoiceNumber,
                supplierId: readyPurchaseData.supplierId,
                paidAmount: parseFloat(readyPurchaseData.paidAmount || 0),
                notes: readyPurchaseData.notes,
                items: [
                  {
                    productId: readyPurchaseData.productId,
                    productName: readyPurchaseData.productName,
                    quantity: parseInt(readyPurchaseData.quantity || 1),
                    unitPrice: parseFloat(readyPurchaseData.unitCostPrice || 0)
                  }
                ]
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اختر الصنف المراد شراؤه *</label>
                <select
                  value={readyPurchaseData.productId}
                  onChange={(e) => {
                    const selectedProd = productsList.find(p => p.id === e.target.value);
                    if (selectedProd) {
                      setReadyPurchaseData({
                        ...readyPurchaseData,
                        productId: selectedProd.id,
                        productName: selectedProd.name,
                        searchCode: selectedProd.sku || selectedProd.barcode || '',
                        unitCostPrice: selectedProd.costPrice || 0
                      });
                    } else {
                      setReadyPurchaseData({
                        ...readyPurchaseData,
                        productId: '',
                        productName: '',
                        searchCode: ''
                      });
                    }
                  }}
                  className="input-field mb-2"
                  required
                >
                  <option value="">-- اختر الصنف من القائمة --</option>
                  {productsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.barcode || 'بدون كود'}) - التكلفة الحالية: {p.costPrice || 0} ج.م
                    </option>
                  ))}
                </select>
              </div>

              {readyPurchaseData.productId && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm space-y-1">
                  <div className="font-bold text-emerald-900">{readyPurchaseData.productName}</div>
                  <div className="text-xs text-gray-600">الكود (SKU/Barcode): {readyPurchaseData.searchCode}</div>
                  <div className="text-xs text-blue-700 font-medium">⚠️ سيتم تحديث سعر التكلفة النهائي بهذا السعر الجديد في الأصناف ماستر</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">الكمية المطلوبة (قطع) *</label>
                  <input
                    type="number"
                    min="1"
                    value={readyPurchaseData.quantity}
                    onChange={(e) => setReadyPurchaseData({ ...readyPurchaseData, quantity: parseInt(e.target.value) || 0 })}
                    className="input-field font-bold text-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">سعر شراء القطعة (التكلفة) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={readyPurchaseData.unitCostPrice}
                    onChange={(e) => setReadyPurchaseData({ ...readyPurchaseData, unitCostPrice: parseFloat(e.target.value) || 0 })}
                    className="input-field font-bold text-lg text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <span className="text-sm font-bold">إجمالي الفاتورة:</span>
                <span className="text-lg font-bold text-blue-700">
                  {((readyPurchaseData.quantity || 0) * (readyPurchaseData.unitCostPrice || 0)).toFixed(2)} ج.م
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">المبلغ المدفوع كاش للمورد</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={(readyPurchaseData.quantity || 0) * (readyPurchaseData.unitCostPrice || 0)}
                  value={readyPurchaseData.paidAmount}
                  onChange={(e) => setReadyPurchaseData({ ...readyPurchaseData, paidAmount: parseFloat(e.target.value) || 0 })}
                  className="input-field font-bold text-green-700"
                />
                <p className="text-xs text-gray-500 mt-1">
                  المتبقي (دين على المحل للمورد): {(((readyPurchaseData.quantity || 0) * (readyPurchaseData.unitCostPrice || 0)) - (readyPurchaseData.paidAmount || 0)).toFixed(2)} ج.م
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات الفاتورة</label>
                <input
                  type="text"
                  value={readyPurchaseData.notes}
                  onChange={(e) => setReadyPurchaseData({ ...readyPurchaseData, notes: e.target.value })}
                  className="input-field"
                  placeholder="مثال: فاتورة شراء بضاعة جاهزة دُفعة أولى"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={createReadyPurchaseMutation.isPending}
                  className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700"
                >
                  {createReadyPurchaseMutation.isPending ? 'جاري الحفظ...' : 'حفظ الفاتورة وتحديث سعر التكلفة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReadyPurchaseModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: إضافة مصروف متنوع */}
      {showMiscExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl my-8">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">إضافة مصروف متنوع</h2>
                <p className="text-xs text-gray-500">المورد: {miscExpenseData.supplierName}</p>
              </div>
              <button 
                onClick={() => setShowMiscExpenseModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!miscExpenseData.description || miscExpenseData.description.trim() === '') {
                toast.error('يرجى إدخال وصف المصروف');
                return;
              }
              if (!miscExpenseData.totalAmount || miscExpenseData.totalAmount <= 0) {
                toast.error('يرجى إدخال المبلغ الإجمالي');
                return;
              }

              createMiscExpenseMutation.mutate({
                supplierId: miscExpenseData.supplierId,
                data: {
                  description: miscExpenseData.description,
                  totalAmount: parseFloat(miscExpenseData.totalAmount),
                  paidAmount: parseFloat(miscExpenseData.paidAmount || 0),
                  notes: miscExpenseData.notes
                }
              });
            }} className="space-y-4">

              <div>
                <label className="block text-sm font-medium mb-1">وصف المصروف *</label>
                <input
                  type="text"
                  value={miscExpenseData.description}
                  onChange={(e) => setMiscExpenseData({ ...miscExpenseData, description: e.target.value })}
                  className="input-field font-bold"
                  placeholder="مثال: صيانة، نقل، خدمات، مواد تغليف، إلخ"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">إجمالي قيمة المصروف *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={miscExpenseData.totalAmount}
                  onChange={(e) => setMiscExpenseData({ ...miscExpenseData, totalAmount: parseFloat(e.target.value) || 0 })}
                  className="input-field font-bold text-lg text-orange-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">المبلغ المدفوع كاش</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={miscExpenseData.totalAmount}
                  value={miscExpenseData.paidAmount}
                  onChange={(e) => setMiscExpenseData({ ...miscExpenseData, paidAmount: parseFloat(e.target.value) || 0 })}
                  className="input-field font-bold text-green-700"
                />
                <p className="text-xs text-gray-500 mt-1">
                  المتبقي (دين على المحل): {((miscExpenseData.totalAmount || 0) - (miscExpenseData.paidAmount || 0)).toFixed(2)} ج.م
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات</label>
                <textarea
                  value={miscExpenseData.notes}
                  onChange={(e) => setMiscExpenseData({ ...miscExpenseData, notes: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="تفاصيل إضافية عن المصروف"
                />
              </div>

              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">إجمالي المصروف:</span>
                  <span className="text-lg font-bold text-orange-700">
                    {(miscExpenseData.totalAmount || 0).toFixed(2)} ج.م
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">المتبقي (آجل):</span>
                  <span className="text-sm font-bold text-red-700">
                    {((miscExpenseData.totalAmount || 0) - (miscExpenseData.paidAmount || 0)).toFixed(2)} ج.م
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={createMiscExpenseMutation.isPending}
                  className="flex-1 btn-primary bg-orange-600 hover:bg-orange-700"
                >
                  {createMiscExpenseMutation.isPending ? 'جاري الحفظ...' : 'حفظ المصروف'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMiscExpenseModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
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
