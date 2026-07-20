import { useState, useRef, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Package, CheckCircle, XCircle, Scan, AlertCircle, ArrowLeftRight, Truck, Check } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Transfers() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false); // Can be send scan or receive scan
  const [scanType, setScanType] = useState('send'); // 'send' or 'receive'
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  
  const [barcode, setBarcode] = useState('');
  const [scannedLogs, setScannedLogs] = useState([]); // List of scanned items in current session
  const [receiveCategoryId, setReceiveCategoryId] = useState('');
  const [receiveColor, setReceiveColor] = useState('');
  const [barcodeInputMode, setBarcodeInputMode] = useState('scanner'); // 'scanner' | 'manual'
  const barcodeInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'outbox', 'history'
  
  // States for discrepancy notes
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [finalNotes, setFinalNotes] = useState({
    receiverNotes: '',
    hasDiscrepancy: false,
    discrepancyType: '', // SHORTAGE or EXCESS
    discrepancyNotes: ''
  });

  const [formData, setFormData] = useState({
    fromBranchId: '',
    toBranchId: '',
    items: [{ categoryId: '', quantity: 1, color: '', availableQty: 0 }],
    notes: '',
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

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
  });

  const transfers = transfersResponse?.data || [];
  const branches = branchesResponse?.data || [];
  const categories = categoriesResponse?.data || [];

  const currentTransfer = transfers.find(t => t.id === selectedTransfer?.id) || selectedTransfer;

  const mainBranchId = branches.find(b => b.code === 'MAIN')?.id;
  const sourceBranchId = formData.fromBranchId || mainBranchId;

  const { data: sourceInventoryResponse } = useQuery({
    queryKey: ['source-inventory', sourceBranchId],
    queryFn: async () => {
      const response = await api.get(`/inventory/branch/${sourceBranchId}`, { params: { limit: 500 } });
      return response.data;
    },
    enabled: !!sourceBranchId,
  });

  const sourceInventory = sourceInventoryResponse?.data || [];

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
      toast.error(error.response?.data?.error || 'حدث خطأ ما أثناء إنشاء الطلب');
    },
  });

  const shipDirectMutation = useMutation({
    mutationFn: (transferId) => api.post(`/transfers/${transferId}/ship-direct`),
    onSuccess: () => {
      queryClient.invalidateQueries(['transfers']);
      toast.success('تم شحن التوريد مباشرة وجاري نقله للفرع');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما أثناء شحن التوريد');
    }
  });

  const scanSendMutation = useMutation({
    mutationFn: ({ transferId, barcode }) => 
      api.post(`/transfers/${transferId}/scan/send`, { barcode }),
    onSuccess: (response) => {
      const { product, remaining, allTransferSent } = response.data.data;
      const message = response.data.message || 'تم تسجيل إرسال القطعة';
      
      toast.success(message);
      setScannedLogs(prev => [
        {
          barcode,
          name: product.name,
          size: product.size,
          color: product.color,
          status: 'SENT',
          time: new Date().toLocaleTimeString('ar-EG')
        },
        ...prev
      ]);
      setBarcode('');
      
      // Refresh transfers data to show updated quantities
      queryClient.invalidateQueries(['transfers']);
      
      if (allTransferSent) {
        toast.success('تم إرسال كامل الشحنة بنجاح! 🚚💨');
        setShowScanModal(false);
        setSelectedTransfer(null);
      } else {
        // Re-focus input
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل تسجيل القطعة');
      setBarcode('');
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  });

  const scanReceiveMutation = useMutation({
    mutationFn: ({ transferId, barcode, categoryId, color }) => 
      api.post(`/transfers/${transferId}/scan/receive`, { barcode, categoryId, color }),
    onSuccess: (response) => {
      const { product, remaining, allTransferCompleted } = response.data.data;
      const message = response.data.message || 'تم استلام وتأكيد القطعة';
      
      toast.success(message);
      setScannedLogs(prev => [
        {
          barcode,
          name: product.name,
          size: product.size,
          color: product.color,
          status: 'RECEIVED',
          time: new Date().toLocaleTimeString('ar-EG')
        },
        ...prev
      ]);
      setBarcode('');
      
      // Refresh transfers data
      queryClient.invalidateQueries(['transfers']);
      
      if (allTransferCompleted) {
        toast.success('تم استلام كامل الشحنة! الآن سجل ملاحظاتك النهائية 📝');
        // فتح modal الملاحظات النهائية
        setShowCompleteModal(true);
      } else {
        // Re-focus
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل استلام القطعة');
      setBarcode('');
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  });
  
  const completeReceivingMutation = useMutation({
    mutationFn: ({ transferId, data }) => 
      api.post(`/transfers/${transferId}/complete-receiving`, data),
    onSuccess: (response) => {
      toast.success(response.data.message || 'تم إنهاء الاستلام بنجاح');
      queryClient.invalidateQueries(['transfers']);
      setShowScanModal(false);
      setShowCompleteModal(false);
      setSelectedTransfer(null);
      setFinalNotes({
        receiverNotes: '',
        hasDiscrepancy: false,
        discrepancyType: '',
        discrepancyNotes: ''
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء إنهاء الاستلام');
    }
  });

  // Confirm receiving directly (simplified - no scanning required)
  const confirmReceivingMutation = useMutation({
    mutationFn: ({ transferId, data }) => 
      api.post(`/transfers/${transferId}/confirm-receiving`, data),
    onSuccess: (response) => {
      const result = response.data.data;
      let message = '✅ تم تأكيد الاستلام بنجاح!';
      
      if (result.missing > 0) {
        message += `\n⚠️ ناقص: ${result.missing} قطعة`;
      }
      if (result.extra > 0) {
        message += `\n➕ زيادة: ${result.extra} قطعة`;
      }
      
      toast.success(message);
      queryClient.invalidateQueries(['transfers']);
      setShowSimpleReceiveModal(false);
      setSimpleReceiveData({ confirmedQuantity: '', scannedSerials: [], extraSerials: [] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء تأكيد الاستلام');
    }
  });

  const [showSimpleReceiveModal, setShowSimpleReceiveModal] = useState(false);
  const [simpleReceiveData, setSimpleReceiveData] = useState({
    confirmedQuantity: '',
    scannedSerials: [],
    extraSerials: []
  });

  const resetForm = () => {
    setFormData({
      fromBranchId: '',
      toBranchId: '',
      items: [{ categoryId: '', quantity: 1, color: '', availableQty: 0 }],
      notes: '',
    });
  };

  const openScanModal = (transfer, type) => {
    setSelectedTransfer(transfer);
    setScanType(type);
    setScannedLogs([]);
    setBarcode('');
    setReceiveCategoryId('');
    setReceiveColor('');
    setBarcodeInputMode('scanner');
    setShowScanModal(true);
    setFinalNotes({
      receiverNotes: '',
      hasDiscrepancy: false,
      discrepancyType: '',
      discrepancyNotes: ''
    });
    setTimeout(() => barcodeInputRef.current?.focus(), 150);
  };
  
  const handleCompleteReceiving = () => {
    if (!currentTransfer) return;
    
    completeReceivingMutation.mutate({
      transferId: currentTransfer.id,
      data: finalNotes
    });
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    if (scanType === 'send') {
      scanSendMutation.mutate({ transferId: currentTransfer.id, barcode });
    } else {
      if (!receiveCategoryId || !receiveColor) {
        toast.error('يرجى اختيار الصنف واللون أولاً');
        return;
      }
      scanReceiveMutation.mutate({ 
        transferId: currentTransfer.id, 
        barcode,
        categoryId: receiveCategoryId,
        color: receiveColor
      });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { categoryId: '', quantity: 1, color: '', availableQty: 0 }],
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Reset color and availableQty if category is changed
    if (field === 'categoryId') {
      newItems[index]['color'] = '';
      newItems[index]['availableQty'] = 0;
      newItems[index]['quantity'] = 1;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      fromBranchId: formData.fromBranchId || null, // null means MAIN warehouse
      toBranchId: formData.toBranchId,
      notes: formData.notes,
      items: formData.items.map(item => ({
        categoryId: item.categoryId,
        quantity: item.quantity,
        attributes: {
          'اللون': item.color
        }
      }))
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      IN_TRANSIT: 'bg-blue-100 text-blue-700 border-blue-200',
      DELIVERED: 'bg-green-100 text-green-700 border-green-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status) => {
    const texts = {
      PENDING: 'بانتظار التجهيز والإرسال ⏳',
      IN_TRANSIT: 'في الطريق (شحن) 🚚',
      DELIVERED: 'تم التسليم والمطابقة ✅',
      CANCELLED: 'تم الإلغاء ❌',
    };
    return texts[status] || status;
  };

  // Filter transfers based on active tab and user role
  const userBranchId = user?.branchId;

  const incomingTransfers = transfers.filter(t => {
    const isTarget = t.toBranchId === userBranchId;
    return isTarget && (t.status === 'PENDING' || t.status === 'IN_TRANSIT');
  });

  const outgoingTransfers = transfers.filter(t => {
    const isSource = t.fromBranchId === userBranchId || (isAdmin && !t.fromBranchId);
    return isSource && t.status === 'PENDING';
  });

  const historyTransfers = transfers.filter(t => {
    if (isAdmin) return t.status === 'DELIVERED' || t.status === 'CANCELLED' || t.status === 'IN_TRANSIT';
    return t.status === 'DELIVERED' || t.status === 'CANCELLED' || (t.fromBranchId === userBranchId && t.status === 'IN_TRANSIT');
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">تحويلات البضائع (التوريد)</h1>
          <p className="text-gray-600 mt-1">نظام التوريد الذكي بالباركود والمطابقة الفورية بين الفروع</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary self-start">
            <Plus size={20} />
            <span>إنشاء طلب توريد</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white p-2 rounded-lg shadow-sm gap-2">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 py-2.5 text-center font-bold text-sm rounded-lg transition-all ${
            activeTab === 'inbox' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          الوارد للفرع ({incomingTransfers.length})
        </button>
        <button
          onClick={() => setActiveTab('outbox')}
          className={`flex-1 py-2.5 text-center font-bold text-sm rounded-lg transition-all ${
            activeTab === 'outbox' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          الصادر من الفرع (قيد الإرسال) ({outgoingTransfers.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-center font-bold text-sm rounded-lg transition-all ${
            activeTab === 'history' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          سجل التحويلات الشامل
        </button>
      </div>

      {/* List Container */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-gray-500 py-12">جاري تحميل التوريدات...</p>
        ) : (
          (() => {
            const list = activeTab === 'inbox' ? incomingTransfers : activeTab === 'outbox' ? outgoingTransfers : historyTransfers;
            if (list.length === 0) {
              return (
                <div className="card text-center py-12 text-gray-500">
                  <Package size={48} className="mx-auto mb-3 opacity-30" />
                  <p>لا توجد تحويلات في هذا القسم حالياً</p>
                </div>
              );
            }
            return list.map((transfer) => {
              const fromBranchName = transfer.fromBranch?.name || 'المخزن الرئيسي';
              const toBranchName = transfer.toBranch?.name;
              
              // Helper to check if user needs to SEND or RECEIVE
              const canSend = transfer.status === 'PENDING' && (transfer.fromBranchId === userBranchId || (isAdmin && !transfer.fromBranchId));
              const canReceive = transfer.status === 'IN_TRANSIT' && transfer.toBranchId === userBranchId;

              return (
                <div key={transfer.id} className="card border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div>
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold">
                          {transfer.transferNumber}
                        </span>
                        <h3 className="font-bold text-gray-800 text-base mt-2 flex items-center gap-2">
                          <span>{fromBranchName}</span>
                          <ArrowLeftRight size={16} className="text-gray-400" />
                          <span>{toBranchName}</span>
                        </h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(transfer.status)}`}>
                        {getStatusText(transfer.status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-bold text-gray-500 mb-1">السلع المطلوبة:</p>
                      {transfer.items?.map((item, idx) => {
                        const attributes = JSON.parse(item.attributes);
                        return (
                          <div key={idx} className="flex justify-between items-center text-sm border-b pb-1 last:border-0 last:pb-0">
                            <span className="font-medium text-gray-700">
                               • {item.category?.name}
                               {attributes['اللون'] && ` - ${attributes['اللون']}`}
                            </span>
                            <div className="text-xs text-gray-500 flex gap-2">
                              <span>المطلوب: {item.quantityRequested}</span>
                              <span className="text-blue-600 font-semibold">المشحون: {item.quantitySent || 0}</span>
                              <span className="text-green-600 font-semibold">المستلم: {item.quantityReceived || 0}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-2 pt-3 border-t">
                    <p className="text-xs text-gray-400 self-start md:self-center">
                      تاريخ الطلب: {new Date(transfer.createdAt).toLocaleString('ar-EG')}
                    </p>
                    
                    {canSend && (
                      !transfer.fromBranchId || transfer.fromBranch?.code === 'MAIN' ? (
                        <button 
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من شحن هذا الطلب مباشرة للفرع وبدون مسح باركود؟')) {
                              shipDirectMutation.mutate(transfer.id);
                            }
                          }}
                          className="btn-primary w-full md:w-auto text-sm py-1.5 px-4 bg-green-600 hover:bg-green-700"
                          disabled={shipDirectMutation.isLoading}
                        >
                          {shipDirectMutation.isLoading ? 'جاري الشحن...' : 'شحن مباشر للفرع (بدون باركود)'}
                        </button>
                      ) : (
                        <button 
                          onClick={() => openScanModal(transfer, 'send')}
                          className="btn-primary w-full md:w-auto text-sm py-1.5 px-4 bg-blue-600 hover:bg-blue-700"
                        >
                          <Scan size={16} />
                          <span>مسح وإرسال البضاعة بالباركود</span>
                        </button>
                      )
                    )}

                    {canReceive && (
                      <div className="flex gap-2 flex-wrap">
                        <button 
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setShowSimpleReceiveModal(true);
                            // Get expected quantity from transfer
                            const expectedQty = transfer.items?.reduce((sum, item) => sum + (item.quantitySent || 0), 0) || 0;
                            setSimpleReceiveData({
                              confirmedQuantity: expectedQty.toString(),
                              scannedSerials: [],
                              extraSerials: []
                            });
                          }}
                          className="btn-primary text-sm py-1.5 px-4 bg-green-600 hover:bg-green-700"
                        >
                          <Check size={16} />
                          <span>تأكيد الاستلام (بدون مسح)</span>
                        </button>
                        <button 
                          onClick={() => openScanModal(transfer, 'receive')}
                          className="btn-secondary text-sm py-1.5 px-4"
                        >
                          <Scan size={16} />
                          <span>مسح بالباركود</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Modal: إنشاء طلب توريد (Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">إنشاء طلب توريد جديد</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">من فرع / مخزن *</label>
                  <select
                    value={formData.fromBranchId}
                    onChange={(e) => setFormData({ ...formData, fromBranchId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">المخزن الرئيسي (الأدمن)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">إلى فرع *</label>
                  <select
                    value={formData.toBranchId}
                    onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">اختر الفرع المستلم</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">الأصناف والتفاصيل المطلوبة</label>
                {formData.items.map((item, index) => {
                  const categoryInventory = sourceInventory.filter(
                    inv => inv.product?.categoryId === item.categoryId && inv.quantity > 0
                  );
                  
                  const colorStock = {};
                  categoryInventory.forEach(inv => {
                    const color = inv.product?.color || 'بدون لون';
                    colorStock[color] = (colorStock[color] || 0) + inv.quantity;
                  });
                  
                  const isSelected = !!item.categoryId;
                  const hasStock = categoryInventory.length > 0;

                  return (
                    <div key={index} className="border rounded-lg p-4 mb-3 bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-3 relative">
                      <div className="md:col-span-2">
                        <label className="block text-xs mb-1">الصنف *</label>
                        <select
                          value={item.categoryId}
                          onChange={(e) => updateItem(index, 'categoryId', e.target.value)}
                          className="input-field text-sm"
                          required
                        >
                          <option value="">اختر الفئة</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        {isSelected && !hasStock && (
                          <p className="text-xs text-red-600 font-bold mt-1">⚠️ عذراً، هذا الصنف غير متوفر في مخزن المصدر المحدد!</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs mb-1">اللون المطلوب *</label>
                        <select
                          value={item.color || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const maxQty = colorStock[val] || 1;
                            updateItem(index, 'color', val);
                            updateItem(index, 'availableQty', maxQty);
                            if (item.quantity > maxQty) {
                              updateItem(index, 'quantity', maxQty);
                            }
                          }}
                          className="input-field text-sm"
                          required
                          disabled={!hasStock}
                        >
                          <option value="">اختر اللون...</option>
                          {Object.entries(colorStock).map(([color, qty]) => (
                            <option key={color} value={color}>
                              {color} (متوفر: {qty})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1">الكمية المطلوبة * {item.availableQty ? `(متاح: ${item.availableQty})` : ''}</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="input-field text-sm"
                          min="1"
                          max={item.availableQty || 9999}
                          required
                          disabled={!item.color}
                        />
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 text-xs self-end mt-2"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  + إضافة صنف آخر
                </button>
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

              <div className="flex gap-3 pt-3 border-t">
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={createMutation.isLoading}
                >
                  {createMutation.isLoading ? 'جاري إنشاء الطلب...' : 'إنشاء وإرسال الطلب'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
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

      {/* Modal: مسح الباركود (إرسال / استلام) */}
      {showScanModal && currentTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {scanType === 'send' ? 'شحن وإرسال البضاعة بالباركود' : 'تأكيد واستلام البضاعة بالباركود'}
              </h2>
              <button
                onClick={() => {
                  setShowScanModal(false);
                  setSelectedTransfer(null);
                }}
                className="text-gray-500 hover:text-gray-700 font-bold text-lg"
              >
                إغلاق ✕
              </button>
            </div>

            {scanType === 'send' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* تفاصيل الطلب والأصناف ومقاديرها */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="font-bold text-gray-800 text-sm mb-2">الأصناف المتبقية في هذا التوريد:</h3>
                    <div className="space-y-2">
                      {currentTransfer.items?.map((item, idx) => {
                        const attributes = JSON.parse(item.attributes);
                        const isComplete = item.quantitySent >= item.quantityRequested;

                        return (
                          <div 
                            key={idx} 
                            className={`flex items-center justify-between p-2 rounded border text-sm ${
                              isComplete ? 'bg-green-50 border-green-200 text-green-800 font-semibold' : 'bg-white text-gray-700'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {isComplete && <Check size={16} className="text-green-600" />}
                              <span>
                                {item.category?.name}
                                {attributes['اللون'] && ` - ${attributes['اللون']}`}
                              </span>
                            </span>
                            <span>
                              المشحون: {item.quantitySent || 0} / {item.quantityRequested}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* حقل المسح */}
                  <form onSubmit={handleBarcodeSubmit} className="space-y-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <Scan size={16} className="inline mr-1 text-primary-600" />
                        مرر قارئ الباركود على القطعة:
                      </label>
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="input-field text-lg font-mono font-bold tracking-wider"
                        placeholder="امسح الباركود بالريدر..."
                        autoFocus
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full btn-primary text-sm"
                      disabled={scanSendMutation.isLoading}
                    >
                      {scanSendMutation.isLoading ? 'جاري التحقق...' : 'إرسال ومطابقة القطعة'}
                    </button>
                  </form>
                </div>

                {/* سجل المسح اللحظي */}
                <div className="border-r pr-4 border-gray-100 flex flex-col">
                  <h3 className="font-bold text-sm text-gray-800 mb-3">سجل الجلسة الحالية:</h3>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px]">
                    {scannedLogs.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">بانتظار المسح الأول...</p>
                    ) : (
                      scannedLogs.map((log, index) => (
                        <div key={index} className="bg-gray-50 border p-2.5 rounded text-xs flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-800">{log.name}</span>
                            <span className="text-[10px] text-gray-400 font-bold">{log.time}</span>
                          </div>
                          <div className="flex justify-between text-gray-500 font-mono text-[10px]">
                            <span>{log.barcode}</span>
                            <span className="text-blue-600 font-bold">تم الشحن</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: Incoming Order Details */}
                <div className="space-y-4">
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <h3 className="font-bold text-gray-800 text-sm mb-3">تفاصيل التوريد والكميات الواردة:</h3>
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                      {currentTransfer.items?.map((item, idx) => {
                        const attributes = JSON.parse(item.attributes);
                        const isComplete = (item.quantityReceived || 0) >= item.quantityRequested;

                        return (
                          <div 
                            key={idx} 
                            className={`flex items-center justify-between p-3 rounded border text-sm ${
                              isComplete ? 'bg-green-50 border-green-200 text-green-800 font-semibold' : 'bg-white text-gray-700'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {isComplete ? <CheckCircle size={16} className="text-green-600" /> : <Package size={16} className="text-gray-400" />}
                              <span>
                                {item.category?.name} - {attributes['اللون']}
                              </span>
                            </span>
                            <span>
                              مستلم: {item.quantityReceived || 0} / {item.quantityRequested}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Progress Indicator */}
                    {(() => {
                      const totalRequested = currentTransfer.items?.reduce((sum, item) => sum + item.quantityRequested, 0) || 0;
                      const totalReceived = currentTransfer.items?.reduce((sum, item) => sum + (item.quantityReceived || 0), 0) || 0;
                      const isFinished = totalReceived >= totalRequested;
                      return (
                        <div className={`mt-4 p-3 rounded-lg border text-center font-bold text-sm ${
                          isFinished ? 'bg-green-100 border-green-300 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        }`}>
                          تم تسجيل {totalReceived} / {totalRequested} قطعة ({isFinished ? 'انتهى بالكامل 🎉' : 'جاري مراجعة الشحنة...'})
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Right Side: Scan & Register Form */}
                <div className="space-y-4">
                  <form onSubmit={handleBarcodeSubmit} className="space-y-4 bg-gray-50/50 p-4 border rounded-lg">
                    <h3 className="font-bold text-gray-800 text-sm pb-2 border-b">تسجيل ومطابقة القطع:</h3>
                    
                    {/* Barcode input — scanner / manual toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-700">
                          {barcodeInputMode === 'scanner'
                            ? <><Scan size={13} className="inline ml-1 text-primary-600" />مسح بالريدر (الافتراضي)</>
                            : <>⌨️ إدخال يدوي</>}
                        </label>
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => { setBarcodeInputMode('scanner'); setTimeout(() => barcodeInputRef.current?.focus(), 50); }}
                            className={`px-3 py-1 font-semibold transition-colors ${
                              barcodeInputMode === 'scanner'
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            ريدر
                          </button>
                          <button
                            type="button"
                            onClick={() => { setBarcodeInputMode('manual'); setTimeout(() => barcodeInputRef.current?.focus(), 50); }}
                            className={`px-3 py-1 font-semibold transition-colors ${
                              barcodeInputMode === 'manual'
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            يدوي
                          </button>
                        </div>
                      </div>
                      <input
                        ref={barcodeInputRef}
                        type={barcodeInputMode === 'manual' ? 'text' : 'text'}
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={barcodeInputMode === 'scanner'
                          ? (e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeSubmit(e); } }
                          : undefined
                        }
                        className={`input-field text-lg font-mono font-bold tracking-wider ${
                          barcodeInputMode === 'scanner'
                            ? 'bg-blue-50 border-blue-300 focus:border-blue-500'
                            : 'bg-white'
                        }`}
                        placeholder={barcodeInputMode === 'scanner' ? 'امسح بالريدر... (يُسجَّل تلقائياً)' : 'اكتب الرقم التسلسلي يدوياً...'}
                        required
                        autoFocus={barcodeInputMode === 'scanner'}
                        readOnly={false}
                      />
                      {barcodeInputMode === 'scanner' && (
                        <p className="text-[11px] text-blue-500 mt-1">⚡ وضع الريدر: الباركود يُسجَّل تلقائياً عند المسح</p>
                      )}
                    </div>

                    {/* Category Select */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">اختر الصنف *</label>
                      <select
                        value={receiveCategoryId}
                        onChange={(e) => {
                          setReceiveCategoryId(e.target.value);
                          setReceiveColor('');
                        }}
                        className="input-field text-sm"
                        required
                      >
                        <option value="">-- اختر الصنف --</option>
                        {(() => {
                          const uniqueCats = [];
                          currentTransfer.items?.forEach(item => {
                            if (!uniqueCats.some(c => c.id === item.category?.id)) {
                              uniqueCats.push(item.category);
                            }
                          });
                          return uniqueCats.map(cat => (
                            <option key={cat?.id} value={cat?.id}>{cat?.name}</option>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* Color Select */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">اختر اللون *</label>
                      <select
                        value={receiveColor}
                        onChange={(e) => setReceiveColor(e.target.value)}
                        className="input-field text-sm"
                        required
                        disabled={!receiveCategoryId}
                      >
                        <option value="">-- اختر اللون --</option>
                        {currentTransfer.items
                          ?.filter(item => item.categoryId === receiveCategoryId)
                          ?.map((item, index) => {
                            const itemColor = JSON.parse(item.attributes)['اللون'];
                            const remaining = item.quantityRequested - (item.quantityReceived || 0);
                            return (
                              <option key={index} value={itemColor}>
                                {itemColor} (المتبقي للاستلام: {remaining})
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full btn-primary text-sm py-2"
                      disabled={scanReceiveMutation.isLoading}
                    >
                    {scanReceiveMutation.isLoading ? 'جاري تسجيل الاستلام...' : 'تسجيل القطعة وتأكيدها ✔'}
                    </button>
                  </form>

                  {/* سجل الجلسة */}
                  {scannedLogs.length > 0 && (
                    <div>
                      <h4 className="font-bold text-xs text-gray-600 mb-2">سجل الجلسة:</h4>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {scannedLogs.map((log, index) => (
                          <div key={index} className="bg-green-50 border border-green-100 p-2 rounded text-xs flex justify-between items-center">
                            <span className="font-bold text-gray-800">{log.name} — {log.color}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-gray-400">{log.barcode}</span>
                              <span className="text-green-600 font-bold">✔ مستلم</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: تأكيد الاستلام المبسط */}
      {showSimpleReceiveModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">تأكيد استلام التوريد</h2>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
              <p className="font-semibold mb-2">رقم التوريد: {selectedTransfer.transferNumber}</p>
              <p className="text-sm text-gray-600">
                من: {selectedTransfer.fromBranch?.name || 'المخزن الرئيسي'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                العدد المتوقع: {selectedTransfer.items?.reduce((sum, item) => sum + (item.quantitySent || 0), 0)} قطعة
              </p>
              <p className="text-sm text-gray-500 mt-2">
                السيريالات: من {selectedTransfer.items?.[0]?.sentBarcodes ? JSON.parse(selectedTransfer.items[0].sentBarcodes)[0] : 'N/A'} إلى {selectedTransfer.items?.[0]?.sentBarcodes ? JSON.parse(selectedTransfer.items[0].sentBarcodes).slice(-1)[0] : 'N/A'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">العدد المستلم فعلياً</label>
                <input
                  type="number"
                  value={simpleReceiveData.confirmedQuantity}
                  onChange={(e) => setSimpleReceiveData({...simpleReceiveData, confirmedQuantity: e.target.value})}
                  className="input-field"
                  placeholder="أدخل العدد المستلم"
                />
              </div>

              {parseInt(simpleReceiveData.confirmedQuantity) < (selectedTransfer.items?.reduce((sum, item) => sum + (item.quantitySent || 0), 0) || 0) && simpleReceiveData.confirmedQuantity && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-yellow-800 font-semibold mb-2">⚠️ يوجد نقص في الكمية</p>
                  <p className="text-sm text-yellow-700 mb-3">
                    الرجاء مسح السيريالات المستلمة فقط (واحد تلو الآخر)
                  </p>
                  <textarea
                    value={simpleReceiveData.scannedSerials.join('\n')}
                    onChange={(e) => setSimpleReceiveData({
                      ...simpleReceiveData,
                      scannedSerials: e.target.value.split('\n').filter(s => s.trim())
                    })}
                    className="input-field"
                    rows="4"
                    placeholder="امسح أو اكتب السيريالات المستلمة (كل سيريال في سطر)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    تم مسح {simpleReceiveData.scannedSerials.length} من {simpleReceiveData.confirmedQuantity}
                  </p>
                </div>
              )}

              {parseInt(simpleReceiveData.confirmedQuantity) > (selectedTransfer.items?.reduce((sum, item) => sum + (item.quantitySent || 0), 0) || 0) && simpleReceiveData.confirmedQuantity && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-green-800 font-semibold mb-2">➕ يوجد زيادة في الكمية</p>
                  <p className="text-sm text-green-700 mb-3">
                    الرجاء إدخال سيريالات القطع الزيادة
                  </p>
                  <textarea
                    value={simpleReceiveData.extraSerials.join('\n')}
                    onChange={(e) => setSimpleReceiveData({
                      ...simpleReceiveData,
                      extraSerials: e.target.value.split('\n').filter(s => s.trim())
                    })}
                    className="input-field"
                    rows="3"
                    placeholder="اكتب سيريالات القطع الزيادة (كل سيريال في سطر)"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const expectedQty = selectedTransfer.items?.reduce((sum, item) => sum + (item.quantitySent || 0), 0) || 0;
                  const confirmedQty = parseInt(simpleReceiveData.confirmedQuantity);
                  
                  if (!confirmedQty) {
                    toast.error('الرجاء إدخال العدد المستلم');
                    return;
                  }

                  // Check if shortage requires scanned serials
                  if (confirmedQty < expectedQty && simpleReceiveData.scannedSerials.length !== confirmedQty) {
                    toast.error(`يجب مسح ${confirmedQty} سيريال للقطع المستلمة`);
                    return;
                  }

                  // Check if excess requires extra serials
                  const excessQty = confirmedQty - expectedQty;
                  if (confirmedQty > expectedQty && simpleReceiveData.extraSerials.length !== excessQty) {
                    toast.error(`يجب إدخال ${excessQty} سيريال للقطع الزيادة`);
                    return;
                  }

                  confirmReceivingMutation.mutate({
                    transferId: selectedTransfer.id,
                    data: {
                      confirmedQuantity: confirmedQty,
                      scannedSerials: simpleReceiveData.scannedSerials,
                      extraSerials: simpleReceiveData.extraSerials,
                      hasDiscrepancy: confirmedQty !== expectedQty,
                      discrepancyNotes: confirmedQty !== expectedQty ? `استلم ${confirmedQty} من ${expectedQty}` : ''
                    }
                  });
                }}
                disabled={confirmReceivingMutation.isPending}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {confirmReceivingMutation.isPending ? 'جاري التأكيد...' : '✅ تأكيد الاستلام'}
              </button>
              <button
                onClick={() => {
                  setShowSimpleReceiveModal(false);
                  setSimpleReceiveData({ confirmedQuantity: '', scannedSerials: [], extraSerials: [] });
                }}
                className="flex-1 btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

