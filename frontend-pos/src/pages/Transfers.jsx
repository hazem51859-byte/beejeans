import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Package, CheckCircle, XCircle, ArrowLeftRight, Truck, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Transfers() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');
  
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
    if (activeTab === 'inbox') return t.toBranchId === user?.branchId && t.status !== 'DELIVERED';
    if (activeTab === 'outbox') return t.fromBranchId === user?.branchId && t.status !== 'DELIVERED';
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
                  {transfer.status === 'PENDING' && activeTab === 'inbox' && (
                    <button
                      onClick={() => handleOpenReceiveModal(transfer)}
                      className="text-green-600 hover:text-green-900 text-sm"
                    >
                      استلام
                    </button>
                  )}
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
    </div>
  );
}
