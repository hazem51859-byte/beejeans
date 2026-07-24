import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DoorOpen, DoorClosed, User, Lock, Store } from 'lucide-react';
import { shiftAPI, authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

export default function Settings() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'profile' : 'shift');
  const [closingData, setClosingData] = useState({
    notes: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Get current shift (only for non-admin users)
  const { data: shiftData, refetch: refetchShift } = useQuery({
    queryKey: ['current-shift'],
    queryFn: shiftAPI.getCurrent,
    enabled: !isAdmin,
  });

  const currentShift = shiftData?.data?.data;

  // Open shift mutation
  const openShiftMutation = useMutation({
    mutationFn: shiftAPI.open,
    onSuccess: (response) => {
      const openingBalance = response?.data?.data?.openingBalance || 0;
      toast.success(`تم فتح الشيفت برصيد ${openingBalance.toLocaleString('ar-EG')} ج.م`);
      refetchShift();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في فتح الشيفت');
    },
  });

  // Close shift mutation
  const closeShiftMutation = useMutation({
    mutationFn: ({ id, data }) => shiftAPI.close(id, data),
    onSuccess: (response) => {
      const message = response?.data?.message || 'تم إغلاق الشيفت بنجاح';
      toast.success(message);
      setClosingData({ notes: '' });
      queryClient.invalidateQueries(['current-shift']); // Force refresh
      refetchShift();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في إغلاق الشيفت');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: authAPI.changePassword,
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور بنجاح');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في تغيير كلمة المرور');
    },
  });

  const handleOpenShift = () => {
    if (!window.confirm('هل أنت متأكد من فتح شيفت جديد؟')) {
      return;
    }

    openShiftMutation.mutate({
      branchId: user.branchId
    });
  };

  const handleCloseShift = () => {
    if (!window.confirm('هل أنت متأكد من إغلاق الشيفت؟ سيتم حساب المبلغ في الدرج تلقائياً')) {
      return;
    }

    closeShiftMutation.mutate({
      id: currentShift.id,
      data: {
        notes: closingData.notes,
      },
    });
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const tabs = [
    ...(!isAdmin ? [{ id: 'shift', name: 'إدارة الشيفت', icon: DoorOpen }] : []),
    { id: 'profile', name: 'الملف الشخصي', icon: User },
    { id: 'security', name: 'الأمان', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>
        <p className="text-gray-600">{isAdmin ? 'إدارة الحساب' : 'إدارة الحساب والشيفتات'}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Shift Management Tab - Only for non-admin users */}
      {(!isAdmin && activeTab === 'shift') && (
        <div className="space-y-6">
          {currentShift ? (
            <>
              {/* Current Shift Info */}
              <div className="card bg-green-50 border-2 border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <DoorOpen className="text-green-600" size={32} />
                  <div>
                    <h3 className="font-bold text-green-800 text-lg">الشيفت الحالي مفتوح</h3>
                    <p className="text-sm text-green-700">رقم الشيفت: {currentShift.shiftNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-green-700">وقت الفتح</p>
                    <p className="font-semibold text-green-900">
                      {dayjs(currentShift.openedAt).format('DD/MM/YYYY - HH:mm')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">الرصيد الافتتاحي</p>
                    <p className="font-semibold text-green-900">
                      {currentShift.openingBalance} جنيه
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">إجمالي المبيعات</p>
                    <p className="font-semibold text-green-900">
                      {currentShift.totalSales} جنيه
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">عدد المعاملات</p>
                    <p className="font-semibold text-green-900">
                      {currentShift.totalTransactions}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Shift Form */}
              <div className="card">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <DoorClosed size={24} />
                  إغلاق الشيفت
                </h3>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-medium">
                      ℹ️ سيتم حساب المبلغ في الدرج تلقائياً:
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      الرصيد الافتتاحي ({currentShift.openingBalance} ج.م) + المبيعات النقدية
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label>
                    <textarea
                      value={closingData.notes}
                      onChange={(e) => setClosingData({ ...closingData, notes: e.target.value })}
                      className="input-field"
                      rows="3"
                      placeholder="أي ملاحظات على الشيفت..."
                    />
                  </div>

                  <button
                    onClick={handleCloseShift}
                    disabled={closeShiftMutation.isPending}
                    className="btn-danger w-full disabled:opacity-50"
                  >
                    {closeShiftMutation.isPending ? 'جاري الإغلاق...' : 'إغلاق الشيفت'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <DoorOpen className="text-primary-600" size={32} />
                <div>
                  <h3 className="font-bold text-lg">فتح شيفت جديد</h3>
                  <p className="text-sm text-gray-600">
                    قم بفتح شيفت جديد للبدء في عمليات البيع
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>ملاحظة:</strong> الرصيد الافتتاحي سيكون تلقائياً = آخر رصيد في الدرج
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    إذا كان هذا أول شيفت اليوم، سيستخدم الرصيد الذي جهزه المانجر من الخزينة
                  </p>
                </div>

                <button
                  onClick={handleOpenShift}
                  disabled={openShiftMutation.isPending}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {openShiftMutation.isPending ? 'جاري الفتح...' : 'فتح شيفت جديد'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center">
              <User className="text-primary-600" size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg">{user?.fullName}</h3>
              <p className="text-gray-600">@{user?.username}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">البريد الإلكتروني</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">رقم الهاتف</span>
              <span className="font-medium">{user?.phone || '-'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">الصلاحية</span>
              <span className="font-medium">
                {user?.role === 'ADMIN' ? 'مدير' : user?.role === 'MANAGER' ? 'مدير فرع' : 'كاشير'}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">الفرع</span>
              <span className="font-medium">{user?.branch?.name || '-'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Lock size={24} />
            تغيير كلمة المرور
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور الحالية</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              className="btn-primary w-full disabled:opacity-50"
            >
              {changePasswordMutation.isPending ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
