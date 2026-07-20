import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export default function MyProducts() {
  const { user } = useAuthStore();
  
  const [searchSerial, setSearchSerial] = useState('');
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');

  // Get branch inventory (serials in my branch)
  const { data: serialsData, isLoading } = useQuery({
    queryKey: ['branch-inventory', user?.branchId, statusFilter],
    queryFn: () => fetch(`${BASE_URL}/serials?branchId=${user?.branchId}&status=${statusFilter}&limit=500`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(r => r.json()),
    enabled: !!user?.branchId
  });

  const serials = serialsData?.data?.data || serialsData?.data || [];
  
  // Group serials by product
  const productGroups = serials.reduce((acc, serial) => {
    const productId = serial.productId;
    if (!acc[productId]) {
      acc[productId] = {
        product: serial.product,
        serials: [],
        available: 0,
        sold: 0,
        total: 0
      };
    }
    acc[productId].serials.push(serial);
    acc[productId].total++;
    if (serial.status === 'AVAILABLE') acc[productId].available++;
    if (serial.status === 'SOLD') acc[productId].sold++;
    return acc;
  }, {});
  
  const groupedProducts = Object.values(productGroups);

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
            جميع المنتجات والسيريالات الموجودة في مخزون الفرع
          </p>
        </div>
        
        <div className="text-sm text-gray-600">
          <div>إجمالي المنتجات: <span className="font-bold">{groupedProducts.length}</span></div>
          <div>إجمالي السيريالات: <span className="font-bold">{serials.length}</span></div>
        </div>
      </div>

      {/* Search by Serial */}
      <div className="card">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="ابحث بالسيريال..."
            className="input-field pr-10"
            value={searchSerial}
            onChange={(e) => setSearchSerial(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-2">
          {['AVAILABLE', 'SOLD', 'RETURNED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg ${
                statusFilter === status
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'AVAILABLE' ? 'متاح' : status === 'SOLD' ? 'مباع' : 'مرتجع'}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">جاري التحميل...</p>
          </div>
        ) : groupedProducts.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد منتجات في المخزون</p>
            <p className="text-sm text-gray-400 mt-2">
              انتظر استلام التوريدات من المخزن الرئيسي أو الفروع الأخرى
            </p>
          </div>
        ) : (
          groupedProducts
            .filter(g => !searchSerial || g.serials.some(s => s.serialNumber.includes(searchSerial)))
            .map((group) => (
              <div key={group.product.id} className="card hover:shadow-lg transition-shadow">
                {/* Product Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{group.product.name}</h3>
                    {group.product.color && (
                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs mt-1">
                        🎨 {group.product.color}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary-600">
                      {group.product.sellingPrice} ج.م
                    </div>
                    {group.product.category && (
                      <div className="text-xs text-gray-500">{group.product.category.name}</div>
                    )}
                  </div>
                </div>

                {/* Summary Stats (for available/returned only) */}
                {statusFilter !== 'SOLD' && (
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-2xl font-bold text-green-600">{group.available}</div>
                      <div className="text-xs text-gray-600">متاح</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-2xl font-bold text-blue-600">{group.sold}</div>
                      <div className="text-xs text-gray-600">مباع</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-2xl font-bold text-gray-600">{group.total}</div>
                      <div className="text-xs text-gray-600">الإجمالي</div>
                    </div>
                  </div>
                )}

                {/* Serials List */}
                <div className="space-y-2">
                  {statusFilter === 'SOLD' ? (
                    // Sold view - show each serial with details
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        السيريالات المباعة ({group.serials.length})
                      </div>
                      {group.serials.map(serial => (
                        <div key={serial.id} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-mono text-sm font-bold text-blue-900">
                              📦 {serial.serialNumber}
                            </div>
                            <div className="text-xs text-gray-500">
                              {serial.soldAt ? new Date(serial.soldAt).toLocaleDateString('ar-EG') : ''}
                            </div>
                          </div>
                          {serial.product?.size && (
                            <div className="text-xs">
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                                📏 {serial.product.size}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : statusFilter === 'AVAILABLE' ? (
                    // Available view - collapsible list
                    <details className="text-xs">
                      <summary className="cursor-pointer text-primary-600 hover:text-primary-700 font-medium">
                        عرض السيريالات ({group.serials.filter(s => s.status === 'AVAILABLE').length})
                      </summary>
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
                        {group.serials
                          .filter(s => s.status === 'AVAILABLE')
                          .map(s => (
                            <div key={s.id} className="font-mono text-xs bg-white p-1 rounded">
                              {s.serialNumber}
                            </div>
                          ))
                        }
                      </div>
                    </details>
                  ) : (
                    // Returned view - show serials
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        السيريالات المرتجعة ({group.serials.length})
                      </div>
                      {group.serials.map(serial => (
                        <div key={serial.id} className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <div className="font-mono text-sm font-bold text-red-900">
                            🔄 {serial.serialNumber}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
        )}
      </div>


    </div>
  );
}
