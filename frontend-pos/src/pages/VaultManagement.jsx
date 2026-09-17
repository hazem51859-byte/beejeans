import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Wallet, TrendingUp, TrendingDown, CreditCard, DollarSign, 
  ArrowRightLeft, CheckCircle, AlertCircle,
  Users, Clock
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export default function VaultManagement() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const userBranchId = user?.branchId;
  
  // States
  const [transactionType, setTransactionType] = useState('all');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPrepareDrawerModal, setShowPrepareDrawerModal] = useState(false);
  
  // Transfer money form
  const [transferForm, setTransferForm] = useState({
    toBranchId: '',
    amount: '',
    reason: '',
    notes: ''
  });

  // Prepare drawer form
  const [prepareDrawerForm, setPrepareDrawerForm] = useState({
    amount: '500',
    cashierId: '',
    notes: ''
  });

  // Queries - Main Factory Vault Only
  const { data: vaultsData, isLoading } = useQuery({
    queryKey: ['vaults'],
    queryFn: () => api.get('/vault').then(r => r.data)
  });

  const { data: transactionsData } = useQuery({
    queryKey: ['vault-transactions', transactionType, vaultsData],
    queryFn: () => {
      // Get main factory ID from vaults data
      const mainFactory = vaultsData?.data?.branches?.find(b => b.code === 'MAIN');
      if (!mainFactory) return { data: [] };
      
      const params = new URLSearchParams({
        branchId: mainFactory.id, // Main factory UUID
        ...(transactionType !== 'all' && { type: transactionType }),
        limit: '100'
      });
      return api.get(`/vault/transactions?${params}`).then(r => r.data);
    },
    enabled: !!vaultsData?.data?.branches
  });

  const { data: pendingTransfersData } = useQuery({
    queryKey: ['pending-transfers'],
    queryFn: () => api.get('/vault/money-transfers/pending').then(r => r.data),
    enabled: false // Disabled temporarily - money transfers feature not yet implemented
  });

  const { data: drawersData } = useQuery({
    queryKey: ['active-drawers'],
    queryFn: () => api.get('/vault/drawers').then(r => r.data),
    enabled: isAdmin
  });

  // Get cashiers in branch
  const { data: cashiersData } = useQuery({
    queryKey: ['branch-cashiers', userBranchId],
    queryFn: () => api.get(`/users?branchId=${userBranchId}&role=CASHIER`).then(r => r.data),
    enabled: isManager || isAdmin
  });

  // Mutations
  const transferMoneyMutation = useMutation({
    mutationFn: (data) => api.post('/vault/money-transfer', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vaults']);
      queryClient.invalidateQueries(['pending-transfers']);
      setShowTransferModal(false);
      setTransferForm({ toBranchId: '', amount: '', reason: '', notes: '' });
      toast.success('تم إرسال التحويل بنجاح - في انتظار التأكيد');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'حدث خطأ في التحويل');
    }
  });

  const confirmTransferMutation = useMutation({
    mutationFn: ({ transferId, notes }) => 
      api.put(`/vault/money-transfer/${transferId}/confirm`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vaults']);
      queryClient.invalidateQueries(['pending-transfers']);
      toast.success('تم تأكيد استلام الأموال');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'حدث خطأ');
    }
  });

  const prepareDrawerMutation = useMutation({
    mutationFn: (data) => api.post('/vault/prepare-drawer', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vaults']);
      queryClient.invalidateQueries(['vault-transactions']);
      setShowPrepareDrawerModal(false);
      setPrepareDrawerForm({ amount: '500', cashierId: '', notes: '' });
      toast.success('تم تجهيز الدرج من الخزينة');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'حدث خطأ');
    }
  });

  const vaults = vaultsData?.data || {};
  const transactions = transactionsData?.data || [];
  const pendingTransfers = pendingTransfersData?.data || [];
  const activeDrawers = drawersData?.data || [];
  const cashiers = cashiersData?.data || [];

  // Get main factory vault by code
  const mainFactoryVault = vaults.branches?.find(b => b.code === 'MAIN') || {};
  const mainFactoryBalance = mainFactoryVault.vaultBalance || 0;
  const mainFactoryCardBalance = mainFactoryVault.cardVaultBalance || 0;
  const mainFactoryWalletBalance = mainFactoryVault.walletBalance || 0;

  // Get branches list for transfer dropdown (exclude main factory)
  const transferableBranches = vaults.branches?.filter(b => 
    b.code !== 'MAIN' // Can't transfer to main factory
  ) || [];

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferForm.toBranchId || !transferForm.amount || !transferForm.reason) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    transferMoneyMutation.mutate(transferForm);
  };

  const handlePrepareDrawerSubmit = (e) => {
    e.preventDefault();
    if (!prepareDrawerForm.amount || !prepareDrawerForm.cashierId) {
      toast.error('الرجاء إدخال المبلغ واختيار الكاشير');
      return;
    }
    
    const selectedCashier = cashiers?.find(c => c.id === prepareDrawerForm.cashierId);
    
    prepareDrawerMutation.mutate({
      amount: parseFloat(prepareDrawerForm.amount),
      cashierName: selectedCashier?.fullName || '',
      notes: prepareDrawerForm.notes
    });
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'CARD_PAYMENT':
        return <CreditCard size={16} className="text-blue-500" />;
      case 'WALLET_PAYMENT':
        return <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>;
      case 'CASH_DEPOSIT':
      case 'DRAWER_TRANSFER':
      case 'MONEY_TRANSFER_IN':
        return <TrendingUp size={16} className="text-green-500" />;
      case 'CASH_WITHDRAWAL':
      case 'MONEY_TRANSFER_OUT':
        return <TrendingDown size={16} className="text-red-500" />;
      default:
        return <DollarSign size={16} className="text-gray-500" />;
    }
  };

  const getTransactionTypeLabel = (type) => {
    const types = {
      'CARD_PAYMENT': 'دفع فيزا',
      'WALLET_PAYMENT': 'دفع محفظة',
      'CASH_DEPOSIT': 'إيداع نقدي',
      'CASH_WITHDRAWAL': 'سحب نقدي',
      'DRAWER_TRANSFER': 'تحويل من الدرج',
      'OPENING_BALANCE': 'رصيد افتتاحي',
      'MONEY_TRANSFER_IN': 'تحويل وارد',
      'MONEY_TRANSFER_OUT': 'تحويل صادر'
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet size={28} />
            خزينة المصنع الرئيسي
          </h1>
          <p className="text-gray-600 mt-1">
            إدارة ومتابعة خزينة المصنع الرئيسي والمعاملات المالية
          </p>
        </div>
        
        {isManager && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrepareDrawerModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <DollarSign size={20} />
              تجهيز درج
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <ArrowRightLeft size={20} />
              تحويل أموال
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">
              خزينة المصنع (نقدي)
            </h3>
            <Wallet size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">
            {mainFactoryBalance.toLocaleString('ar-EG')} جنيه
          </p>
          <p className="text-xs opacity-75 mt-2">
            المصنع الرئيسي
          </p>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">
              رصيد الفيزا
            </h3>
            <CreditCard size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">
            {mainFactoryCardBalance.toLocaleString('ar-EG')} جنيه
          </p>
          <p className="text-xs opacity-75 mt-2">
            معاملات الفيزا
          </p>
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">
              رصيد المحفظة
            </h3>
            <svg className="w-6 h-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">
            {(mainFactoryWalletBalance || 0).toLocaleString('ar-EG')} جنيه
          </p>
          <p className="text-xs opacity-75 mt-2">
            المحفظة الإلكترونية
          </p>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">تحويلات معلقة</h3>
            <Clock size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">{pendingTransfers.length}</p>
          <p className="text-xs opacity-75 mt-2">
            في انتظار التأكيد
          </p>
        </div>
      </div>

      {/* Pending Transfers */}
      {pendingTransfers.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-orange-500" />
            تحويلات في انتظار التأكيد
          </h2>
          <div className="space-y-3">
            {pendingTransfers.map((transfer) => (
              <div key={transfer.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <p className="font-medium">
                    من {transfer.fromBranch.name} → {transfer.toBranch.name}
                  </p>
                  <p className="text-2xl font-bold text-primary-600 mt-1">
                    {transfer.amount.toLocaleString('ar-EG')} جنيه
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    السبب: {transfer.reason || 'لا يوجد'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(transfer.sentAt).toLocaleString('ar-EG')}
                  </p>
                </div>
                {(isAdmin || transfer.toBranchId === userBranchId) && (
                  <button
                    onClick={() => confirmTransferMutation.mutate({ transferId: transfer.id, notes: '' })}
                    className="btn-primary flex items-center gap-2"
                    disabled={confirmTransferMutation.isPending}
                  >
                    <CheckCircle size={18} />
                    تأكيد الاستلام
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Drawers */}
      {activeDrawers.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">الدروج النشطة في المصنع</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3 px-4">الكاشير</th>
                  <th className="text-right py-3 px-4">رصيد افتتاحي</th>
                  <th className="text-right py-3 px-4">مبيعات نقدية</th>
                  <th className="text-right py-3 px-4">الرصيد الحالي</th>
                  <th className="text-right py-3 px-4">عدد المعاملات</th>
                </tr>
              </thead>
              <tbody>
                {activeDrawers.map((drawer) => (
                  <tr key={drawer.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{drawer.user.fullName}</td>
                    <td className="py-3 px-4">{drawer.openingBalance.toLocaleString('ar-EG')} جنيه</td>
                    <td className="py-3 px-4 text-green-600">+{drawer.totalCashSales.toLocaleString('ar-EG')} جنيه</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-primary-600">
                        {drawer.currentDrawerBalance.toLocaleString('ar-EG')} جنيه
                      </span>
                    </td>
                    <td className="py-3 px-4">{drawer._count.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">سجل معاملات المصنع الرئيسي</h2>
          <div className="flex gap-2">
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">جميع الأنواع</option>
              <option value="CARD_PAYMENT">دفع فيزا</option>
              <option value="CASH_DEPOSIT">إيداع نقدي</option>
              <option value="CASH_WITHDRAWAL">سحب نقدي</option>
              <option value="DRAWER_TRANSFER">تحويل من الدرج</option>
              <option value="MONEY_TRANSFER_IN">تحويل وارد</option>
              <option value="MONEY_TRANSFER_OUT">تحويل صادر</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">لا توجد معاملات</p>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-600">
                      {getTransactionTypeLabel(transaction.type)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(transaction.createdAt).toLocaleString('ar-EG')}
                    </p>
                    {transaction.notes && (
                      <p className="text-xs text-gray-500 mt-1">{transaction.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <p className={`font-bold ${
                    ['CARD_PAYMENT', 'CASH_DEPOSIT', 'DRAWER_TRANSFER', 'MONEY_TRANSFER_IN'].includes(transaction.type)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {['CARD_PAYMENT', 'CASH_DEPOSIT', 'DRAWER_TRANSFER', 'MONEY_TRANSFER_IN'].includes(transaction.type) ? '+' : '-'}
                    {transaction.amount.toLocaleString('ar-EG')} جنيه
                  </p>
                  <p className="text-xs text-gray-500">
                    الرصيد: {transaction.balanceAfter.toLocaleString('ar-EG')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transfer Money Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">تحويل أموال من المصنع لفرع</h2>
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الفرع المستقبل *</label>
                <select
                  value={transferForm.toBranchId}
                  onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">اختر الفرع</option>
                  {transferableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المبلغ (جنيه) *</label>
                <input
                  type="number"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  الرصيد المتاح: {mainFactoryBalance.toLocaleString('ar-EG')} جنيه
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">السبب *</label>
                <input
                  type="text"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="input-field"
                  placeholder="مثال: تمويل الفرع"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={transferMoneyMutation.isPending}
                >
                  {transferMoneyMutation.isPending ? 'جاري الإرسال...' : 'إرسال التحويل'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="btn-secondary flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prepare Drawer Modal */}
      {showPrepareDrawerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">تجهيز درج للكاشير</h2>
            <form onSubmit={handlePrepareDrawerSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  💡 سيتم خصم المبلغ من خزينة المصنع وتسجيله كرصيد افتتاحي للدرج
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المبلغ (جنيه) *</label>
                <input
                  type="number"
                  value={prepareDrawerForm.amount}
                  onChange={(e) => setPrepareDrawerForm({ ...prepareDrawerForm, amount: e.target.value })}
                  className="input-field"
                  placeholder="500"
                  step="0.01"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  الرصيد المتاح: {mainFactoryBalance.toLocaleString('ar-EG')} جنيه
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الكاشير *</label>
                <select
                  value={prepareDrawerForm.cashierId}
                  onChange={(e) => setPrepareDrawerForm({ ...prepareDrawerForm, cashierId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">اختر الكاشير</option>
                  {cashiers.map((cashier) => (
                    <option key={cashier.id} value={cashier.id}>
                      {cashier.fullName} (@{cashier.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label>
                <textarea
                  value={prepareDrawerForm.notes}
                  onChange={(e) => setPrepareDrawerForm({ ...prepareDrawerForm, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrepareDrawerModal(false)}
                  className="btn-secondary flex-1"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={prepareDrawerMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {prepareDrawerMutation.isPending ? 'جاري التجهيز...' : 'تجهيز الدرج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
