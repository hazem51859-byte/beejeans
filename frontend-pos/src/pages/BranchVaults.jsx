import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Building, DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import api from '../services/api';

export default function BranchVaults() {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [transactionType, setTransactionType] = useState('all');

  // Get all vaults
  const { data: vaultsData, isLoading } = useQuery({
    queryKey: ['vaults'],
    queryFn: () => api.get('/vault').then(r => r.data)
  });

  // Get transactions
  const { data: transactionsData } = useQuery({
    queryKey: ['vault-transactions', selectedBranch, transactionType],
    queryFn: () => {
      const params = new URLSearchParams({
        ...(selectedBranch !== 'all' && { branchId: selectedBranch }),
        ...(transactionType !== 'all' && { type: transactionType }),
        limit: '100'
      });
      return api.get(`/vault/transactions?${params}`).then(r => r.data);
    }
  });

  const vaults = vaultsData?.data || {};
  const transactions = transactionsData?.data || [];
  const branches = vaults.branches || [];

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'CARD_PAYMENT':
        return <CreditCard size={16} className="text-blue-500" />;
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet size={28} className="text-emerald-600" />
          خزائن الفروع
        </h1>
        <p className="text-gray-600 mt-1">
          متابعة خزائن جميع الفروع والمعاملات
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Vault Balance */}
        <div className="card bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">إجمالي خزائن الفروع</h3>
            <Wallet size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">
            {(vaults.summary?.totalVaultBalance || 0).toLocaleString('ar-EG')} جنيه
          </p>
          <p className="text-xs opacity-75 mt-2">
            نقدي في الخزائن
          </p>
        </div>

        {/* Card Payments */}
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">إجمالي الفيزا</h3>
            <CreditCard size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">
            {(vaults.summary?.totalCardVaultBalance || 0).toLocaleString('ar-EG')} جنيه
          </p>
          <p className="text-xs opacity-75 mt-2">
            معاملات الفيزا
          </p>
        </div>

        {/* Branches Count */}
        <div className="card bg-gradient-to-br from-slate-600 to-slate-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">عدد الفروع</h3>
            <Building size={24} className="opacity-75" />
          </div>
          <p className="text-3xl font-bold">
            {vaults.summary?.branchCount || 0}
          </p>
          <p className="text-xs opacity-75 mt-2">
            فروع نشطة
          </p>
        </div>
      </div>

      {/* Branch Vaults */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Building size={20} className="text-emerald-600" />
          خزائن الفروع
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-right py-3 px-4 font-semibold">الفرع</th>
                <th className="text-right py-3 px-4 font-semibold">الكود</th>
                <th className="text-right py-3 px-4 font-semibold">الخزينة (نقدي)</th>
                <th className="text-right py-3 px-4 font-semibold">الفيزا</th>
                <th className="text-right py-3 px-4 font-semibold">عدد المعاملات</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{branch.name}</td>
                  <td className="py-3 px-4 text-gray-600">{branch.code}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-emerald-600">
                      {branch.vaultBalance.toLocaleString('ar-EG')} ج
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-blue-600">
                      {(branch.cardVaultBalance || 0).toLocaleString('ar-EG')} ج
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {branch._count.vaultTransactions}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-slate-50 font-bold">
                <td className="py-3 px-4" colSpan="2">الإجمالي</td>
                <td className="py-3 px-4 text-emerald-600">
                  {branches.reduce((sum, b) => sum + b.vaultBalance, 0).toLocaleString('ar-EG')} ج
                </td>
                <td className="py-3 px-4 text-blue-600">
                  {branches.reduce((sum, b) => sum + (b.cardVaultBalance || 0), 0).toLocaleString('ar-EG')} ج
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {branches.reduce((sum, b) => sum + b._count.vaultTransactions, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">سجل المعاملات</h2>
          <div className="flex gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">جميع الفروع</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

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
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-600">
                      {transaction.branch?.name} • {getTransactionTypeLabel(transaction.type)}
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
                    {transaction.amount.toLocaleString('ar-EG')} ج
                  </p>
                  <p className="text-xs text-gray-500">
                    الرصيد: {transaction.balanceAfter.toLocaleString('ar-EG')} ج
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
