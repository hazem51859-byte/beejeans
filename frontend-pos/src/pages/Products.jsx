import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { productAPI, categoryAPI } from '../services/api';

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, searchQuery],
    queryFn: () => productAPI.getAll({ page, limit: 20, search: searchQuery }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryAPI.getAll,
  });

  const products = data?.data?.data || [];
  const pagination = data?.data?.pagination;
  const categories = categoriesData?.data?.data || [];

  // Create/Update Product
  const saveMutation = useMutation({
    mutationFn: (productData) => {
      if (editingProduct) {
        return productAPI.update(editingProduct.id, productData);
      }
      return productAPI.create(productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setShowModal(false);
      setEditingProduct(null);
    },
  });

  // Delete Product
  const deleteMutation = useMutation({
    mutationFn: (id) => productAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productData = {
      sku: formData.get('sku'),
      barcode: formData.get('barcode'),
      name: formData.get('name'),
      description: formData.get('description'),
      categoryId: formData.get('categoryId'),
      costPrice: parseFloat(formData.get('costPrice')),
      sellingPrice: parseFloat(formData.get('sellingPrice')),
      size: null,
      color: formData.get('color'),
      brand: formData.get('brand'),
      taxRate: 0,
      reorderLevel: parseInt(formData.get('reorderLevel') || 10),
      status: formData.get('status') || 'ACTIVE',
    };
    saveMutation.mutate(productData);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المنتجات</h1>
          <p className="text-gray-600">إدارة منتجات المحل</p>
        </div>
        <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
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
                      <button 
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
                </h2>
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU *
                    </label>
                    <input
                      type="text"
                      name="sku"
                      required
                      defaultValue={editingProduct?.sku}
                      className="input-field"
                      placeholder="MEN-SHIRT-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barcode
                    </label>
                    <input
                      type="text"
                      name="barcode"
                      defaultValue={editingProduct?.barcode}
                      className="input-field"
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم المنتج *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingProduct?.name}
                    className="input-field"
                    placeholder="قميص رجالي كلاسيك"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوصف
                  </label>
                  <textarea
                    name="description"
                    rows="2"
                    defaultValue={editingProduct?.description}
                    className="input-field"
                    placeholder="وصف المنتج..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الفئة *
                    </label>
                    <select
                      name="categoryId"
                      required
                      defaultValue={editingProduct?.categoryId}
                      className="input-field"
                    >
                      <option value="">اختر الفئة</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الماركة
                    </label>
                    <input
                      type="text"
                      name="brand"
                      defaultValue={editingProduct?.brand}
                      className="input-field"
                      placeholder="Nike"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اللون
                    </label>
                    <input
                      type="text"
                      name="color"
                      defaultValue={editingProduct?.color}
                      className="input-field"
                      placeholder="أبيض"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الحالة
                    </label>
                    <select
                      name="status"
                      defaultValue={editingProduct?.status || 'ACTIVE'}
                      className="input-field"
                    >
                      <option value="ACTIVE">نشط</option>
                      <option value="INACTIVE">غير نشط</option>
                      <option value="OUT_OF_STOCK">نفذ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      سعر التكلفة *
                    </label>
                    <input
                      type="number"
                      name="costPrice"
                      step="0.01"
                      required
                      defaultValue={editingProduct?.costPrice}
                      className="input-field"
                      placeholder="150.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      سعر البيع *
                    </label>
                    <input
                      type="number"
                      name="sellingPrice"
                      step="0.01"
                      required
                      defaultValue={editingProduct?.sellingPrice}
                      className="input-field"
                      placeholder="250.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      حد إعادة الطلب
                    </label>
                    <input
                      type="number"
                      name="reorderLevel"
                      defaultValue={editingProduct?.reorderLevel || 10}
                      className="input-field"
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="btn-primary flex-1"
                  >
                    {saveMutation.isPending ? 'جاري الحفظ...' : editingProduct ? 'تحديث' : 'إضافة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProduct(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
