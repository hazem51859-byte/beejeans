import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Package, CheckCircle, XCircle, ArrowLeftRight, Truck, Trash2, Eye, MapPin, User, FileText, AlertTriangle, Send, DollarSign, TrendingUp, Clock } from 'lucide-react';
import api, { transferAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

// Helper function for clear currency formatting (Pounds + Piastres)
const formatMoney = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ج.م';
  const num = Number(amount);
  const pounds = Math.floor(Math.abs(num));
  const piastres = Math.round((Math.abs(num) - pounds) * 100);
  const formattedPounds = pounds.toLocaleString('en-US');
  
  const sign = num < 0 ? '-' : '';
  if (piastres > 0) {
    return `${sign}${formattedPounds}.${piastres.toString().padStart(2, '0')} ج.م`;
  }
  return `${sign}${formattedPounds} ج.م`;
};

export default function Transfers() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'all' : 'inbox');
  
  const [formData, setFormData] = useState({
    fromBranchId: '',
    toBranchId: '',
    items: [],
    notes: '',
  });

  const [currentItem, setCurrentItem] = useState({
    barcode: '',
    productId: '',
    quantity: 1,
    costPrice: 0,
    sellingPrice: 0
  });

  const [receiveForm, setReceiveForm] = useState({
    items: [],
    receiverNotes: '',
    hasDiscrepancy: false,
    discrepancyNotes: ''
  });

  // Queries
  const { data: transfersResponse, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      const response = await api.get('/transfers');
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

  const { data: productsResponse } = useQuery({
    queryKey: ['products-active'],
    queryFn: async () => {
      const response = await api.get('/products?status=ACTIVE');
      return response.data;
    },
  });

  const transfers = transfersResponse?.data || [];
  const branches = branchesResponse?.data || [];
  const products = productsResponse?.data || [];

  const mainBranchId = branches.find(b => b.code === 'MAIN')?.id;
  const sourceBranchId = formData.fromBranchId || mainBranchId;

  const { data: sourceInventoryResponse } = useQuery({
    queryKey: ['source-inventory', sourceBranchId],
    queryFn: async () => {
      const response = await api.get(`/inventory/branch/${sourceBranchId}`);
      return response.data;
    },
    enabled: !!sourceBranchId,
  });

  const sourceInventory = sourceInventoryResponse?.data || [];

  // Filter transfers based on active tab
  const filteredTransfers = transfers.filter(t => {
    if (activeTab === 'all') return true; // Admin: show all transfers
    if (activeTab === 'inbox') return t.toBranchId === user?.branchId && t.status !== 'DELIVERED';
    if (activeTab === 'outbox') {
      if (isAdmin) return t.sentBy === user?.id || t.fromBranchId === user?.branchId;
      return t.fromBranchId === user?.branchId;
    }
    if (activeTab === 'history') return t.status === 'DELIVERED';
    return false;
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/transfers', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transfers']);
      queryClient.invalidateQueries(['pending-transfers-count']);
      setShowCreateModal(false);
      resetForm();
      toast.success('تم إنشاء طلب التوريد بنجاح (في انتظار تأكيد الشحن)');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما');
    },
  });

  const confirmShippingMutation = useMutation({
    mutationFn: (transferId) => transferAPI.confirmShipping(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries(['transfers']);
      queryClient.invalidateQueries(['pending-transfers-count']);
      queryClient.invalidateQueries(['source-inventory']);
      toast.success('تم تأكيد الشحن وخصم الكمية من المخزن بنجاح 🚀');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل تأكيد الشحن');
    },
  });

  const receiveMutation = useMutation({
    mutationFn: ({ transferId, data }) => api.post(`/transfers/${transferId}/complete-receiving`, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['transfers']);
      queryClient.invalidateQueries(['pending-transfers-count']);
      queryClient.invalidateQueries(['source-inventory']);
      setShowReceiveModal(false);
      setSelectedTransfer(null);
      
      // Check for discrepancies and show appropriate message
      const { hasDiscrepancy, discrepancyType, message } = response.data;
      
      if (hasDiscrepancy) {
        if (discrepancyType === 'SHORTAGE') {
          toast.success(message || 'تم استلام التوريد مع وجود نقص في الكمية. تم تحديث المخزون والأرقام بناءً على الكمية المستلمة فعلياً.', {
            duration: 5000,
            icon: '⚠️'
          });
        } else {
          toast.success(message || 'تم استلام التوريد مع وجود زيادة في الكمية. تم تحديث المخزون والأرقام بناءً على الكمية المستلمة فعلياً.', {
            duration: 5000,
            icon: '⚠️'
          });
        }
      } else {
        toast.success('تم استلام التوريد وإضافته لمخزن الفرع بنجاح 🎉');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما');
    },
  });

  const resetForm = () => {
    setFormData({
      fromBranchId: '',
      toBranchId: '',
      items: [],
      notes: '',
    });
    setCurrentItem({
      barcode: '',
      productId: '',
      quantity: 1,
      costPrice: 0,
      sellingPrice: 0
    });
  };

  const handleBarcodeChange = (value) => {
    setCurrentItem({ ...currentItem, barcode: value });
  };

  const searchProductByBarcode = () => {
    const value = currentItem.barcode;
    console.log('🔍 Searching for:', value);
    console.log('📦 Total products:', products.length);
    
    if (value.length >= 3) {
      const product = products.find(p => {
        const barcode = String(p.barcode || '');
        const searchValue = value;
        // Exact match on barcode only
        return barcode === searchValue;
      });
      
      console.log('✅ Found product:', product);
      
      if (product) {
        const inventory = sourceInventory.find(inv => inv.productId === product.id);
        setCurrentItem({
          ...currentItem,
          productId: product.id,
          costPrice: product.costPrice || 0,
          sellingPrice: product.sellingPrice || 0
        });
        toast.success(`تم العثور على: ${product.name}`);
        // Focus on quantity input after finding product
        setTimeout(() => {
          document.getElementById('quantity-input-transfer')?.focus();
        }, 100);
      } else {
        toast.error('لم يتم العثور على المنتج');
      }
    }
  };

  const addItemToTransfer = () => {
    if (!currentItem.productId || currentItem.quantity <= 0) {
      toast.error('يرجى اختيار منتج وكمية صحيحة');
      return;
    }

    const product = products.find(p => p.id === currentItem.productId);
    const inventory = sourceInventory.find(inv => inv.productId === currentItem.productId);
    const availableQty = inventory?.quantity || 0;

    if (currentItem.quantity > availableQty) {
      toast.error(`الكمية المتاحة: ${availableQty} فقط`);
      return;
    }

    setFormData({
      ...formData,
      items: [...formData.items, {
        productId: currentItem.productId,
        quantity: parseInt(currentItem.quantity),
        costPrice: parseFloat(currentItem.costPrice || 0),
        sellingPrice: parseFloat(currentItem.sellingPrice || 0)
      }]
    });

    setCurrentItem({
      barcode: '',
      productId: '',
      quantity: 1,
      costPrice: 0,
      sellingPrice: 0
    });
  };



  const handleCreateSubmit = (e) => {
    e.preventDefault();
    
    // Validate that there are items
    if (!formData.items || formData.items.length === 0) {
      toast.error('يجب إضافة منتج واحد على الأقل');
      return;
    }
    
    createMutation.mutate({
      fromBranchId: formData.fromBranchId || mainBranchId,
      toBranchId: formData.toBranchId,
      notes: formData.notes,
      items: formData.items.map(item => ({
        productId: item.productId,
        quantity: parseInt(item.quantity),
        costPrice: parseFloat(item.costPrice || 0),
        sellingPrice: parseFloat(item.sellingPrice || 0),
      }))
    });
  };

  const handleOpenReceiveModal = (transfer) => {
    setSelectedTransfer(transfer);
    setReceiveForm({
      items: transfer.items.map(item => ({
        id: item.id,
        productId: item.productId,
        quantityRequested: item.quantityRequested || item.quantity,
        quantityReceived: item.quantityRequested || item.quantity
      })),
      receiverNotes: '',
      hasDiscrepancy: false,
      discrepancyNotes: ''
    });
    setShowReceiveModal(true);
  };

  const handleOpenDetailModal = (transfer) => {
    setSelectedTransfer(transfer);
    setShowDetailModal(true);
  };

  const handleReceiveSubmit = (e) => {
    e.preventDefault();
    receiveMutation.mutate({
      transferId: selectedTransfer.id,
      data: receiveForm
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { text: 'في انتظار الشحن', class: 'bg-amber-100 text-amber-800 border border-amber-300', icon: Clock },
      IN_TRANSIT: { text: 'تم الشحن (قيد النقل)', class: 'bg-blue-100 text-blue-800 border border-blue-300', icon: Truck },
      DELIVERED: { text: 'تم الاستلام', class: 'bg-emerald-100 text-emerald-800 border border-emerald-300', icon: CheckCircle },
      CANCELLED: { text: 'ملغي', class: 'bg-rose-100 text-rose-800 border border-rose-300', icon: XCircle }
    };
    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${badge.class}`}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  const getStatusStep = (status) => {
    const steps = ['PENDING', 'IN_TRANSIT', 'DELIVERED'];
    return steps.indexOf(status);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Financial calculations
  const calculateTransferTotals = (transfer) => {
    const totalSelling = transfer.totalSellingPrice || transfer.items?.reduce((sum, i) => 
      sum + ((i.sellingPrice || i.product?.sellingPrice || 0) * (i.quantityRequested || 0)), 0) || 0;
    
    const totalCost = transfer.totalCost || transfer.items?.reduce((sum, i) => 
      sum + ((i.costPrice || i.product?.costPrice || 0) * (i.quantityRequested || 0)), 0) || 0;

    const profit = totalSelling - totalCost;
    return { totalSelling, totalCost, profit };
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen font-bold text-slate-600">جاري التحميل...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة التوريدات</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">متابعة التوريدات وشحن واستلام البضاعة بين الفروع والمصنع</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
          >
            <Plus size={20} />
            إنشاء توريد جديد
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-200/70 p-1.5 rounded-2xl w-fit">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'all' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            الكل ({transfers.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'inbox' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          الواردة (تأكيد الاستلام)
        </button>
        <button
          onClick={() => setActiveTab('outbox')}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'outbox' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          الصادرة (تأكيد الشحن)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'history' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          السجل المكتمل
        </button>
      </div>

      {/* Transfers Table with Horizontal Scroll Support */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-x-auto">
        <table className="w-full min-w-[1000px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">رقم التوريد</th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">من</th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">إلى</th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">الأصناف</th>
              {isAdmin ? (
                <>
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">تكلفة البضاعة</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">سعر البيع</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">المكسب المتوقع</th>
                </>
              ) : (
                <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">قيمة البضاعة</th>
              )}
              <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">الحالة</th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase whitespace-nowrap">التاريخ</th>
              <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 uppercase whitespace-nowrap">إجراءات والتفاصيل</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredTransfers.map((transfer) => {
              const { totalSelling, totalCost, profit } = calculateTransferTotals(transfer);
              const isSenderBranch = transfer.fromBranchId === user?.branchId || (isAdmin && !transfer.fromBranchId);
              const isReceiverBranch = transfer.toBranchId === user?.branchId;

              return (
                <tr key={transfer.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 whitespace-nowrap font-mono text-sm font-bold text-slate-900">{transfer.transferNumber}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-700">{transfer.fromBranch?.name || 'المخزن الرئيسي'}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-700">{transfer.toBranch?.name}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium">
                    {transfer.items?.length || 0} صنف ({transfer.items?.reduce((sum, i) => sum + (i.quantityRequested || 0), 0)} قطعة)
                  </td>
                  {isAdmin ? (
                    <>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-slate-600" dir="ltr">
                        {formatMoney(totalCost)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-emerald-600" dir="ltr">
                        {formatMoney(totalSelling)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-teal-700" dir="ltr">
                        +{formatMoney(profit)}
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-emerald-600" dir="ltr">
                      {formatMoney(totalSelling)}
                    </td>
                  )}
                  <td className="px-4 py-3.5 whitespace-nowrap">{getStatusBadge(transfer.status)}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-600 dir-rtl">
                    {new Date(transfer.sentAt || transfer.createdAt).toLocaleDateString('ar-EG', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Step 1: Sender confirms shipping */}
                      {transfer.status === 'PENDING' && (isSenderBranch || isAdmin) && (
                        <button
                          onClick={() => confirmShippingMutation.mutate(transfer.id)}
                          disabled={confirmShippingMutation.isLoading}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                          title="تأكيد خروج البضاعة والشحن للفرع الآخر"
                        >
                          <Send size={14} />
                          تأكيد الشحن
                        </button>
                      )}

                      {/* Step 2: Receiver confirms receipt */}
                      {transfer.status === 'IN_TRANSIT' && (isReceiverBranch || isAdmin) && (
                        <button
                          onClick={() => handleOpenReceiveModal(transfer)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                          title="تأكيد وصول البضاعة وإضافتها للمخزن"
                        >
                          <CheckCircle size={14} />
                          تأكيد الاستلام
                        </button>
                      )}

                      {/* Prominent Details Button for Admin and Branch */}
                      <button
                        onClick={() => handleOpenDetailModal(transfer)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        title="عرض كامل التفاصيل ومتابعة الشحنة"
                      >
                        <Eye size={15} className="text-indigo-600" />
                        تفاصيل الشحنة
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredTransfers.length === 0 && (
          <div className="text-center py-16 text-slate-400 font-semibold">
            لا توجد توريدات في هذا القسم حالياً
          </div>
        )}
      </div>

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl my-8 shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black text-slate-900 mb-1">إنشاء طلب توريد جديد</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">سيتم إنشاء الطلب وتنبيه الفرع المُرسل لتأكيد خروج البضاعة</p>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">من الفرع (المُرسل) *</label>
                  <select
                    value={formData.fromBranchId}
                    onChange={(e) => setFormData({ ...formData, fromBranchId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">المخزن الرئيسي</option>
                    {branches.filter(b => b.code !== 'MAIN').map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">إلى الفرع (المستقبل) *</label>
                  <select
                    value={formData.toBranchId}
                    onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                    required
                  >
                    <option value="">اختر الفرع المستلم</option>
                    {branches.filter(b => b.code !== 'MAIN' && b.id !== formData.fromBranchId).map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">إضافة منتج للتوريد</label>
                
                {/* Barcode Input Section */}
                <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-200 mb-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">الكود / الباركود</label>
                      <input
                        type="text"
                        value={currentItem.barcode}
                        onChange={(e) => handleBarcodeChange(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            searchProductByBarcode();
                          }
                        }}
                        className="w-full border-2 border-emerald-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                        placeholder="اكتب أو امسح الباركود واضغط Enter..."
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">الكمية</label>
                      <input
                        id="quantity-input-transfer"
                        type="number"
                        min="1"
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.target.select()}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addItemToTransfer();
                          }
                        }}
                        className="w-full border-2 border-emerald-300 rounded-lg px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Product Preview */}
                  {currentItem.productId && (() => {
                    const product = products.find(p => p.id === currentItem.productId);
                    const inventory = sourceInventory.find(inv => inv.productId === currentItem.productId);
                    const availableQty = inventory?.quantity || 0;
                    
                    return product ? (
                      <div className="mt-3 bg-white p-3 rounded-lg border border-emerald-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500">الكود: {product.barcode}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            availableQty >= currentItem.quantity ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            متاح: {availableQty}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-600">
                          <span>التكلفة: <strong>{formatMoney(currentItem.costPrice)}</strong></span>
                          <span>البيع: <strong className="text-emerald-700">{formatMoney(currentItem.sellingPrice)}</strong></span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <button
                    type="button"
                    onClick={addItemToTransfer}
                    disabled={!currentItem.productId}
                    className="mt-3 w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    إضافة للتوريد
                  </button>
                </div>

                {/* Added Items List */}
                {formData.items.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600">المنتجات المضافة ({formData.items.length})</label>
                    {formData.items.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      const inventory = sourceInventory.find(inv => inv.productId === item.productId);
                      const availableQty = inventory?.quantity || 0;

                      return (
                        <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-sm">{product?.name}</p>
                            <p className="text-xs text-slate-500">الكمية: <strong>{item.quantity}</strong> | المتاح: {availableQty}</p>
                          </div>
                          <div className="text-right text-xs">
                            {isAdmin ? (
                              <>
                                <p className="text-slate-600">التكلفة: <strong>{formatMoney(item.costPrice)}</strong></p>
                                <p className="text-emerald-700 font-bold">البيع: {formatMoney(item.sellingPrice)}</p>
                              </>
                            ) : (
                              <p className="text-emerald-700 font-bold">{formatMoney(item.sellingPrice)}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                items: formData.items.filter((_, i) => i !== index)
                              });
                            }}
                            className="text-rose-600 hover:text-rose-800 p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">ملاحظات التوريد</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm"
                  rows="2"
                  placeholder="أي تعليمات أو ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                >
                  {createMutation.isLoading ? 'جاري الإنشاء...' : 'إرسال طلب التوريد'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Transfer Modal */}
      {showReceiveModal && selectedTransfer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl my-8 shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black text-slate-900 mb-1">تأكيد استلام التوريد</h2>
            <p className="text-xs text-slate-500 mb-4 font-medium">قم بمراجعة الكميات الواصلة وتأكيد إضافتها لمخزون الفرع</p>
            
            <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200/80 text-sm space-y-1 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم التوريد:</span>
                <span className="font-mono font-bold text-slate-900">{selectedTransfer.transferNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">من فرع:</span>
                <span className="font-bold text-slate-800">{selectedTransfer.fromBranch?.name || 'المخزن الرئيسي'}</span>
              </div>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">الكميات المستلمة فعلياً</label>
                <div className="space-y-2">
                  {receiveForm.items.map((item, index) => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <div key={index} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 text-sm">{product?.name}</p>
                          <p className="text-xs text-slate-500 font-semibold">المطلوب المشحون: {item.quantityRequested} قطعة</p>
                        </div>
                        <div className="w-32">
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">المستلم الفعلي</label>
                          <input
                            type="number"
                            min="0"
                            value={item.quantityReceived}
                            onChange={(e) => {
                              const newItems = [...receiveForm.items];
                              newItems[index].quantityReceived = parseInt(e.target.value) || 0;
                              setReceiveForm({ ...receiveForm, items: newItems });
                            }}
                            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-center"
                            required
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات المستلم</label>
                <textarea
                  value={receiveForm.receiverNotes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, receiverNotes: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm"
                  rows="2"
                  placeholder="أي ملاحظات حول حالة الشحنة..."
                />
              </div>

              {/* Auto Discrepancies Alert */}
              {receiveForm.items.some(item => item.quantityReceived !== item.quantityRequested) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h3 className="font-bold text-amber-900 text-sm mb-1">⚠️ تم اكتشاف فروقات في الكميات:</h3>
                  {receiveForm.items.map((item, index) => {
                    const product = products.find(p => p.id === item.productId);
                    const diff = item.quantityReceived - item.quantityRequested;
                    if (diff === 0) return null;
                    
                    return (
                      <div key={index} className="text-xs font-semibold text-amber-800">
                        • {product?.name}: {diff > 0 ? `+${diff} زيادة (ستضاف لمخزنكم)` : `${diff} نقص (سترجع للمصدر)`}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={receiveMutation.isLoading}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                >
                  {receiveMutation.isLoading ? 'جاري التحديث...' : 'تأكيد الاستلام وإضافة للمخزون'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-6 bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTransfer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl my-8 shadow-2xl border border-slate-100">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-1">تفاصيل طلب التوريد للشحنة</h2>
                <p className="font-mono text-xs text-slate-500 font-semibold">{selectedTransfer.transferNumber}</p>
              </div>
              <div>{getStatusBadge(selectedTransfer.status)}</div>
            </div>

            {/* Discrepancy Warning Banner */}
            {selectedTransfer.hasDiscrepancy && (
              <div className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={24} />
                  <div className="flex-1">
                    <h3 className="text-base font-black text-amber-900 mb-2">
                      ⚠️ تنبيه: يوجد فروقات في الكميات المستلمة
                    </h3>
                    <p className="text-sm font-semibold text-amber-800 mb-3">
                      {selectedTransfer.discrepancyType === 'SHORTAGE' 
                        ? '🔻 نقص في الكمية المستلمة - تم إرجاع الفرق للمخزن المصدر'
                        : '🔺 زيادة في الكمية المستلمة - تم تعديل المخازن'}
                    </p>
                    <div className="space-y-2">
                      {selectedTransfer.items?.map((item) => {
                        const requested = item.quantityRequested;
                        const received = item.quantityReceived;
                        const diff = received - requested;
                        
                        if (diff !== 0) {
                          return (
                            <div key={item.id} className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-white/60 rounded-lg p-2.5 border border-amber-200">
                              <span className="font-black">{item.product?.name}</span>
                              <span className="text-amber-600">•</span>
                              <span>المطلوب: {requested}</span>
                              <span className="text-amber-600">←</span>
                              <span>المستلم: {received}</span>
                              <span className={`font-black ${diff > 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                ({diff > 0 ? '+' : ''}{diff})
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    {selectedTransfer.discrepancyNotes && (
                      <div className="mt-3 pt-3 border-t border-amber-200">
                        <p className="text-xs font-semibold text-amber-700">
                          <span className="font-black">ملاحظات:</span> {selectedTransfer.discrepancyNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary Box */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {isAdmin ? (
                <>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">تكلفة البضاعة الإجمالية</p>
                    <p className="text-lg font-black text-slate-800" dir="ltr">
                      {formatMoney(selectedTransfer.totalCost || calculateTransferTotals(selectedTransfer).totalCost)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-600 mb-0.5">سعر البيع الإجمالي</p>
                    <p className="text-lg font-black text-emerald-700" dir="ltr">
                      {formatMoney(selectedTransfer.totalSellingPrice || calculateTransferTotals(selectedTransfer).totalSelling)}
                    </p>
                  </div>
                  <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200">
                    <p className="text-xs font-semibold text-teal-600 mb-0.5">المكسب المتوقع</p>
                    <p className="text-lg font-black text-teal-700" dir="ltr">
                      +{formatMoney(calculateTransferTotals(selectedTransfer).profit)}
                    </p>
                  </div>
                </>
              ) : (
                <div className="col-span-3 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-600 mb-0.5">إجمالي قيمة البضاعة بسعر البيع</p>
                  <p className="text-xl font-black text-emerald-700" dir="ltr">
                    {formatMoney(selectedTransfer.totalSellingPrice || calculateTransferTotals(selectedTransfer).totalSelling)}
                  </p>
                </div>
              )}
            </div>

            {/* Status Timeline */}
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-5 right-5 left-5 h-1 bg-slate-200 rounded"></div>
                <div 
                  className="absolute top-5 right-5 h-1 bg-emerald-500 rounded transition-all"
                  style={{ 
                    width: selectedTransfer.status === 'CANCELLED' ? '0%' :
                           selectedTransfer.status === 'PENDING' ? '0%' : 
                           selectedTransfer.status === 'IN_TRANSIT' ? '50%' : '100%' 
                  }}
                ></div>
                
                {[
                  { key: 'PENDING', label: 'طلب التوريد', icon: FileText, date: selectedTransfer.createdAt },
                  { key: 'IN_TRANSIT', label: 'تم الشحن والخروج', icon: Truck, date: selectedTransfer.sentAt },
                  { key: 'DELIVERED', label: 'تم الاستلام بالمخزن', icon: CheckCircle, date: selectedTransfer.receivedAt }
                ].map((step) => {
                  const currentStep = getStatusStep(selectedTransfer.status);
                  const isActive = getStatusStep(step.key) <= currentStep && selectedTransfer.status !== 'CANCELLED';
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center z-10 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        isActive ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <p className={`text-xs mt-2 font-bold ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                      {step.date && isActive && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(step.date)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <h3 className="font-bold text-slate-900 mb-2 text-sm">تفاصيل الأصناف المشحونة</h3>
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">المنتج</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">الكمية المشحونة</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">الكمية المستلمة</th>
                      {isAdmin ? (
                        <>
                          <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">التكلفة للقطعة</th>
                          <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">البيع للقطعة</th>
                        </>
                      ) : (
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">سعر القطعة</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {selectedTransfer.items?.map((item) => {
                      const cost = item.costPrice || item.product?.costPrice || 0;
                      const selling = item.sellingPrice || item.product?.sellingPrice || 0;

                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-2.5 text-xs font-bold text-slate-800">
                            {item.product?.name}
                            <span className="block text-[10px] font-normal text-slate-400">{item.product?.sku}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs font-bold text-slate-700">{item.quantityRequested} قطعة</td>
                          <td className="px-4 py-2.5 text-xs font-bold text-emerald-700">
                            {item.quantityReceived != null ? `${item.quantityReceived} قطعة` : '-'}
                          </td>
                          {isAdmin ? (
                            <>
                              <td className="px-4 py-2.5 text-xs font-semibold text-slate-600" dir="ltr">{formatMoney(cost)}</td>
                              <td className="px-4 py-2.5 text-xs font-bold text-emerald-600" dir="ltr">{formatMoney(selling)}</td>
                            </>
                          ) : (
                            <td className="px-4 py-2.5 text-xs font-bold text-emerald-600" dir="ltr">{formatMoney(selling)}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedTransfer(null); }}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold hover:bg-slate-300 transition-all text-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
