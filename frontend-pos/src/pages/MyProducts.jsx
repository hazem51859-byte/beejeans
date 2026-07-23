import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export default function MyProducts() {
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');

  // Get branch inventory
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['branch-inventory', user?.branchId],
    queryFn: () => fetch(`${BASE_URL}/inventory/branch/${user?.branchId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(r => r.json()),
    enabled: !!user?.branchId
  });

  const inventory = inventoryData?.data || [];
  
  // Filter products based on search
  const filteredInventory = inventory.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.product?.name?.toLowerCase().includes(query) ||
      item.product?.sku?.toLowerCase().includes(query) ||
      item.product?.color?.toLowerCase().includes(query)
    );
  });

  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package size={28} />
            منتجات الفرع
          </h1>
          <p className="text-gray-600 mt-1">
            جميع المنتجات الموجودة في مخزون الفرع
          </p>
        </div>
        
        <div className="text-sm text-gray-600 text-right">
          <div>إجمالي الأصناف: <span className="font-bold">{inventory.length}</span></div>
          <div>إجمالي القطع: <span className="font-bold">{totalQuantity}</span></div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الكود أو اللون..."
            className="input-field pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">جاري التحميل...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'لا توجد منتجات تطابق البحث' : 'لا توجد منتجات في المخزون'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-gray-400 mt-2">
                انتظر استلام التوريدات من المخزن الرئيسي
              </p>
            )}
          </div>
        ) : (
          filteredInventory.map((item) => {
            const isLowStock = item.quantity <= item.minQuantity;
            const isOutOfStock = item.quantity <= 0;
            
            return (
              <div key={item.id} className="card hover:shadow-lg transition-shadow">
                {/* Product Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.product?.name}</h3>
                    <div className="flex gap-2 mt-1">
                      {item.product?.sku && (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                          {item.product.sku}
                        </span>
                      )}
                      {item.product?.color && (
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          🎨 {item.product.color}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">
                      {item.product?.sellingPrice?.toFixed(2) || 0} ج.م
                    </div>
                  </div>
                </div>

                {/* Quantity Display */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg mb-3">
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-1 ${
                      isOutOfStock ? 'text-red-600' :
                      isLowStock ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {item.quantity}
                    </div>
                    <div className="text-sm text-gray-600">قطعة متاحة</div>
                    {isLowStock && !isOutOfStock && (
                      <div className="text-xs text-yellow-600 mt-1">⚠️ مخزون منخفض</div>
                    )}
                    {isOutOfStock && (
                      <div className="text-xs text-red-600 mt-1">❌ نفذ من المخزون</div>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-500">الحد الأدنى</div>
                    <div className="font-bold text-gray-700">{item.minQuantity} قطعة</div>
                  </div>
                  {item.lastRestockDate && (
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">آخر توريد</div>
                      <div className="font-bold text-gray-700">
                        {new Date(item.lastRestockDate).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
