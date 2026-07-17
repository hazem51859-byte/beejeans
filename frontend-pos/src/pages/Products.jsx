import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { productAPI } from '../services/api';

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page],
    queryFn: () => productAPI.getAll({ page, limit: 20 }),
  });

  const products = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المنتجات</h1>
          <p className="text-gray-600">إدارة منتجات المحل</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          إضافة منتج
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="ابحث عن منتج..."
            className="input-field pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-auto">
        {isLoading ? (
          <p className="text-center py-8 text-gray-500">جاري التحميل...</p>
        ) : products.length === 0 ? (
          <p className="text-center py-8 text-gray-500">لا توجد منتجات</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-3 font-semibold">SKU</th>
                <th className="text-right p-3 font-semibold">الاسم</th>
                <th className="text-right p-3 font-semibold">الفئة</th>
                <th className="text-right p-3 font-semibold">السعر</th>
                <th className="text-right p-3 font-semibold">المقاس</th>
                <th className="text-right p-3 font-semibold">اللون</th>
                <th className="text-right p-3 font-semibold">الحالة</th>
                <th className="text-right p-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{product.sku}</td>
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3">{product.category?.name}</td>
                  <td className="p-3">{product.sellingPrice} جنيه</td>
                  <td className="p-3">{product.size || '-'}</td>
                  <td className="p-3">{product.color || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      product.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {product.status === 'ACTIVE' ? 'نشط' :
                       product.status === 'OUT_OF_STOCK' ? 'نفذ' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Edit size={18} />
                      </button>
                      <button className="text-red-600 hover:text-red-800">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-4 p-4 border-t">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-50"
            >
              السابق
            </button>
            <span className="px-4 py-2">
              صفحة {page} من {pagination.pages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.pages}
              className="btn-secondary disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
