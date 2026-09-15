import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { returnsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Plus, Eye, CheckCircle, Package, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReturnsManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerDecision, setManagerDecision] = useState('');
  const [managerNotes, setManagerNotes] = useState('');

  // جلب المرتجعات
  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['returns', statusFilter],
    queryFn: () => returnsAPI.getAll({ 
      status: statusFilter === 'all' ? undefined : statusFilter 
    })
  });

  // جلب الإحصائيات
  const { data: statsData } = useQuery({
    queryKey: ['returns-stats'],
    queryFn: () => returnsAPI.getStats({})
  });

  const returns = Array.isArray(returnsData?.data) ? returnsData.data : (Array.isArray(returnsData?.data?.data) ? returnsData.data.data : []);
  const stats = statsData?.data || {};

  // مراجعة المانجر
  const managerReviewMutation = useMutation({
    mutationFn: ({ id, data }) => returnsAPI.managerReview(id, data),
    onSuccess: () => {
      toast.success('تم مراجعة المرتجع بنجاح');
      queryClient.invalidateQueries(['returns']);
      queryClient.invalidateQueries(['returns-stats']);
      setShowManagerModal(false);
      setSelectedReturn(null);
      setManagerDecision('');
      setManagerNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في مراجعة المرتجع');
    }
  });

  const handleManagerReview = () => {
    if (!managerDecision) {
      toast.error('يجب اختيار القرار');
      return;
    }

    managerReviewMutation.mutate({
      id: selectedReturn.id,
      data: {
        decision: managerDecision,
        notes: managerNotes
      }
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING_MANAGER': 'bg-yellow-100 text-yellow-800',
      'SENT_TO_LOCAL': 'bg-blue-100 text-blue-800',
      'SENT_TO_MAIN': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-green-100 text-green-800'
    };
    
    const labels = {
      'PENDING_MANAGER': 'في انتظار المانجر',
      'SENT_TO_LOCAL': 'تم الإرسال للمخزن المحلي',
      'SENT_TO_MAIN': 'تم الإرسال للمخزن الرئيسي',
      'COMPLETED': 'مكتمل'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-bold ${badges[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة المرتجعات</h1>
        {(user?.role === 'CASHIER' || user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
          <button
            onClick={() => navigate('/create-return')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            مرتجع جديد
          </button>
        )}
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-red-50 border-2 border-red-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500 rounded-full">
              <TrendingDown size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">إجمالي المرتجعات</p>
              <p className="text-2xl font-bold">{stats.totalReturns || 0}</p>
            </div>
          </div>
        </div>

        <div className="card bg-orange-50 border-2 border-orange-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500 rounded-full">
              <Package size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">إجمالي القطع</p>
              <p className="text-2xl font-bold">{stats.totalItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="card bg-purple-50 border-2 border-purple-200">
          <div>
            <p className="text-sm text-gray-600 mb-2">قيمة البيع المرتجعة</p>
            <p className="text-2xl font-bold text-purple-600">
              {(stats.totalSaleAmount || 0).toFixed(2)} ج.م
            </p>
          </div>
        </div>

        <div className="card bg-red-50 border-2 border-red-300">
          <div>
            <p className="text-sm text-gray-600 mb-2">قيمة التكلفة المرتجعة</p>
            <p className="text-2xl font-bold text-red-600">
              {(stats.totalCostAmount || 0).toFixed(2)} ج.م
            </p>
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded ${statusFilter === 'all' ? 'bg-primary-500 text-white' : 'bg-gray-100'}`}
          >
            الكل ({stats.totalReturns || 0})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING_MANAGER')}
            className={`px-4 py-2 rounded ${statusFilter === 'PENDING_MANAGER' ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}
          >
            في انتظار المانجر ({stats.byStatus?.PENDING_MANAGER || 0})
          </button>
          <button
            onClick={() => setStatusFilter('SENT_TO_LOCAL')}
            className={`px-4 py-2 rounded ${statusFilter === 'SENT_TO_LOCAL' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            المخزن المحلي ({stats.byStatus?.SENT_TO_LOCAL || 0})
          </button>
          <button
            onClick={() => setStatusFilter('SENT_TO_MAIN')}
            className={`px-4 py-2 rounded ${statusFilter === 'SENT_TO_MAIN' ? 'bg-purple-500 text-white' : 'bg-gray-100'}`}
          >
            المخزن الرئيسي ({stats.byStatus?.SENT_TO_MAIN || 0})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-4 py-2 rounded ${statusFilter === 'COMPLETED' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
          >
            مكتمل ({stats.byStatus?.COMPLETED || 0})
          </button>
        </div>
      </div>

      {/* جدول المرتجعات */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-right">رقم المرتجع</th>
              <th className="px-4 py-2 text-right">رقم الفاتورة</th>
              <th className="px-4 py-2 text-right">الفرع</th>
              <th className="px-4 py-2 text-center">عدد القطع</th>
              <th className="px-4 py-2 text-center">قيمة التكلفة</th>
              <th className="px-4 py-2 text-center">السبب</th>
              <th className="px-4 py-2 text-center">الحالة</th>
              <th className="px-4 py-2 text-center">التاريخ</th>
              <th className="px-4 py-2 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="9" className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </td>
              </tr>
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500">
                  لا توجد مرتجعات
                </td>
              </tr>
            ) : (
              returns.map((returnItem) => (
                <tr key={returnItem.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className="font-bold text-blue-600">{returnItem.returnNumber}</span>
                  </td>
                  <td className="px-4 py-2">{returnItem.sale?.invoiceNumber}</td>
                  <td className="px-4 py-2">{returnItem.branch?.name}</td>
                  <td className="px-4 py-2 text-center font-bold">
                    {returnItem.items?.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="px-4 py-2 text-center font-bold text-red-600">
                    {returnItem.totalCostAmount.toFixed(2)} ج.م
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">{returnItem.returnReason}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {getStatusBadge(returnItem.status)}
                  </td>
                  <td className="px-4 py-2 text-center text-sm">
                    {new Date(returnItem.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setSelectedReturn(returnItem);
                          setShowDetailModal(true);
                        }}
                        className="btn-secondary text-sm flex items-center gap-1"
                      >
                        <Eye size={16} />
                        عرض
                      </button>
                      {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && 
                       returnItem.status === 'PENDING_MANAGER' && (
                        <button
                          onClick={() => {
                            setSelectedReturn(returnItem);
                            setShowManagerModal(true);
                          }}
                          className="btn-primary text-sm flex items-center gap-1"
                        >
                          <CheckCircle size={16} />
                          مراجعة
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: تفاصيل المرتجع */}
      {showDetailModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">تفاصيل المرتجع</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedReturn(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* معلومات أساسية */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded">
                <div>
                  <span className="text-sm text-gray-600">رقم المرتجع:</span>
                  <p className="font-bold">{selectedReturn.returnNumber}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">رقم الفاتورة:</span>
                  <p className="font-bold">{selectedReturn.sale?.invoiceNumber}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">الفرع:</span>
                  <p className="font-bold">{selectedReturn.branch?.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">العميل:</span>
                  <p className="font-bold">{selectedReturn.customerName || 'غير محدد'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">طريقة الاسترداد:</span>
                  <p className="font-bold">{selectedReturn.refundMethod}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">الحالة:</span>
                  <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                </div>
              </div>

              {/* المنتجات المرتجعة */}
              <div className="mb-6">
                <h3 className="font-bold mb-3 text-lg">المنتجات المرتجعة:</h3>
                <div className="overflow-x-auto border rounded">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-right">المنتج</th>
                        <th className="px-4 py-2 text-center">الكمية</th>
                        <th className="px-4 py-2 text-center">سعر التكلفة</th>
                        <th className="px-4 py-2 text-center">السبب</th>
                        <th className="px-4 py-2 text-center">الحالة</th>
                        <th className="px-4 py-2 text-center">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReturn.items?.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">
                            <p className="font-bold">{item.product?.name}</p>
                            <p className="text-sm text-gray-500">{item.product?.sku}</p>
                          </td>
                          <td className="px-4 py-2 text-center font-bold">{item.quantity}</td>
                          <td className="px-4 py-2 text-center">{item.unitCostPrice.toFixed(2)} ج.م</td>
                          <td className="px-4 py-2 text-center text-sm">{item.returnReason}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.condition === 'GOOD' ? 'bg-green-100 text-green-800' :
                              item.condition === 'DAMAGED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.condition === 'GOOD' ? 'جيدة' : 
                               item.condition === 'DAMAGED' ? 'تالفة' : 'معيبة'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-bold text-red-600">
                            {item.totalCostPrice.toFixed(2)} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold">
                      <tr>
                        <td colSpan="6" className="px-4 py-2 text-right">الإجمالي:</td>
                        <td className="px-4 py-2 text-center text-red-600 text-lg">
                          {selectedReturn.totalCostAmount.toFixed(2)} ج.م
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* قرار المانجر */}
              {selectedReturn.managerDecision && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                  <h3 className="font-bold mb-2">قرار المانجر:</h3>
                  <p className="mb-1">
                    <span className="font-bold">القرار:</span> {
                      selectedReturn.managerDecision === 'SEND_TO_LOCAL' ? '✓ إرسال للمخزن المحلي' : '✓ إرسال للمخزن الرئيسي'
                    }
                  </p>
                  {selectedReturn.managerNotes && (
                    <p><span className="font-bold">ملاحظات:</span> {selectedReturn.managerNotes}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    بواسطة: {selectedReturn.reviewedByManager?.fullName} - 
                    {new Date(selectedReturn.managerReviewAt).toLocaleString('ar-EG')}
                  </p>
                </div>
              )}

              {selectedReturn.notes && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="font-bold mb-2">ملاحظات:</h3>
                  <p>{selectedReturn.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: مراجعة المانجر */}
      {showManagerModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">مراجعة المرتجع</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded border">
              <p className="mb-2"><span className="font-bold">رقم المرتجع:</span> {selectedReturn.returnNumber}</p>
              <p className="mb-2"><span className="font-bold">عدد القطع:</span> {selectedReturn.items?.reduce((sum, item) => sum + item.quantity, 0)}</p>
              <p><span className="font-bold">قيمة التكلفة:</span> <span className="text-red-600 font-bold">{selectedReturn.totalCostAmount.toFixed(2)} ج.م</span></p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">القرار *</label>
              <select
                value={managerDecision}
                onChange={(e) => setManagerDecision(e.target.value)}
                className="input-field"
                required
              >
                <option value="">-- اختر القرار --</option>
                <option value="SEND_TO_LOCAL">إرسال للمخزن المحلي</option>
                <option value="SEND_TO_MAIN">إرسال للمخزن الرئيسي</option>
              </select>
              <p className="text-sm text-gray-600 mt-2">
                {managerDecision === 'SEND_TO_LOCAL' && '✓ سيتم إرجاع المنتجات لمخزون هذا الفرع'}
                {managerDecision === 'SEND_TO_MAIN' && '✓ سيتم إرجاع المنتجات للمخزن الرئيسي'}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">ملاحظات</label>
              <textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                className="input-field"
                rows="3"
                placeholder="أي ملاحظات إضافية..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleManagerReview}
                disabled={!managerDecision || managerReviewMutation.isPending}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {managerReviewMutation.isPending ? 'جاري الحفظ...' : '✓ تأكيد القرار'}
              </button>
              <button
                onClick={() => {
                  setShowManagerModal(false);
                  setSelectedReturn(null);
                  setManagerDecision('');
                  setManagerNotes('');
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
