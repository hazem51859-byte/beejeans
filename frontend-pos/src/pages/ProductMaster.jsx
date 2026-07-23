import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL;

export default function ProductMaster() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [mainBranchId, setMainBranchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    sellingPrice: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get products
      const productsResponse = await axios.get(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(productsResponse.data.data || productsResponse.data);

      // Get main branch
      const branchesResponse = await axios.get(`${API_URL}/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const branches = branchesResponse.data.data || branchesResponse.data;
      const mainBranch = branches.find(b => b.code === 'MAIN');
      
      if (mainBranch) {
        setMainBranchId(mainBranch.id);
        
        // Get inventory for main branch
        const inventoryResponse = await axios.get(`${API_URL}/inventory/branch/${mainBranch.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInventory(inventoryResponse.data.data || inventoryResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('فشل في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        // Update only selling price
        await axios.put(`${API_URL}/products/${editingProduct.id}`, 
          { sellingPrice: parseFloat(formData.sellingPrice) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('تم تحديث سعر البيع بنجاح');
      } else {
        // Create new product (name and SKU only)
        await axios.post(`${API_URL}/products`, {
          name: formData.name,
          sku: formData.sku,
          barcode: formData.sku, // Same as SKU
          categoryId: formData.categoryId,
          description: formData.description,
          costPrice: 0,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          status: 'DRAFT' // Draft until production completes
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('تم إضافة الصنف بنجاح');
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', sku: '', categoryId: '', description: '', sellingPrice: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.response?.data?.message || 'فشل في حفظ الصنف');
    }
  };

  const handleEditPrice = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      sellingPrice: product.sellingPrice || ''
    });
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: { text: 'مسودة', class: 'bg-gray-100 text-gray-800' },
      ACTIVE: { text: 'نشط', class: 'bg-green-100 text-green-800' },
      INACTIVE: { text: 'غير نشط', class: 'bg-red-100 text-red-800' }
    };
    const badge = badges[status] || badges.DRAFT;
    return <span className={`px-2 py-1 rounded-full text-xs ${badge.class}`}>{badge.text}</span>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">الأصناف (Products Master)</h1>
        <button
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', sku: '', categoryId: '', description: '', sellingPrice: '' });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          + إضافة صنف جديد
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكود SKU</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم الصنف</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتراج المستخدم</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تكلفة القماش</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تكلفة التصنيع</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تكلفة الغسيل</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي التكلفة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">سعر البيع</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الربح</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">القطع المنتجة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية المتاحة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const profit = (product.sellingPrice || 0) - (product.costPrice || 0);
              const profitMargin = product.costPrice > 0 ? ((profit / product.costPrice) * 100).toFixed(1) : 0;
              
              // Calculate meters used from fabric cost
              const totalMetersUsed = product.fabricMetersUsed || 0;
              const metersPerPiece = product.totalPiecesProduced > 0 ? (totalMetersUsed / product.totalPiecesProduced) : 0;
              
              // Get available quantity from inventory
              const inventoryItem = inventory.find(inv => inv.productId === product.id);
              const availableQty = inventoryItem?.availableQuantity !== undefined 
                ? inventoryItem.availableQuantity 
                : (inventoryItem?.quantity || 0);
              const pendingQty = inventoryItem?.pendingQuantity || 0;
              
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap font-mono text-sm">{product.sku}</td>
                  <td className="px-4 py-4 whitespace-nowrap font-medium">{product.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">
                    {totalMetersUsed > 0 ? (
                      <div>
                        <div className="font-bold">{totalMetersUsed.toFixed(2)} متر</div>
                        <div className="text-xs text-gray-500">
                          ({metersPerPiece.toFixed(2)} متر/قطعة)
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {(product.fabricCost || 0).toFixed(2)} ج
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {(product.manufacturingCost || 0).toFixed(2)} ج
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {(product.washingCost || 0).toFixed(2)} ج
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap font-bold text-sm text-blue-600">
                    {(product.costPrice || 0).toFixed(2)} ج
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap font-bold text-sm text-green-600">
                    {(product.sellingPrice || 0).toFixed(2)} ج
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {profit.toFixed(2)} ج
                      <span className="text-xs block">({profitMargin}%)</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {product.totalPiecesProduced || 0}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div>
                      <div className={`font-bold text-base ${
                        availableQty > 10 ? 'text-green-600' : 
                        availableQty > 0 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {availableQty}
                      </div>
                      {pendingQty > 0 && (
                        <div className="text-xs text-orange-600">
                          ({pendingQty} منتظر)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getStatusBadge(product.status)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEditPrice(product)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      تعديل السعر
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            لا توجد أصناف. اضغط "إضافة صنف جديد" للبدء.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingProduct ? 'تعديل سعر البيع' : 'إضافة صنف جديد'}
            </h2>
            <form onSubmit={handleSubmit}>
              {!editingProduct && (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">اسم الصنف *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                      placeholder="مثال: بنطلون جينز أزرق"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">كود الصنف (SKU) *</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 font-mono"
                      required
                      placeholder="مثال: JEANS-001"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      سيتم استخدام هذا الكود كباركود للمنتج
                    </p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">الوصف</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      rows="2"
                      placeholder="وصف الصنف (اختياري)"
                    />
                  </div>
                </>
              )}
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">سعر البيع (ج) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                  placeholder="0.00"
                />
              </div>

              {editingProduct && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm">
                  <div className="flex justify-between mb-1">
                    <span>تكلفة القماش:</span>
                    <span>{(editingProduct.fabricCost || 0).toFixed(2)} ج</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>تكلفة التصنيع:</span>
                    <span>{(editingProduct.manufacturingCost || 0).toFixed(2)} ج</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>تكلفة الغسيل:</span>
                    <span>{(editingProduct.washingCost || 0).toFixed(2)} ج</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1 mt-1">
                    <span>إجمالي التكلفة:</span>
                    <span>{(editingProduct.costPrice || 0).toFixed(2)} ج</span>
                  </div>
                  <div className="flex justify-between mt-2 text-green-700">
                    <span>الربح المتوقع:</span>
                    <span>
                      {((parseFloat(formData.sellingPrice) || 0) - (editingProduct.costPrice || 0)).toFixed(2)} ج
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    setFormData({ name: '', sku: '', categoryId: '', description: '', sellingPrice: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
