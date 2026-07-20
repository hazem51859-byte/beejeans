import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DollarSign, Clock, User, Wallet, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function ShiftManagement() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [amountToVault, setAmountToVault] = useState(''); // المبلغ اللي هيروح للخزينة
  const [drawerNotes, setDrawerNotes] = useState('');

  // Get closed shifts (with money in drawer)
  const { data: shiftsData } = useQuery({
    queryKey: ['closed-shifts', user?.branchId],
    queryFn: async () => {
      const response = await api.get(`/shifts/branch/${user?.branchId}`, {
        params: {
          status: 'CLOSED'
        }
      });
      return response.data;
    }
  });

  // Get vault balance
  const { data: vaultData } = useQuery({
    queryKey: ['vault', user?.branchId],
    queryFn: async () => {
      const response = await api.get('/vault');
      return response.data;
    }
  });

  const transferDrawerMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/vault/transfer-drawer', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['closed-shifts']);
      queryClient.invalidateQueries(['vault']);
      setShowDrawerModal(false);
      setSelectedShift(null);
      setAmountToVault('');
      setDrawerNotes('');
      toast.success('تم سحب الأموال ونقلها للخزينة بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'حدث خطأ في نقل الأموال');
    }
  });

  const shifts = shiftsData?.data || [];
  const vaultBalance = vaultData?.data?.branches?.find(b => b.id === user?.branchId)?.vaultBalance || 0;

  const handleTransferDrawer = () => {
    const totalInDrawer = selectedShift?.actualCash || 0;
    const toVault = parseFloat(amountToVault);
    
    if (!amountToVault || toVault <= 0) {
      toast.error('الرجاء إدخال المبلغ المراد سحبه للخزينة');
      return;
    }

    if (toVault > totalInDrawer) {
      toast.error(`لا يمكن سحب ${toVault} ج.م - المبلغ في الدرج ${totalInDrawer} ج.م فقط`);
      return;
    }

    const remainingInDrawer = totalInDrawer - toVault;

    if (!window.confirm(
      `سحب ${toVault.toFixed(2)} ج.م للخزينة\n` +
      `الباقي في الدرج: ${remainingInDrawer.toFixed(2)} ج.م\n\n` +
      `هل أنت متأكد؟`
    )) {
      return;
    }

    transferDrawerMutation.mutate({
      shiftId: selectedShift.id,
      amountToVault: toVault,
      notes: drawerNotes
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet size={28} />
          إدارة الشيفتات والدرج
        </h1>
        <p className="text-gray-600 mt-1">تجريد الأدراج ونقل الأموال للخزينة</p>
      </div>

      {/* Vault Balance */}
      <div className="card bg-gradient-to-br from-green-50 to-green-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">رصيد الخزينة الحالي</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{vaultBalance.toFixed(2)} ج.م</p>
          </div>
          <Wallet className="text-green-600" size={48} />
        </div>
      </div>

      {/* Closed Shifts */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">الشيفتات المغلقة (بانتظار تجريد الدرج)</h2>
        
        {shifts && shifts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-3 text-sm">رقم الشيفت</th>
                  <th className="text-right p-3 text-sm">الكاشير</th>
                  <th className="text-right p-3 text-sm">تاريخ الفتح</th>
                  <th className="text-right p-3 text-sm">تاريخ الإغلاق</th>
                  <th className="text-center p-3 text-sm">الرصيد الافتتاحي</th>
                  <th className="text-center p-3 text-sm">الرصيد المسجل</th>
                  <th className="text-center p-3 text-sm">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono">{shift.shiftNumber}</td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User size={16} />
                        {shift.cashier?.fullName}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {new Date(shift.openedAt).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3 text-sm">
                      {shift.closedAt ? new Date(shift.closedAt).toLocaleString('ar-EG') : '-'}
                    </td>
                    <td className="p-3 text-sm text-center font-medium">
                      {shift.openingBalance.toFixed(2)} ج.م
                    </td>
                    <td className="p-3 text-sm text-center font-bold text-green-700">
                      {shift.actualCash?.toFixed(2)} ج.م
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedShift(shift);
                          setAmountToVault('');
                          setShowDrawerModal(true);
                        }}
                        className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 text-sm flex items-center gap-2 mx-auto"
                      >
                        <TrendingUp size={16} />
                        سحب من الدرج
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">لا توجد شيفتات بانتظار تجريد الدرج</p>
        )}
      </div>

      {/* Drawer Transfer Modal */}
      {showDrawerModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">سحب الأموال من الدرج</h2>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">رقم الشيفت:</span>
                  <p className="font-bold">{selectedShift.shiftNumber}</p>
                </div>
                <div>
                  <span className="text-gray-600">الكاشير:</span>
                  <p className="font-bold">{selectedShift.user?.fullName}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-blue-200">
                  <span className="text-gray-600">المبلغ في الدرج:</span>
                  <p className="font-bold text-2xl text-green-700">
                    {selectedShift.actualCash?.toFixed(2)} ج.م
                  </p>
                  <p className="text-xs text-gray-500 mt-1">⚠️ هذا الرقم غير قابل للتعديل</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  كم تريد سحبه للخزينة؟ *
                </label>
                <input
                  type="number"
                  value={amountToVault}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val <= selectedShift.actualCash || e.target.value === '') {
                      setAmountToVault(e.target.value);
                    }
                  }}
                  max={selectedShift.actualCash}
                  className="input-field text-lg font-bold"
                  placeholder="0.00"
                  step="0.01"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  الحد الأقصى: {selectedShift.actualCash?.toFixed(2)} ج.م
                </p>
              </div>

              {/* حساب تلقائي */}
              {amountToVault && parseFloat(amountToVault) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-600">المبلغ في الدرج:</span>
                    <span className="font-bold">{selectedShift.actualCash?.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-600">المسحوب للخزينة:</span>
                    <span className="font-bold text-red-600">- {parseFloat(amountToVault).toFixed(2)} ج.م</span>
                  </div>
                  <div className="border-t border-green-300 pt-2 flex justify-between items-center">
                    <span className="font-bold text-gray-700">الباقي في الدرج:</span>
                    <span className="font-bold text-xl text-green-700">
                      {(selectedShift.actualCash - parseFloat(amountToVault)).toFixed(2)} ج.م
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    💡 هذا المبلغ سيكون متاحاً للكاشير القادم
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  className="input-field"
                  rows="2"
                  placeholder="أي ملاحظات..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTransferDrawer}
                  disabled={transferDrawerMutation.isPending}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {transferDrawerMutation.isPending ? 'جاري السحب...' : 'سحب للخزينة'}
                </button>
                <button
                  onClick={() => {
                    setShowDrawerModal(false);
                    setSelectedShift(null);
                    setAmountToVault('');
                    setDrawerNotes('');
                  }}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
