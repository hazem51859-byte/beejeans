import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Package, CheckCircle, XCircle, ArrowLeftRight, Truck, Trash2, Eye, Clock, MapPin, User, FileText, AlertTriangle } from 'lucide-react';
import api from '../services/api';
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
    items: [{ productId: '', quantity: 1 }],
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
      // For admin, show transfers they sent (by user id) OR from their branch
      if (isAdmin) return t.sentBy === user?.id || t.fromBranchId === user?.branchId;
      return t.fromBranchId === user?.branchId && t.status !== 'DELIVERED';
    }
    if (activeTab === 'history') return t.status === 'DELIVERED';
    return false;
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/transfers', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transfers']);
      setShowCreateModal(false);
      resetForm();
      toast.success('تم إنشاء طلب التوريد بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما');
    },
  });

  const receiveMutation = useMutation({
    mutationFn: ({ transferId, data }) => api.post(`/transfers/${transferId}/complete-receiving`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transfers']);
      queryClient.invalidateQueries(['source-inventory']);
      setShowReceiveModal(false);
      setSelectedTransfer(null);
      toast.success('تم استلام التوريد بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما');
    },
  });

  const resetForm = () => {
    setFormData({
      fromBranchId: '',
      toBranchId: '',
      items: [{ productId: '', quantity: 1 }],
      notes: '',
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1 }],
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
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
        quantity: parseInt(item.quantity)
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
    
    console.log('Submitting receive form:', {
      transferId: selectedTransfer.id,
      data: receiveForm
    });
    
    receiveMutation.mutate({
      transferId: selectedTransfer.id,
      data: receiveForm
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { text: 'قيد الانتظار', class: 'bg-yellow-100 text-yellow-800', icon: Package },
      IN_TRANSIT: { text: 'قيد النقل', class: 'bg-blue-100 text-blue-800', icon: Truck },
      DELIVERED: { text: 'تم التسليم', class: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { text: 'ملغي', class: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.class}`}>
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">التوريدات</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            إنشاء توريد جديد
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            الكل
          </button>
        )}
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'inbox' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          الواردة
        </button>
        <button
          onClick={() => setActiveTab('outbox')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'outbox' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          الصادرة
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          السجل
        </button>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم التوريد</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">من</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إلى</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأصناف</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransfers.map((transfer) => (
              <tr key={transfer.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap font-mono text-sm">{transfer.transferNumber}</td>
                <td className="px-4 py-4 whitespace-nowrap">{transfer.fromBranch?.name || 'المخزن الرئيسي'}</td>
                <td className="px-4 py-4 whitespace-nowrap">{transfer.toBranch?.name}</td>
                <td className="px-4 py-4">
                  {transfer.items?.length || 0} صنف
                </td>
                <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(transfer.status)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {new Date(transfer.sentAt).toLocaleDateString('ar-EG')}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {transfer.status === 'PENDING' && activeTab === 'inbox' && (
                      <button
                        onClick={() => handleOpenReceiveModal(transfer)}
                        className="text-green-600 hover:text-green-900 text-sm"
                      >
                        استلام
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenDetailModal(transfer)}
                      className="text-blue-600 hover:text-blue-900 text-sm flex items-center gap-1"
                      title="عرض التفاصيل"
                    >
                      <Eye size={16} />
                      تفاصيل
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTransfers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            لا توجد توريدات في هذا القسم
          </div>
        )}
      </div>

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8">
            <h2 className="text-2xl font-bold mb-4">إنشاء توريد جديد</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">من الفرع *</label>
                  <select
                    value={formData.fromBranchId}
                    onChange={(e) => setFormData({ ...formData, fromBranchId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">المخزن الرئيسي</option>
                    {branches.filter(b => b.code !== 'MAIN').map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">إلى الفرع *</label>
                  <select
                    value={formData.toBranchId}
                    onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">اختر الفرع</option>
                    {branches.filter(b => b.code !== 'MAIN' && b.id !== formData.fromBranchId).map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-semibold">الأصناف</label>
                {formData.items.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  const inventory = sourceInventory.find(inv => inv.productId === item.productId);
                  const availableQty = inventory?.quantity || 0;

                  return (
                    <div key={index} className="flex gap-2 mb-2 items-start">
                      <div className="flex-1">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(index, 'productId', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          required
                        >
                          <option value="">اختر المنتج</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {product.sku}
                            </option>
                          ))}
                        </select>
                        {product && (
                          <p className="text-xs text-gray-500 mt-1">
                            متاح: {availableQty} قطعة
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="w-24 border border-gray-300 rounded-lg px-4 py-2"
                        placeholder="الكمية"
                        required
                      />
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addItem}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mt-2"
                >
                  <Plus size={16} />
                  إضافة صنف
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows="2"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  disabled={createMutation.isLoading}
                >
                  {createMutation.isLoading ? 'جاري الإنشاء...' : 'إنشاء التوريد'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
            <h2 className="text-2xl font-bold mb-4">استلام التوريد</h2>
            <div className="bg-gray-100 p-3 rounded-lg mb-4">
              <div className="flex justify-between mb-1">
                <span>رقم التوريد:</span>
                <span className="font-mono">{selectedTransfer.transferNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>من:</span>
                <span>{selectedTransfer.fromBranch?.name || 'المخزن الرئيسي'}</span>
              </div>
            </div>

            <form onSubmit={handleReceiveSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-semibold">الأصناف المستلمة</label>
                {receiveForm.items.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={index} className="flex gap-2 mb-2 items-center border-b pb-2">
                      <div className="flex-1">
                        <p className="font-medium">{product?.name}</p>
                        <p className="text-xs text-gray-500">المطلوب: {item.quantityRequested}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">الكمية المستلمة</label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantityReceived}
                          onChange={(e) => {
                            const newItems = [...receiveForm.items];
                            newItems[index].quantityReceived = parseInt(e.target.value);
                            setReceiveForm({ ...receiveForm, items: newItems });
                          }}
                          className="w-24 border border-gray-300 rounded-lg px-4 py-2"
                          required
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">ملاحظات</label>
                <textarea
                  value={receiveForm.receiverNotes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, receiverNotes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows="2"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              {/* Auto-calculated discrepancies */}
              {receiveForm.items.some(item => item.quantityReceived !== item.quantityRequested) && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-bold text-yellow-900 mb-2">⚠️ فروقات تم اكتشافها:</h3>
                  {receiveForm.items.map((item, index) => {
                    const product = products.find(p => p.id === item.productId);
                    const diff = item.quantityReceived - item.quantityRequested;
                    if (diff === 0) return null;
                    
                    return (
                      <div key={index} className="text-sm mb-1">
                        <span className="font-medium">{product?.name}:</span>
                        {diff > 0 ? (
                          <span className="text-green-700"> +{diff} قطعة (زيادة - ستُضاف للفرع)</span>
                        ) : (
                          <span className="text-red-700"> {diff} قطعة (نقص - سترجع للمخزن الرئيسي)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  disabled={receiveMutation.isLoading}
                >
                  {receiveMutation.isLoading ? 'جاري الاستلام...' : 'تأكيد الاستلام'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Detail Modal */}
      {showDetailModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">تفاصيل التوريد</h2>
                <p className="font-mono text-gray-500">{selectedTransfer.transferNumber}</p>
              </div>
              <div>{getStatusBadge(selectedTransfer.status)}</div>
            </div>

            {/* Status Timeline */}
            <div className="mb-6">
              <div className="flex items-center justify-between relative">
                {/* Progress bar background */}
                <div className="absolute top-5 right-5 left-5 h-1 bg-gray-200 rounded"></div>
                {/* Progress bar fill */}
                <div 
                  className="absolute top-5 right-5 h-1 bg-blue-500 rounded transition-all"
                  style={{ 
                    width: selectedTransfer.status === 'CANCELLED' ? '0%' :
                           selectedTransfer.status === 'PENDING' ? '0%' : 
                           selectedTransfer.status === 'IN_TRANSIT' ? '50%' : '100%' 
                  }}
                ></div>
                
                {[
                  { key: 'PENDING', label: 'تم الإنشاء', icon: FileText, date: selectedTransfer.createdAt },
                  { key: 'IN_TRANSIT', label: 'قيد النقل', icon: Truck, date: selectedTransfer.sentAt },
                  { key: 'DELIVERED', label: 'تم الاستلام', icon: CheckCircle, date: selectedTransfer.receivedAt }
                ].map((step, idx) => {
                  const currentStep = getStatusStep(selectedTransfer.status);
                  const isActive = getStatusStep(step.key) <= currentStep && selectedTransfer.status !== 'CANCELLED';
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center z-10 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                        <Icon size={20} />
                      </div>
                      <p className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-700' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {step.date && isActive && (
                        <p className="text-xs text-gray-400 mt-1">{formatDate(step.date)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transfer Info Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MapPin size={16} />
                  <span className="text-sm font-medium">من</span>
                </div>
                <p className="font-semibold">{selectedTransfer.fromBranch?.name || 'المخزن الرئيسي'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MapPin size={16} />
                  <span className="text-sm font-medium">إلى</span>
                </div>
                <p className="font-semibold">{selectedTransfer.toBranch?.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <User size={16} />
                  <span className="text-sm font-medium">المُرسل</span>
                </div>
                <p className="font-semibold">{selectedTransfer.sentByUser?.fullName || selectedTransfer.sentByUser?.username || '-'}</p>
                <p className="text-xs text-gray-400">{formatDate(selectedTransfer.sentAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <User size={16} />
                  <span className="text-sm font-medium">المُستلم</span>
                </div>
                {selectedTransfer.receivedByUser ? (
                  <>
                    <p className="font-semibold">{selectedTransfer.receivedByUser?.fullName || selectedTransfer.receivedByUser?.username}</p>
                    <p className="text-xs text-gray-400">{formatDate(selectedTransfer.receivedAt)}</p>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">لم يتم الاستلام بعد</p>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedTransfer.notes && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 font-medium mb-1">ملاحظات الإرسال:</p>
                <p className="text-sm">{selectedTransfer.notes}</p>
              </div>
            )}
            {selectedTransfer.receiverNotes && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 font-medium mb-1">ملاحظات المُستلم:</p>
                <p className="text-sm">{selectedTransfer.receiverNotes}</p>
              </div>
            )}

            {/* Discrepancy Alert */}
            {selectedTransfer.hasDiscrepancy && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-red-600" />
                  <h3 className="font-bold text-red-800">يوجد فروقات في الاستلام</h3>
                </div>
                {selectedTransfer.discrepancyType && (
                  <p className="text-sm text-red-700 mb-1">
                    النوع: {selectedTransfer.discrepancyType === 'SHORTAGE' ? 'نقص' : 'زيادة'}
                  </p>
                )}
                {selectedTransfer.discrepancyNotes && (
                  <p className="text-sm text-red-700">{selectedTransfer.discrepancyNotes}</p>
                )}
              </div>
            )}

            {/* Items Table */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3">الأصناف</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المنتج</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الكمية المطلوبة</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الكمية المستلمة</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الفرق</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedTransfer.items?.map((item) => {
                      const diff = item.quantityReceived != null 
                        ? item.quantityReceived - (item.quantityRequested || 0) 
                        : null;
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm">
                            <p className="font-medium">{item.product?.name || '-'}</p>
                            <p className="text-xs text-gray-400">{item.product?.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{item.quantityRequested || '-'}</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {item.quantityReceived != null ? item.quantityReceived : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {diff != null ? (
                              <span className={`font-bold ${
                                diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'
                              }`}>
                                {diff === 0 ? '✓ مطابق' : diff > 0 ? `+${diff} زيادة` : `${diff} نقص`}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getStatusBadge(item.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary for delivered transfers */}
            {selectedTransfer.status === 'DELIVERED' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={18} className="text-green-600" />
                  <h3 className="font-bold text-green-800">ملخص الاستلام</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">إجمالي المطلوب</p>
                    <p className="font-bold text-lg">
                      {selectedTransfer.items?.reduce((sum, i) => sum + (i.quantityRequested || 0), 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">إجمالي المستلم</p>
                    <p className="font-bold text-lg">
                      {selectedTransfer.items?.reduce((sum, i) => sum + (i.quantityReceived || 0), 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">الفرق الكلي</p>
                    {(() => {
                      const totalDiff = selectedTransfer.items?.reduce((sum, i) => 
                        sum + ((i.quantityReceived || 0) - (i.quantityRequested || 0)), 0);
                      return (
                        <p className={`font-bold text-lg ${
                          totalDiff === 0 ? 'text-green-600' : totalDiff > 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {totalDiff === 0 ? '✓ مطابق' : totalDiff > 0 ? `+${totalDiff}` : totalDiff}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedTransfer(null); }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
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
