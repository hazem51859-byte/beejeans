import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet as VaultIcon, TrendingUp, TrendingDown, CreditCard, DollarSign, Building } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const vaultAPI = {
  getAllVaults: () => api.get('/vault').then(r => r.data),
  
  getTransactions: (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/vault/transactions?${query}`).then(r => r.data);
  }
};

export default function Vault() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const userBranchId = user?.branchId;
  
  const [selectedBranch, setSelectedBranch] = useState(isAdmin ? 'all' : userBranchId);
  const [transactionType, setTransactionType] = useState('all');

  // Get all vaults
  const { data: vaultsData, isLoading } = useQuery({
    queryKey: ['vaults'],
    queryFn: vaultAPI.getAllVaults
  });

  // Get transactions
  const { data: transactionsData } = useQuery({
    queryKey: ['vault-transactions', selectedBranch, transactionType],
    queryFn: () => vaultAPI.getTransactions({
      ...(selectedBranch !== 'all' && { branchId: selectedBranch }),
      ...(transactionType !== 'all' && { type: transactionType }),
      limit: 100
    })
  });

  const vaults = vaultsData?.data || {};
  const transactions = transactionsData?.data || [];

  // Filter branches for managers - show only their branch
  const displayBranches = isAdmin 
    ? vaults.branches 
    : vaults.branches?.filter(b => b.id === userBranchId);

  // Calculate totals based on displayed branches
  const displayedTotalBalance = displayBranches?.reduce((sum, b) => sum + (b.vaultBalance || 0), 0) || 0;
  const displayedBranchCount = displayBranches?.length || 0;

  const getTransactionTypeLabel = (type) => {
    const types = {
      'CARD_PAYMENT': 'دفع فيزا',
      'CASH_DEPOSIT': 'إيداع نقدي',
      'CASH_WITHDRAWAL': 'سحب نقدي',
      'DRAWER_TRANSFER': 'تحويل من الدرج',
      'OPENING_BALANCE': 'رصيد افتتاحي'
    };
    return types[type] || type;
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'CARD_PAYMENT':
        return <CreditCard size={16} className="text-blue-500" />;
      case 'CASH_DEPOSIT':
      case 'DRAWER_TRANSFER':
        return <TrendingUp size={16} className="text-green-500" />;
      case 'CASH_WITHDRAWAL':
        return <TrendingDown size={16} className="text-red-500" />;
      default:
        return <DollarSign size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <VaultIcon size={28} />
          {isAdmin ? 'الخزينة' : 'خزينة الفرع'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isAdmin ? 'إدارة ومتابعة خزائن جميع الفروع والمدفوعات' : 'متابعة خزينة فرعك والمعاملات'}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Vault Balance */}
            <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{isAdmin ? 'إجمالي الخزائن' : 'رصيد خزينة الفرع'}</h3>
                <VaultIcon size={24} className="opacity-75" />
              </div>
              <p className="text-3xl font-bold">
                {(isAdmin ? vaults.summary?.totalVaultBalance || 0 : displayedTotalBalance).toLocaleString('ar-EG')} جنيه
              </p>
              <p className="text-xs opacity-75 mt-2">
                {isAdmin ? `${vaults.summary?.branchCount || 0} فرع` : user?.branch?.name}
              </p>
            </div>

            {/* Card Payments (Main Vault) - Admin only */}
            {isAdmin && (
              <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">مدفوعات الفيزا</h3>
                  <CreditCard size={24} className="opacity-75" />
                </div>
                <p className="text-3xl font-bold">
                  {(vaults.summary?.totalCardPayments || 0).toLocaleString('ar-EG')} جنيه
                </p>
                <p className="text-xs opacity-75 mt-2">
                  المصنع الرئيسي
                </p>
              </div>
            )}

            {/* Branches Count or Transactions Count */}
            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{isAdmin ? 'عدد الفروع' : 'عدد المعاملات'}</h3>
                <Building size={24} className="opacity-75" />
              </div>
              <p className="text-3xl font-bold">
                {isAdmin ? (vaults.summary?.branchCount || 0) : (displayBranches?.[0]?._count?.vaultTransactions || 0)}
              </p>
              <p className="text-xs opacity-75 mt-2">
                {isAdmin ? 'فروع نشطة' : 'معاملة'}
              </p>
            </div>
          </div>

          {/* Branch Vaults */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4">{isAdmin ? 'خزائن الفروع' : 'تفاصيل الخزينة'}</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4">الفرع</th>
                    <th className="text-right py-3 px-4">الكود</th>
                    <th className="text-right py-3 px-4">رصيد الخزينة</th>
                    <th className="text-right py-3 px-4">عدد المعاملات</th>
                  </tr>
                </thead>
                <tbody>
                  {displayBranches?.map((branch) => (
                    <tr key={branch.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{branch.name}</td>
                      <td className="py-3 px-4 text-gray-600">{branch.code}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-primary-600">
                          {branch.vaultBalance.toLocaleString('ar-EG')} جنيه
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {branch._count.vaultTransactions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card Payments Details - Admin only */}
          {isAdmin && (
            <div className="card">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CreditCard size={20} />
                مدفوعات الفيزا (المصنع الرئيسي)
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {vaults.cardPayments?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">لا توجد مدفوعات فيزا</p>
                ) : (
                  vaults.cardPayments?.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard size={20} className="text-blue-500" />
                        <div>
                          <p className="font-medium">{payment.description}</p>
                          <p className="text-sm text-gray-600">
                            {payment.branch?.name} • {payment.invoiceNumber}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(payment.createdAt).toLocaleString('ar-EG')}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-blue-600">
                          +{payment.amount.toLocaleString('ar-EG')} جنيه
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">سجل المعاملات</h2>
              <div className="flex gap-2">
                {/* Branch selector - Admin only */}
                {isAdmin && (
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="input-field text-sm py-2"
                  >
                    <option value="all">جميع الفروع</option>
                    {vaults.branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                )}

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
                          {transaction.branch?.name}
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
                        ['CARD_PAYMENT', 'CASH_DEPOSIT', 'DRAWER_TRANSFER'].includes(transaction.type)
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {['CARD_PAYMENT', 'CASH_DEPOSIT', 'DRAWER_TRANSFER'].includes(transaction.type) ? '+' : '-'}
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
        </>
      )}
    </div>
  );
}
