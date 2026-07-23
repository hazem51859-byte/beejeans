import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Package, MapPin } from 'lucide-react';
import { inventoryAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export default function Inventory() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || '');

  // Fetch branches list for ADMIN
  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data;
    },
    enabled: isAdmin,
  });

  const branches = branchesResponse?.data || [];

  // Auto-select MAIN branch or first available branch for ADMIN if no branch is selected
  useEffect(() => {
    if (isAdmin && branches.length > 0 && !selectedBranchId) {
      const main = branches.find(b => b.code === 'MAIN');
      if (main) {
        setSelectedBranchId(main.id);
      } else {
        setSelectedBranchId(branches[0].id);
      }
    }
  }, [branches, selectedBranchId, isAdmin]);

  // If selectedBranchId is still empty (e.g. non-admin has no branchId), use user's branchId
  const branchToQuery = selectedBranchId || user?.branchId;

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', branchToQuery],
    queryFn: () => inventoryAPI.getByBranch(branchToQuery),
    enabled: !!branchToQuery,
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock', branchToQuery],
    queryFn: () => inventoryAPI.getLowStock(branchToQuery),
    enabled: !!branchToQuery,
  });

  const inventory = inventoryData?.data?.data || [];
  const lowStock = lowStockData?.data?.data || [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المخزون</h1>
          <p className="text-gray-600 mt-1">إدارة وفحص مخازن الفروع والمخزن الرئيسي</p>
        </div>
        
        {isAdmin && branches.length > 0 && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm self-start">
            <MapPin size={18} className="text-primary-600" />
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">اختر المخزن:</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent border-none focus:ring-0 outline-none text-sm font-medium text-gray-800 cursor-pointer min-w-[200px]"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.code === 'MAIN' ? '(المخزن الرئيسي)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="card bg-yellow-50 border-2 border-yellow-200">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="text-yellow-600" size={24} />
            <h3 className="font-semibold text-yellow-800">تنبيه: منتجات منخفضة المخزون</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-white border rounded shadow-sm">
                <span className="font-medium text-gray-800">{item.product?.name}</span>
                <span className="text-yellow-700 font-bold bg-yellow-100/50 px-2 py-0.5 rounded text-xs">
                  {item.quantity} قطعة متبقية
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="card overflow-auto">
        {isLoading ? (
          <p className="text-center py-8 text-gray-500">جاري التحميل...</p>
        ) : inventory.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto text-gray-400 mb-4" size={64} />
            <p className="text-gray-500 font-medium">لا توجد منتجات في هذا المخزن حالياً</p>
          </div>
        ) : (
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600 font-bold">
                <th className="p-3">المنتج</th>
                <th className="p-3">اللون</th>
                <th className="p-3">الكمية الكلية</th>
                <th className="p-3">منتظرة الاستلام</th>
                <th className="p-3">متاحة فعلياً</th>
                <th className="p-3">الحد الأدنى</th>
                {isAdmin && <th className="p-3">سعر الشراء</th>}
                <th className="p-3">سعر البيع</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const pendingQty = item.pendingQuantity || 0;
                const availableQty = item.availableQuantity !== undefined ? item.availableQuantity : item.quantity;
                const isLowStock = availableQty <= item.minQuantity;
                const isOutOfStock = availableQty <= 0;

                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-gray-800">{item.product?.name}</div>
                      {pendingQty > 0 && item.pendingTransfers && item.pendingTransfers.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.pendingTransfers.map((t, idx) => (
                            <div key={idx} className="text-orange-600">
                              → {t.quantity} قطعة لـ {t.toBranch} ({t.transferNumber})
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">{item.product?.color || '-'}</td>
                    <td className="p-3">
                      <span className="font-bold text-base text-gray-700">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="p-3">
                      {pendingQty > 0 ? (
                        <span className="font-bold text-base text-orange-600">
                          {pendingQty}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`font-bold text-base ${
                        isOutOfStock ? 'text-red-600' :
                        isLowStock ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {availableQty}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{item.minQuantity}</td>
                    {isAdmin && (
                      <td className="p-3">
                        <span className="font-medium text-orange-600">
                          {item.product?.costPrice ? `${item.product.costPrice} ج.م` : '-'}
                        </span>
                      </td>
                    )}
                    <td className="p-3">
                      <span className="font-medium text-green-600">
                        {item.product?.category?.defaultSellingPrice 
                          ? `${item.product.category.defaultSellingPrice} ج.م` 
                          : item.product?.sellingPrice 
                            ? `${item.product.sellingPrice} ج.م`
                            : '-'
                        }
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isOutOfStock ? 'bg-red-100 text-red-800' :
                        isLowStock ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {isOutOfStock ? 'نفذ' : isLowStock ? 'منخفض' : 'متوفر'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
