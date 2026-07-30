import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import {
  ArrowRight, Save, CheckCircle, AlertCircle,
  TrendingDown, TrendingUp, Package, DollarSign,
  Edit2, Check, X
} from 'lucide-react';

export default function AuditDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAudit();
  }, [id]);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/audits/${id}`);
      
      if (response.data.success) {
        setAudit(response.data.audit);
      }
    } catch (error) {
      console.error('Error fetching audit:', error);
      alert('حدث خطأ أثناء جلب الجرد');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setEditValue(item.actualQty !== null ? item.actualQty.toString() : '');
    setEditNotes(item.notes || '');
  };

  const handleSaveItem = async (itemId) => {
    const actualQty = parseInt(editValue);
    
    if (isNaN(actualQty) || actualQty < 0) {
      alert('الكمية غير صحيحة');
      return;
    }

    try {
      setSaving(true);
      const response = await api.patch(`/audits/items/${itemId}`, {
        actualQty,
        notes: editNotes
      });

      if (response.data.success) {
        // تحديث العنصر في القائمة
        setAudit(prev => ({
          ...prev,
          items: (prev.items || []).map(item =>
            item.id === itemId ? response.data.item : item
          )
        }));
        setEditingItemId(null);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteAudit = async () => {
    const unauditedItems = audit.items.filter(item => item.actualQty === null);
    
    if (unauditedItems.length > 0) {
      alert(`يجب جرد جميع العناصر. العناصر المتبقية: ${unauditedItems.length}`);
      return;
    }

    if (!confirm('هل أنت متأكد من إكمال الجرد؟ لن تتمكن من التعديل بعد ذلك.')) {
      return;
    }

    try {
      setSaving(true);
      const response = await api.post(`/audits/${id}/complete`);

      if (response.data.success) {
        alert('تم إكمال الجرد بنجاح');
        setAudit(response.data.audit);
      }
    } catch (error) {
      console.error('Error completing audit:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء إكمال الجرد');
    } finally {
      setSaving(false);
    }
  };

  const handleSettleAudit = async () => {
    if (!confirm('هل أنت متأكد من تسوية الجرد؟ سيتم تحديث الكميات في المخزن.')) {
      return;
    }

    try {
      setSaving(true);
      const response = await api.post(`/audits/${id}/settle`);

      if (response.data.success) {
        alert('تم تسوية الجرد وتحديث المخزون بنجاح');
        setAudit(response.data.audit);
      }
    } catch (error) {
      console.error('Error settling audit:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء التسوية');
    } finally {
      setSaving(false);
    }
  };

  const getDifferenceColor = (type) => {
    if (type === 'SHORTAGE') return 'text-red-600';
    if (type === 'SURPLUS') return 'text-green-600';
    return 'text-gray-600';
  };

  const getDifferenceIcon = (type) => {
    if (type === 'SHORTAGE') return <TrendingDown className="w-4 h-4" />;
    if (type === 'SURPLUS') return <TrendingUp className="w-4 h-4" />;
    return <Check className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-500">جاري التحميل...</div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-500">الجرد غير موجود</div>
      </div>
    );
  }

  // Check if items exist, otherwise use empty array
  const items = audit.items || [];
  const auditedItemsCount = items.filter(item => item.actualQty !== null).length;
  const progress = audit.totalItems > 0 ? (auditedItemsCount / audit.totalItems) * 100 : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/audit')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{audit.auditNumber}</h1>
            <p className="text-gray-600">{audit.branch.name}</p>
          </div>
        </div>

        {audit.status === 'IN_PROGRESS' && user?.role === 'ADMIN' && (
          <button
            onClick={handleCompleteAudit}
            disabled={saving || auditedItemsCount < audit.totalItems}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-5 h-5" />
            إكمال الجرد
          </button>
        )}

        {audit.status === 'COMPLETED' && user?.role === 'ADMIN' && (
          <button
            onClick={handleSettleAudit}
            disabled={saving}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
          >
            <Save className="w-5 h-5" />
            تسوية الجرد
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {audit.status === 'IN_PROGRESS' && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">تقدم الجرد</span>
            <span className="text-sm text-gray-600">
              {auditedItemsCount} / {audit.totalItems} منتج
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {(audit.status === 'COMPLETED' || audit.status === 'SETTLED') && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">إجمالي الأصناف</div>
                <div className="text-2xl font-bold">{audit.totalItems}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <div>
                <div className="text-sm text-gray-500">عجز</div>
                <div className="text-2xl font-bold text-red-600">{audit.totalShortageQty}</div>
                <div className="text-xs text-gray-500">{audit.totalShortageValue.toFixed(2)} ج.م</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-sm text-gray-500">زيادة</div>
                <div className="text-2xl font-bold text-green-600">{audit.totalSurplusQty}</div>
                <div className="text-xs text-gray-500">{audit.totalSurplusValue.toFixed(2)} ج.م</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-orange-600" />
              <div>
                <div className="text-sm text-gray-500">صافي الفرق</div>
                <div className={`text-2xl font-bold ${audit.totalShortageValue > audit.totalSurplusValue ? 'text-red-600' : 'text-green-600'}`}>
                  {(audit.totalSurplusValue - audit.totalShortageValue).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">ج.م</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">الكمية المتوقعة</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">المرتجعات</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">الإجمالي المتوقع</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">الكمية الفعلية</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">الفرق</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">القيمة</th>
                {audit.status === 'IN_PROGRESS' && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audit.items.map(item => {
                const isEditing = editingItemId === item.id;
                const totalExpected = item.expectedQty + item.returnedQty;

                return (
                  <tr key={item.id} className={item.actualQty === null ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                      <div className="text-sm text-gray-500">{item.product.sku}</div>
                      {item.product.size && (
                        <span className="text-xs text-gray-400">مقاس: {item.product.size}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">{item.expectedQty}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{item.returnedQty}</td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">{totalExpected}</td>
                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                          autoFocus
                          min="0"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {item.actualQty !== null ? item.actualQty : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.actualQty !== null && (
                        <div className={`flex items-center justify-center gap-1 font-medium ${getDifferenceColor(item.differenceType)}`}>
                          {getDifferenceIcon(item.differenceType)}
                          <span>{item.differenceQty > 0 ? '+' : ''}{item.differenceQty}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.differenceValue > 0 && (
                        <span className={`text-sm font-medium ${getDifferenceColor(item.differenceType)}`}>
                          {item.differenceValue.toFixed(2)} ج.م
                        </span>
                      )}
                    </td>
                    {audit.status === 'IN_PROGRESS' && (
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSaveItem(item.id)}
                              disabled={saving}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {audit.notes && (
        <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
          <h3 className="font-medium text-gray-800 mb-2">ملاحظات</h3>
          <p className="text-gray-600">{audit.notes}</p>
        </div>
      )}
    </div>
  );
}
