import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Filter, Package } from 'lucide-react';
import api from '../services/api';

export default function AdminProducts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  const { data: serialsData, isLoading } = useQuery({
    queryKey: ['admin-serials', page, filterStatus, filterBranch, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page,
        limit: 100,
        ...(filterStatus && { status: filterStatus }),
        ...(filterBranch && { branchId: filterBranch }),
        ...(searchQuery && { search: searchQuery })
      });
      const res = await api.get(`/serials?${params}`);
      return res.data;
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data;
    },
  });

  const serials = serialsData?.data || [];
  const pagination = serialsData?.pagination;
  const branches = branchesData?.data || [];

  // Export to Excel
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(filterStatus && { status: filterStatus }),
        ...(filterBranch && { branchId: filterBranch })
      });
      
      const res = await api.get(`/serials/export?${params}`);
      const excelData = res.data.data;
      
      // تحويل لـ CSV مع دعم العربية
      const headers = Object.keys(excelData[0]).join(',');
      const rows = excelData.map(row => 
        Object.values(row).map(val => `"${val}"`).join(',')
      ).join('\n');
      
      const csv = `${headers}\n${rows}`;
      
      // إضافة UTF-8 BOM عشان Excel يفهم العربي
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csv;
      
      // تنزيل الملف
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `products_serials_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      alert('✅ تم تصدير البيانات بنجاح!');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ فشل تصدير البيانات');
    }
  };

  // تجميع حسب المنتج
  const groupedByProduct = serials.reduce((acc, serial) => {
    const key = serial.product.id;
    if (!acc[key]) {
      acc[key] = {
        product: serial.product,
        serials: [],
        count: 0
      };
    }
    acc[key].serials.push(serial);
    acc[key].count++;
    return acc;
  }, {});

  const products = Object.values(groupedByProduct);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المنتجات والسيريالات</h1>
          <p className="text-gray-600">عرض جميع المنتجات مع السيريالات الخاصة بها</p>
        </div>
        <button 
          onClick={handleExport}
          className="btn-primary flex items-center gap-2"
        >
          <Download size={20} />
          تصدير Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ابحث بالسيريال أو اسم المنتج..."
              className="input-field pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="input-field"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="">كل الفروع</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          <select
            className="input-field"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="AVAILABLE">متاح</option>
            <option value="IN_TRANSIT">قيد النقل</option>
            <option value="SOLD">مباع</option>
            <option value="RETURNED">مرتجع</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي المنتجات</p>
              <p className="text-2xl font-bold text-blue-600">{products.length}</p>
            </div>
            <Package className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي السيريالات</p>
              <p className="text-2xl font-bold text-green-600">{serials.length}</p>
            </div>
            <Package className="text-green-600" size={32} />
          </div>
        </div>

        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">متاح</p>
              <p className="text-2xl font-bold text-yellow-600">
                {serials.filter(s => s.status === 'AVAILABLE').length}
              </p>
            </div>
            <Package className="text-yellow-600" size={32} />
          </div>
        </div>

        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مباع</p>
              <p className="text-2xl font-bold text-red-600">
                {serials.filter(s => s.status === 'SOLD').length}
              </p>
            </div>
            <Package className="text-red-600" size={32} />
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="card overflow-auto">
        {isLoading ? (
          <p className="text-center py-8 text-gray-500">جاري التحميل...</p>
        ) : products.length === 0 ? (
          <p className="text-center py-8 text-gray-500">لا توجد منتجات</p>
        ) : (
          <div className="space-y-4">
            {products.map(({ product, serials: productSerials, count }) => (
              <div key={product.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      {product.color && `اللون: ${product.color}`}
                      {product.size && ` | المقاس: ${product.size}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      سعر البيع: {product.sellingPrice} جنيه | سعر التكلفة: {product.costPrice} جنيه
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{count}</p>
                    <p className="text-sm text-gray-600">قطعة</p>
                  </div>
                </div>

                {/* Serials Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-right p-2">السيريال</th>
                        <th className="text-right p-2">الفرع</th>
                        <th className="text-right p-2">الحالة</th>
                        <th className="text-right p-2">تاريخ التسجيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSerials.map(serial => (
                        <tr key={serial.id} className="border-t">
                          <td className="p-2 font-mono">{serial.serialNumber}</td>
                          <td className="p-2">{serial.branch?.name || '-'}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              serial.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                              serial.status === 'SOLD' ? 'bg-red-100 text-red-800' :
                              serial.status === 'IN_TRANSIT' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {serial.status === 'AVAILABLE' ? 'متاح' :
                               serial.status === 'SOLD' ? 'مباع' :
                               serial.status === 'IN_TRANSIT' ? 'قيد النقل' : 'مرتجع'}
                            </span>
                          </td>
                          <td className="p-2">
                            {new Date(serial.registeredAt).toLocaleDateString('ar-EG')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
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
