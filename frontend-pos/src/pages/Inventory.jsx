import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Package } from 'lucide-react';
import { inventoryAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Inventory() {
  const { user } = useAuthStore();

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', user?.branchId],
    queryFn: () => inventoryAPI.getByBranch(user?.branchId),
    enabled: !!user?.branchId,
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock', user?.branchId],
    queryFn: () => inventoryAPI.getLowStock(user?.branchId),
    enabled: !!user?.branchId,
  });

  const inventory = inventoryData?.data?.data || [];
  const lowStock = lowStockData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">المخزون</h1>
        <p className="text-gray-600">إدارة مخزون الفرع</p>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="card bg-yellow-50 border-2 border-yellow-200">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="text-yellow-600" size={24} />
            <h3 className="font-semibold text-yellow-800">تنبيه: منتجات منخفضة المخزون</h3>
          </div>
          <div className="space-y-2">
            {lowStock.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded">
                <span>{item.product?.name}</span>
                <span className="text-yellow-700 font-medium">{item.quantity} قطعة متبقية</span>
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
            <p className="text-gray-500">لا توجد منتجات في المخزون</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-3 font-semibold">SKU</th>
                <th className="text-right p-3 font-semibold">المنتج</th>
                <th className="text-right p-3 font-semibold">الفئة</th>
                <th className="text-right p-3 font-semibold">الكمية</th>
                <th className="text-right p-3 font-semibold">الحد الأدنى</th>
                <th className="text-right p-3 font-semibold">السعر</th>
                <th className="text-right p-3 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLowStock = item.quantity <= item.minQuantity;
                const isOutOfStock = item.quantity === 0;

                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{item.product?.sku}</td>
                    <td className="p-3 font-medium">{item.product?.name}</td>
                    <td className="p-3">{item.product?.category?.name}</td>
                    <td className="p-3">
                      <span className={`font-bold ${
                        isOutOfStock ? 'text-red-600' :
                        isLowStock ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{item.minQuantity}</td>
                    <td className="p-3">{item.product?.sellingPrice} جنيه</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
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
