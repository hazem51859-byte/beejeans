import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Users, DollarSign, TrendingUp, Wallet, X, ArrowDownRight, ArrowUpRight, History } from 'lucide-react';
import api from '../services/api';

const partnerAPI = {
  getAll: () => api.get('/partners'),
  create: (data) => api.post('/partners', data),
  update: (id, data) => api.put(`/partners/${id}`, data),
  getAccountingSummary: () => api.get('/partners/accounting/summary'),
  adjustCapital: (data) => api.post('/partners/adjust-capital', data),
  getTransactions: (partnerId) => api.get(`/partners/${partnerId}/transactions`),
};

export default function Partners() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAdjustCapitalModal, setShowAdjustCapitalModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    capitalPaid: '',
    sharePercentage: '',
    notes: '',
  });

  const [withdrawData, setWithdrawData] = useState({
    vaultId: '', // الخزينة المختارة
    totalAmount: '',
    notes: '',
    allocations: []
  });

  // Fetch vaults
  const { data: vaultsData } = useQuery({
    queryKey: ['vaults'],
    queryFn: async () => {
      const response = await api.get('/vaults');
      return response.data;
    },
  });

  const vaults = vaultsData?.data || [];

  const [adjustCapitalData, setAdjustCapitalData] = useState({
    type: 'INCREASE',
    amount: '',
    notes: ''
  });

  const { data: partnersResponse, isLoading: loadingPartners } = useQuery({
    queryKey: ['partners'],
    queryFn: partnerAPI.getAll,
  });

  const { data: accountingResponse, isLoading: loadingAccounting } = useQuery({
    queryKey: ['partners-accounting'],
    queryFn: partnerAPI.getAccountingSummary,
  });

  const { data: transactionsResponse, isLoading: loadingTransactions } = useQuery({
    queryKey: ['partner-transactions', selectedPartner?.id],
    queryFn: () => partnerAPI.getTransactions(selectedPartner.id),
    enabled: !!selectedPartner && showTransactionsModal,
  });

  const createMutation = useMutation({
    mutationFn: partnerAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['partners']);
      queryClient.invalidateQueries(['partners-accounting']);
      setShowModal(false);
      resetForm();
      toast.success('تم إضافة الشريك بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الشريك');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => partnerAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['partners']);
      queryClient.invalidateQueries(['partners-accounting']);
      setShowModal(false);
      setEditingPartner(null);
      resetForm();
      toast.success('تم تحديث الشريك بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل تحديث الشريك');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/partners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['partners']);
      queryClient.invalidateQueries(['partners-accounting']);
      toast.success('تم حذف الشريك بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في حذف الشريك');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (data) => api.post('/partners/withdraw-profit', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['partners']);
      queryClient.invalidateQueries(['partners-accounting']);
      queryClient.invalidateQueries(['vault']);
      queryClient.invalidateQueries(['monthly-report']);
      setShowWithdrawModal(false);
      setWithdrawData({ vaultId: '', totalAmount: '', notes: '', allocations: [] });
      toast.success('تم سحب الأرباح من الخزينة بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في سحب الأرباح من الخزنة');
    }
  });

  const adjustCapitalMutation = useMutation({
    mutationFn: (data) => partnerAPI.adjustCapital(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['partners']);
      queryClient.invalidateQueries(['partners-accounting']);
      setShowAdjustCapitalModal(false);
      setSelectedPartner(null);
      setAdjustCapitalData({ type: 'INCREASE', amount: '', notes: '' });
      toast.success(response.data.message || 'تم تعديل رأس المال بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل في تعديل رأس المال');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      capitalPaid: '',
      sharePercentage: '',
      notes: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      capitalPaid: parseFloat(formData.capitalPaid),
      sharePercentage: parseFloat(formData.sharePercentage),
    };

    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      email: partner.email || '',
      phone: partner.phone || '',
      capitalPaid: partner.capitalPaid.toString(),
      sharePercentage: partner.sharePercentage.toString(),
      notes: partner.notes || '',
    });
    setShowModal(true);
  };

  const openWithdrawModal = () => {
    const activePartners = partnersList.filter(p => p.isActive);
    const initialAllocations = activePartners.map(p => ({
      partnerId: p.id,
      partnerName: p.name,
      sharePercentage: p.sharePercentage,
      amount: 0
    }));
    setWithdrawData({
      vaultId: '',
      totalAmount: '',
      notes: '',
      allocations: initialAllocations
    });
    setShowWithdrawModal(true);
  };

  const handleTotalAmountChange = (val) => {
    const total = parseFloat(val) || 0;
    const updated = withdrawData.allocations.map(alloc => ({
      ...alloc,
      amount: parseFloat(((total * alloc.sharePercentage) / 100).toFixed(2))
    }));
    setWithdrawData({
      ...withdrawData,
      totalAmount: val,
      allocations: updated
    });
  };

  const handleAllocationAmountChange = (index, val) => {
    const newAllocations = [...withdrawData.allocations];
    newAllocations[index].amount = parseFloat(val) || 0;
    const newTotal = newAllocations.reduce((sum, item) => sum + (item.amount || 0), 0);
    setWithdrawData({
      ...withdrawData,
      totalAmount: newTotal > 0 ? newTotal.toString() : '',
      allocations: newAllocations
    });
  };

  const handleWithdrawSubmit = (e) => {
    e.preventDefault();
    
    if (!withdrawData.vaultId) {
      toast.error('يرجى اختيار الخزينة');
      return;
    }
    
    const total = parseFloat(withdrawData.totalAmount);
    if (!total || total <= 0) {
      toast.error('يرجى كتابة مبلغ سحب صحيح');
      return;
    }
    const validAllocations = withdrawData.allocations.filter(a => a.amount > 0);
    if (validAllocations.length === 0) {
      toast.error('يرجى تحديد توزيع الأرباح على الشركاء');
      return;
    }

    withdrawMutation.mutate({
      vaultId: withdrawData.vaultId,
      totalAmount: total,
      notes: withdrawData.notes,
      allocations: validAllocations
    });
  };

  const openAdjustCapitalModal = (partner) => {
    setSelectedPartner(partner);
    setAdjustCapitalData({ type: 'INCREASE', amount: '', notes: '' });
    setShowAdjustCapitalModal(true);
  };

  const handleAdjustCapitalSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(adjustCapitalData.amount);
    if (!amount || amount <= 0) {
      toast.error('يرجى كتابة مبلغ صحيح');
      return;
    }

    adjustCapitalMutation.mutate({
      partnerId: selectedPartner.id,
      amount,
      type: adjustCapitalData.type,
      notes: adjustCapitalData.notes
    });
  };

  const openTransactionsModal = (partner) => {
    setSelectedPartner(partner);
    setShowTransactionsModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0) + ' ج.م';
  };

  if (loadingPartners || loadingAccounting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const partnersList = partnersResponse?.data?.data || [];
  const accountingData = accountingResponse?.data?.data || {};
  const { totalCapital = 0, profit = {}, partnersShares = [] } = accountingData;
  const netProfit = profit.net || 0;
  const totalWithdrawn = profit.totalWithdrawn || 0;
  const remainingInVault = profit.remainingInVault || (netProfit - totalWithdrawn);

  // Map partner accounting info
  const partnerSharesMap = {};
  partnersShares.forEach(ps => {
    partnerSharesMap[ps.id] = ps;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الشركاء والأرباح</h1>
          <p className="text-gray-600 mt-1">إدارة حصص الشركاء وسحب الأرباح من الخزنة الرئيسية</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openWithdrawModal}
            className="btn-primary bg-amber-600 hover:bg-amber-700 text-white shadow-md flex items-center gap-2"
          >
            <ArrowDownRight size={20} />
            <span>💸 سحب أرباح من الخزنة</span>
          </button>
          <button
            onClick={() => {
              setEditingPartner(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            <span>إضافة شريك</span>
          </button>
        </div>
      </div>

      {/* التقرير المالي للأرباح والخزنة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">رأس المال الإجمالي</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(totalCapital)}
              </p>
            </div>
            <div className="bg-blue-200 p-3 rounded-lg text-blue-700">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">إجمالي أرباح النشاط</p>
              <p className="text-xl font-bold text-emerald-700">
                {formatCurrency(netProfit)}
              </p>
            </div>
            <div className="bg-emerald-200 p-3 rounded-lg text-emerald-700">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-l-4 border-amber-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">المسحوب للشركاء من الخزنة</p>
              <p className="text-xl font-bold text-amber-700">
                {formatCurrency(totalWithdrawn)}
              </p>
            </div>
            <div className="bg-amber-200 p-3 rounded-lg text-amber-700">
              <ArrowDownRight size={24} />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">الأرباح المتبقية بالخزنة (تدوير)</p>
              <p className="text-xl font-bold text-teal-800">
                {formatCurrency(remainingInVault)}
              </p>
            </div>
            <div className="bg-teal-200 p-3 rounded-lg text-teal-800">
              <Wallet size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* قائمة الشركاء */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partnersList.map((partner) => {
          const shareInfo = partnerSharesMap[partner.id] || {};
          const shareAmount = shareInfo.shareAmount || 0;
          const withdrawn = shareInfo.totalWithdrawn || 0;
          const remainingShare = shareInfo.remainingShare || (shareAmount - withdrawn);

          return (
            <div key={partner.id} className="card hover:shadow-lg transition-shadow border-t-4 border-primary-500">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center">
                    <Users className="text-primary-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{partner.name}</h3>
                    <span className="text-sm font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                      نسبة الشراكة: {partner.sharePercentage}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openTransactionsModal(partner)}
                    className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                    title="سجل المعاملات"
                  >
                    <History size={18} className="text-purple-600" />
                  </button>
                  <button
                    onClick={() => openAdjustCapitalModal(partner)}
                    className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                    title="زيادة/تقليل رأس المال"
                  >
                    <ArrowUpRight size={18} className="text-green-600" />
                  </button>
                  <button
                    onClick={() => handleEdit(partner)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <Edit2 size={18} className="text-blue-600" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف الشريك "${partner.name}"؟`)) {
                        deleteMutation.mutate(partner.id);
                      }
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <X size={18} className="text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-gray-50 p-2.5 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-gray-500">رأس المال المدفوع</span>
                  <span className="text-base font-bold text-gray-800">
                    {formatCurrency(partner.capitalPaid)}
                  </span>
                </div>

                <div className="bg-emerald-50 p-2.5 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-emerald-700 font-medium">حصة الأرباح المستحقة</span>
                  <span className="text-base font-bold text-emerald-800">
                    {formatCurrency(shareAmount)}
                  </span>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-amber-700 font-medium">المسحوب من الخزنة</span>
                  <span className="text-base font-bold text-amber-800">
                    {formatCurrency(withdrawn)}
                  </span>
                </div>

                <div className="bg-teal-50 p-2.5 rounded-lg flex justify-between items-center border border-teal-200">
                  <span className="text-xs text-teal-800 font-bold">المتبقي بالخزنة (دورانات)</span>
                  <span className={`text-base font-extrabold ${remainingShare >= 0 ? 'text-teal-900' : 'text-red-700'}`}>
                    {formatCurrency(remainingShare)}
                  </span>
                </div>

                {partner.phone && (
                  <div className="text-xs text-gray-500 pt-1">
                    📱 {partner.phone}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t text-xs">
                <span className={`px-2 py-0.5 rounded font-medium ${
                  partner.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {partner.isActive ? '✓ نشط' : '✗ غير نشط'}
                </span>
                {partner.notes && (
                  <span className="text-gray-400 truncate max-w-[150px]">{partner.notes}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* مودال سحب الأرباح من الخزنة */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
                  <ArrowDownRight size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">سحب أرباح للشركاء من الخزنة</h2>
              </div>
              <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">اختر الخزينة للسحب منها *</label>
                <select
                  value={withdrawData.vaultId}
                  onChange={(e) => setWithdrawData({ ...withdrawData, vaultId: e.target.value })}
                  className="input-field font-bold text-gray-800 bg-amber-50 border-amber-300"
                  required
                >
                  <option value="">-- اختر الخزينة --</option>
                  {vaults.filter(v => v.isActive).map((vault) => {
                    const icon = vault.type === 'CASH' ? '💵' : vault.type === 'VISA' ? '💳' : '📱';
                    return (
                      <option key={vault.id} value={vault.id}>
                        {icon} {vault.name} ({vault.balance.toFixed(2)} ج.م)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">إجمالي المبلغ المسحوب من الخزنة (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={withdrawData.totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  className="input-field font-extrabold text-lg text-amber-900 bg-amber-50/50"
                  placeholder="أدخل المبلغ المسحوب مثلاً 250"
                  required
                />
              </div>

              {/* جدول توزيع المبلغ على الشركاء */}
              {withdrawData.allocations.length > 0 && (
                <div className="border rounded-lg overflow-hidden bg-gray-50 p-3">
                  <p className="text-xs font-bold text-gray-700 mb-2">توزيع الخصم على حصص الشركاء (تلقائي حسب نسبة الشراكة):</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {withdrawData.allocations.map((alloc, idx) => (
                      <div key={alloc.partnerId} className="flex items-center justify-between bg-white p-2.5 rounded border">
                        <div>
                          <span className="font-bold text-sm">{alloc.partnerName}</span>
                          <span className="text-xs text-gray-500 mr-2">({alloc.sharePercentage}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">مخصوم:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={alloc.amount || ''}
                            onChange={(e) => handleAllocationAmountChange(idx, e.target.value)}
                            className="input-field w-28 py-1 text-center font-bold text-sm text-amber-800"
                            placeholder="0.00"
                          />
                          <span className="text-xs font-medium">ج.م</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">سبب السحب / ملاحظات</label>
                <textarea
                  value={withdrawData.notes}
                  onChange={(e) => setWithdrawData({ ...withdrawData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                  placeholder="مثال: سحب أرباح دورية لشهر أغسطس"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={withdrawMutation.isPending}
                  className="btn-primary flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 disabled:opacity-50"
                >
                  {withdrawMutation.isPending ? 'جاري السحب والخصم...' : 'تأكيد السحب والخصم من الخزنة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: إضافة أو تعديل شريك */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPartner ? 'تعديل الشريك' : 'إضافة شريك جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="اسم الشريك"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="email@example.com"
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
                <label className="block text-sm font-medium mb-2">رأس المال المدفوع *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capitalPaid}
                  onChange={(e) => setFormData({ ...formData, capitalPaid: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">نسبة الشراكة (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.sharePercentage}
                  onChange={(e) => setFormData({ ...formData, sharePercentage: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editingPartner ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPartner(null);
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

      {/* Modal: Adjust Capital (زيادة/تقليل رأس المال) */}
      {showAdjustCapitalModal && selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-green-100 p-2 rounded-lg text-green-700">
                  <ArrowUpRight size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">تعديل رأس المال</h2>
                  <p className="text-sm text-gray-600">الشريك: {selectedPartner.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAdjustCapitalModal(false);
                  setSelectedPartner(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustCapitalSubmit} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">
                  💰 رأس المال الحالي: <span className="font-bold">{formatCurrency(selectedPartner.capitalPaid)}</span>
                </p>
                <p className="text-sm text-blue-900 font-medium mt-1">
                  📊 النسبة الحالية: <span className="font-bold">{selectedPartner.sharePercentage}%</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">نوع العملية *</label>
                <select
                  value={adjustCapitalData.type}
                  onChange={(e) => setAdjustCapitalData({ ...adjustCapitalData, type: e.target.value })}
                  className="input-field font-bold text-gray-800"
                >
                  <option value="INCREASE">📈 زيادة رأس المال</option>
                  <option value="DECREASE">📉 تقليل رأس المال (سحب)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustCapitalData.amount}
                  onChange={(e) => setAdjustCapitalData({ ...adjustCapitalData, amount: e.target.value })}
                  className="input-field font-extrabold text-lg"
                  placeholder="أدخل المبلغ"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">ملاحظات</label>
                <textarea
                  value={adjustCapitalData.notes}
                  onChange={(e) => setAdjustCapitalData({ ...adjustCapitalData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                  placeholder="مثال: إضافة استثمار جديد"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-900 font-medium">
                  ⚠️ <strong>تنبيه:</strong> سيتم إعادة حساب نسب الشراكة تلقائياً لجميع الشركاء بعد هذا التعديل
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={adjustCapitalMutation.isPending}
                  className={`btn-primary flex-1 text-white font-bold py-2.5 disabled:opacity-50 ${
                    adjustCapitalData.type === 'INCREASE' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {adjustCapitalMutation.isPending 
                    ? 'جاري التعديل...' 
                    : (adjustCapitalData.type === 'INCREASE' ? 'تأكيد الزيادة' : 'تأكيد التقليل')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustCapitalModal(false);
                    setSelectedPartner(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transaction History (سجل المعاملات) */}
      {showTransactionsModal && selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-700">
                  <History size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">سجل المعاملات</h2>
                  <p className="text-sm text-gray-600">الشريك: {selectedPartner.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowTransactionsModal(false);
                  setSelectedPartner(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {loadingTransactions ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {transactionsResponse?.data?.data?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History size={48} className="mx-auto mb-3 opacity-30" />
                    <p>لا توجد معاملات لهذا الشريك</p>
                  </div>
                ) : (
                  transactionsResponse?.data?.data?.map((transaction) => {
                    const isPositive = transaction.type === 'CAPITAL' || transaction.type === 'PROFIT_DISTRIBUTION';
                    const typeLabels = {
                      CAPITAL: '💰 إضافة رأس مال',
                      WITHDRAWAL: '💸 سحب',
                      PROFIT_DISTRIBUTION: '💵 توزيع أرباح',
                      LOSS_DISTRIBUTION: '📉 توزيع خسائر'
                    };

                    return (
                      <div 
                        key={transaction.id} 
                        className={`p-4 rounded-lg border-l-4 ${
                          isPositive 
                            ? 'bg-green-50 border-green-500' 
                            : 'bg-red-50 border-red-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                                isPositive 
                                  ? 'bg-green-200 text-green-800' 
                                  : 'bg-red-200 text-red-800'
                              }`}>
                                {typeLabels[transaction.type] || transaction.type}
                              </span>
                              {transaction.vaultType && (
                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                  {transaction.vaultType === 'CASH' ? '💵 نقدي' : 
                                   transaction.vaultType === 'CARD' ? '💳 فيزا' : '📱 محفظة'}
                                </span>
                              )}
                            </div>
                            
                            {transaction.description && (
                              <p className="text-sm text-gray-700 font-medium mb-1">
                                {transaction.description}
                              </p>
                            )}
                            
                            {transaction.notes && (
                              <p className="text-xs text-gray-600 italic">
                                📝 {transaction.notes}
                              </p>
                            )}

                            <p className="text-xs text-gray-500 mt-2">
                              📅 {new Date(transaction.transactionDate).toLocaleString('ar-EG', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </p>
                          </div>

                          <div className={`text-xl font-extrabold ${
                            isPositive ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {isPositive ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowTransactionsModal(false);
                  setSelectedPartner(null);
                }}
                className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
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
