import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DoorOpen, DoorClosed, User, Lock, Store } from 'lucide-react';
import { shiftAPI, authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('shift');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingData, setClosingData] = useState({
    actualCash: '',
    notes: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Get current shift
  const { data: shiftData, refetch: refetchShift } = useQuery({
    queryKey: ['current-shift'],
    queryFn: shiftAPI.getCurrent,
  });

  const currentShift = shiftData?.data?.data;

  // Open shift mutation
  const openShiftMutation = useMutation({
    mutationFn: shiftAPI.open,
    onSuccess: () => {
      toast.success('تم فتح الشيفت بنجاح');
      setOpeningBalance('');
      refetchShift();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في فتح الشيفت');
    },
  });

  // Close shift mutation
  const closeShiftMutation = useMutation({
    mutationFn: ({ id, data }) => shiftAPI.close(id, data),
    onSuccess: () => {
      toast.success('تم إغلاق الشيفت بنجاح');
      setClosingData({ actualCash: '', notes: '' });
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
    if (!openingBalance || parseFloat(openingBalance) < 0) {
      toast.error('الرجاء إدخال رصيد افتتاحي صحيح');
      return;
    }

    openShiftMutation.mutate({
      branchId: user.branchId,
      openingBalance: parseFloat(openingBalance),
    });
  };

  const handleCloseShift = () => {
    if (!closingData.actualCash || parseFloat(closingData.actualCash) < 0) {
      toast.error('الرجاء إدخال الرصيد النقدي الفعلي');
      return;
    }

    if (!window.confirm('هل أنت متأكد من إغلاق الشيفت؟ لا يمكن التراجع عن هذا الإجراء')) {
      return;
    }

    closeShiftMutation.mutate({
      id: currentShift.id,
      data: {
        actualCash: parseFloat(closingData.actualCash),
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
    { id: 'shift', name: 'إدارة الشيفت', icon: DoorOpen },
    { id: 'profile', name: 'الملف الشخصي', icon: User },
    { id: 'security', name: 'الأمان', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>
        <p className="text-gray-600">إدارة الحساب والشيفتات</p>
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

      {/* Shift Management Tab */}
      {activeTab === 'shift' && (
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
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      الرصيد النقدي الفعلي *
                    </label>
                    <input
                      type="number"
                      value={closingData.actualCash}
                      onChange={(e) => setClosingData({ ...closingData, actualCash: e.target.value })}
                      className="input-field"
                      placeholder="0.00"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      قم بعد النقود في الكاشير وأدخل المبلغ الفعلي
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
                <div>
                  <label className="block text-sm font-medium mb-2">
                    الرصيد الافتتاحي *
                  </label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                    step="0.01"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    المبلغ النقدي الموجود في الكاشير عند بداية الشيفت
                  </p>
                </div>

                <button
                  onClick={handleOpenShift}
                  disabled={openShiftMutation.isPending}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {openShiftMutation.isPending ? 'جاري الفتح...' : 'فتح الشيفت'}
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
