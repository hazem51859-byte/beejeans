import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Package, CheckCircle, XCircle, ArrowLeftRight, Truck, Trash2, Eye, MapPin, User, FileText, AlertTriangle, Send, DollarSign, TrendingUp, Clock } from 'lucide-react';
import api, { transferAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

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
    items: [{ productId: '', quantity: 1, costPrice: 0, sellingPrice: 0 }],
    notes: '',
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
    onSuccess: () => {
      queryClient.invalidateQueries(['transfers']);
      queryClient.invalidateQueries(['pending-transfers-count']);
      queryClient.invalidateQueries(['source-inventory']);
      setShowReceiveModal(false);
      setSelectedTransfer(null);
      toast.success('تم استلام التوريد وإضافته لمخزن الفرع بنجاح 🎉');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما');
    },
  });

  const resetForm = () => {
    setFormData({
      fromBranchId: '',
      toBranchId: '',
      items: [{ productId: '', quantity: 1, costPrice: 0, sellingPrice: 0 }],
      notes: '',
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, costPrice: 0, sellingPrice: 0 }],
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === 'productId') {
      const p = products.find(prod => prod.id === value);
      if (p) {
        newItems[index].costPrice = p.costPrice || 0;
        newItems[index].sellingPrice = p.sellingPrice || 0;
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
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

      {/* Transfers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">رقم التوريد</th>
              <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">من</th>
              <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">إلى</th>
              <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">الأصناف</th>
              {isAdmin ? (
                <>
                  <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">تكلفة البضاعة</th>
                  <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">سعر البيع</th>
                  <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">المكسب المتوقع</th>
                </>
              ) : (
                <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">قيمة البضاعة</th>
              )}
              <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">الحالة</th>
              <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">التاريخ</th>
              <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredTransfers.map((transfer) => {
              const { totalSelling, totalCost, profit } = calculateTransferTotals(transfer);
              const isSenderBranch = transfer.fromBranchId === user?.branchId || (isAdmin && !transfer.fromBranchId);
              const isReceiverBranch = transfer.toBranchId === user?.branchId;

              return (
                <tr key={transfer.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap font-mono text-sm font-bold text-slate-900">{transfer.transferNumber}</td>
                  <td className="px-5 py-4 whitespace-nowrap font-semibold text-slate-700">{transfer.fromBranch?.name || 'المخزن الرئيسي'}</td>
                  <td className="px-5 py-4 whitespace-nowrap font-semibold text-slate-700">{transfer.toBranch?.name}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-medium">
                    {transfer.items?.length || 0} صنف ({transfer.items?.reduce((sum, i) => sum + (i.quantityRequested || 0), 0)} قطعة)
                  </td>
                  {isAdmin ? (
                    <>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-600">{totalCost.toLocaleString('ar-EG')} ج.م</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">{totalSelling.toLocaleString('ar-EG')} ج.م</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-teal-700">+{profit.toLocaleString('ar-EG')} ج.م</td>
                    </>
                  ) : (
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">{totalSelling.toLocaleString('ar-EG')} ج.م</td>
                  )}
                  <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(transfer.status)}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-slate-500">
                    {new Date(transfer.sentAt || transfer.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
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

                      <button
                        onClick={() => handleOpenDetailModal(transfer)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        title="عرض التفاصيل"
                      >
                        <Eye size={14} />
                        تفاصيل
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
                <label className="block text-sm font-bold text-slate-700 mb-2">الأصناف المطلوبة</label>
                <div className="space-y-3">
                  {formData.items.map((item, index) => {
                    const product = products.find(p => p.id === item.productId);
                    const inventory = sourceInventory.find(inv => inv.productId === item.productId);
                    const availableQty = inventory?.quantity || 0;

                    return (
                      <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <select
                              value={item.productId}
                              onChange={(e) => updateItem(index, 'productId', e.target.value)}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800"
                              required
                            >
                              <option value="">اختر المنتج</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-center"
                              placeholder="الكمية"
                              required
                            />
                          </div>
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-rose-600 hover:text-rose-800 p-2"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>

                        {product && (
                          <div className="flex justify-between items-center text-xs px-1 text-slate-600 font-semibold bg-white p-2 rounded-lg border border-slate-100">
                            <span>المتاح بمخزن المصدر: <strong className="text-emerald-700">{availableQty} قطعة</strong></span>
                            {isAdmin ? (
                              <span>
                                التكلفة: <strong className="text-slate-800">{item.costPrice} ج.م</strong> | البيع: <strong className="text-emerald-700">{item.sellingPrice} ج.م</strong>
                              </span>
                            ) : (
                              <span>سعر البيع للقطعة: <strong className="text-emerald-700">{item.sellingPrice} ج.م</strong></span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <button
                  type="button"
                  onClick={addItem}
                  className="text-emerald-600 hover:text-emerald-800 text-xs font-bold flex items-center gap-1 mt-3"
                >
                  <Plus size={16} />
                  إضافة صنف آخر
                </button>
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
                <h2 className="text-2xl font-black text-slate-900 mb-1">تفاصيل طلب التوريد</h2>
                <p className="font-mono text-xs text-slate-500 font-semibold">{selectedTransfer.transferNumber}</p>
              </div>
              <div>{getStatusBadge(selectedTransfer.status)}</div>
            </div>

            {/* Financial Summary Box */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {isAdmin ? (
                <>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">تكلفة البضاعة الإجمالية</p>
                    <p className="text-lg font-black text-slate-800">
                      {(selectedTransfer.totalCost || calculateTransferTotals(selectedTransfer).totalCost).toLocaleString('ar-EG')} ج.م
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-600 mb-0.5">سعر البيع الإجمالي</p>
                    <p className="text-lg font-black text-emerald-700">
                      {(selectedTransfer.totalSellingPrice || calculateTransferTotals(selectedTransfer).totalSelling).toLocaleString('ar-EG')} ج.م
                    </p>
                  </div>
                  <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200">
                    <p className="text-xs font-semibold text-teal-600 mb-0.5">المكسب المتوقع</p>
                    <p className="text-lg font-black text-teal-700">
                      +{(calculateTransferTotals(selectedTransfer).profit).toLocaleString('ar-EG')} ج.م
                    </p>
                  </div>
                </>
              ) : (
                <div className="col-span-3 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-600 mb-0.5">إجمالي قيمة البضاعة بسعر البيع</p>
                  <p className="text-xl font-black text-emerald-700">
                    {(selectedTransfer.totalSellingPrice || calculateTransferTotals(selectedTransfer).totalSelling).toLocaleString('ar-EG')} ج.م
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
              <h3 className="font-bold text-slate-900 mb-2 text-sm">تفاصيل الأصناف</h3>
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">المنتج</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">الكمية المشحونة</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">الكمية المستلمة</th>
                      {isAdmin ? (
                        <>
                          <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">التكلفة</th>
                          <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500">البيع</th>
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
                              <td className="px-4 py-2.5 text-xs font-semibold text-slate-600">{cost} ج.م</td>
                              <td className="px-4 py-2.5 text-xs font-bold text-emerald-600">{selling} ج.م</td>
                            </>
                          ) : (
                            <td className="px-4 py-2.5 text-xs font-bold text-emerald-600">{selling} ج.م</td>
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
