import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { Printer, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function ProductMaster() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [mainBranchId, setMainBranchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // Live search
  const [showBarcodeModal, setShowBarcodeModal] = useState(false); // Barcode modal
  const [selectedProduct, setSelectedProduct] = useState(null); // Product for barcode
  const [barcodeQuantity, setBarcodeQuantity] = useState(1); // Quantity of barcodes
  const [barcodePriceType, setBarcodePriceType] = useState('retail'); // 'retail' or 'wholesale'
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    sellingPrice: '',
    retailPrice: ''
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
        // Update selling price and retail price
        await axios.put(`${API_URL}/products/${editingProduct.id}`, 
          { 
            sellingPrice: parseFloat(formData.sellingPrice),
            retailPrice: parseFloat(formData.retailPrice) || 0
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('تم تحديث الأسعار بنجاح');
      } else {
        // Create new product
        await axios.post(`${API_URL}/products`, {
          name: formData.name,
          sku: formData.sku,
          barcode: formData.sku,
          categoryId: formData.categoryId,
          description: formData.description,
          costPrice: 0,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          retailPrice: parseFloat(formData.retailPrice) || 0,
          status: 'ACTIVE'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('تم إضافة الصنف بنجاح');
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', sku: '', categoryId: '', description: '', sellingPrice: '', retailPrice: '' });
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
      sellingPrice: product.sellingPrice || '',
      retailPrice: product.retailPrice || ''
    });
    setShowModal(true);
  };

  const generateBarcodes = () => {
    if (!selectedProduct || !barcodeQuantity || barcodeQuantity < 1) {
      alert('يرجى إدخال كمية صحيحة');
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const barcodeWidth = 85;
      const barcodeHeight = 15;
      const startY = 20;
      const spacingY = 50; // spacing between barcodes (increased to fit price)
      
      let currentY = startY;

      for (let i = 0; i < barcodeQuantity; i++) {
        // Check if we need a new page
        if (currentY + spacingY > pageHeight - 20) {
          pdf.addPage();
          currentY = startY;
        }

        // 1. Create and add BARCODE - HIGH QUALITY
        const barcodeCanvas = document.createElement('canvas');
        JsBarcode(barcodeCanvas, selectedProduct.sku, {
          format: 'CODE128',
          width: 3, // Increased from 2.5
          height: 80, // Increased from 50
          displayValue: false,
          margin: 5
        });
        const barcodeImgData = barcodeCanvas.toDataURL('image/png');
        const barcodeX = (pageWidth - barcodeWidth) / 2;
        pdf.addImage(barcodeImgData, 'PNG', barcodeX, currentY, barcodeWidth, barcodeHeight);

        // 2. Create and add SKU (NEW canvas each time)
        const skuCanvas = document.createElement('canvas');
        const skuCtx = skuCanvas.getContext('2d');
        const skuText = String(selectedProduct.sku);
        const skuFontSize = 48;
        
        // Set canvas to high resolution
        skuCanvas.width = 800;
        skuCanvas.height = 120;
        
        // Scale for retina
        skuCtx.scale(2, 2);
        
        // Draw SKU text
        skuCtx.font = `bold ${skuFontSize}px Arial`;
        skuCtx.textAlign = 'center';
        skuCtx.textBaseline = 'middle';
        skuCtx.fillStyle = '#000000';
        skuCtx.fillText(skuText, 200, 30);
        
        // Add SKU to PDF
        const skuImgData = skuCanvas.toDataURL('image/png');
        const skuImgWidth = 60;
        const skuImgHeight = 9;
        const skuX = (pageWidth - skuImgWidth) / 2;
        pdf.addImage(skuImgData, 'PNG', skuX, currentY + barcodeHeight + 2, skuImgWidth, skuImgHeight);

        // 3. Create and add PRODUCT NAME (COMPLETELY NEW canvas)
        const nameCanvas = document.createElement('canvas');
        const nameCtx = nameCanvas.getContext('2d');
        const nameText = String(selectedProduct.name);
        const nameFontSize = 40;
        
        // Set canvas to high resolution
        nameCanvas.width = 1000;
        nameCanvas.height = 120;
        
        // Scale for retina
        nameCtx.scale(2, 2);
        
        // Draw product name
        nameCtx.font = `${nameFontSize}px Arial`;
        nameCtx.textAlign = 'center';
        nameCtx.textBaseline = 'middle';
        nameCtx.fillStyle = '#000000';
        nameCtx.fillText(nameText, 250, 30);
        
        // Add product name to PDF
        const nameImgData = nameCanvas.toDataURL('image/png');
        const nameImgWidth = 75;
        const nameImgHeight = 9;
        const nameX = (pageWidth - nameImgWidth) / 2;
        pdf.addImage(nameImgData, 'PNG', nameX, currentY + barcodeHeight + skuImgHeight + 4, nameImgWidth, nameImgHeight);

        // 4. Add PRICE based on selected type
        const priceToShow = barcodePriceType === 'retail'
          ? selectedProduct.retailPrice
          : selectedProduct.sellingPrice;

        if (priceToShow > 0) {
          const priceCanvas = document.createElement('canvas');
          const priceCtx = priceCanvas.getContext('2d');
          priceCanvas.width = 800;
          priceCanvas.height = 120;
          priceCtx.scale(2, 2);
          priceCtx.font = `bold 44px Arial`;
          priceCtx.textAlign = 'center';
          priceCtx.textBaseline = 'middle';
          priceCtx.fillStyle = '#000000';
          priceCtx.fillText(`${priceToShow} ج`, 200, 30);
          const priceImgData = priceCanvas.toDataURL('image/png');
          const priceImgWidth = 50;
          const priceImgHeight = 9;
          const priceX = (pageWidth - priceImgWidth) / 2;
          pdf.addImage(priceImgData, 'PNG', priceX, currentY + barcodeHeight + skuImgHeight + nameImgHeight + 6, priceImgWidth, priceImgHeight);
        }

        // Move to next barcode position
        currentY += spacingY;
      }

      // Save PDF
      pdf.save(`barcodes-${selectedProduct.sku}-${barcodeQuantity}.pdf`);
      
      // Close modal
      setShowBarcodeModal(false);
      setSelectedProduct(null);
      setBarcodeQuantity(1);
      setBarcodePriceType('retail');
    } catch (error) {
      console.error('Error generating barcodes:', error);
      alert('فشل في إنشاء الباركود');
    }
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

  // Filter products based on search term
  const filteredProducts = products.filter(product => 
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="ابحث بالكود أو اسم الصنف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">سعر الجملة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">سعر القطاعي</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ربح الجملة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ربح الفروع</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">القطع المنتجة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية المتاحة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const wholesaleProfit = (product.sellingPrice || 0) - (product.costPrice || 0);
              const wholesaleMargin = product.costPrice > 0 ? ((wholesaleProfit / product.costPrice) * 100).toFixed(1) : 0;
              const retailProfit   = (product.retailPrice  || 0) - (product.costPrice || 0);
              const retailMargin   = product.costPrice > 0 ? ((retailProfit   / product.costPrice) * 100).toFixed(1) : 0;
              
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
                  <td className="px-4 py-4 whitespace-nowrap font-bold text-sm text-blue-600">
                    {(product.retailPrice || 0).toFixed(2)} ج
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className={wholesaleProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {wholesaleProfit.toFixed(2)} ج
                      <span className="text-xs block">({wholesaleMargin}%)</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className={retailProfit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                      {retailProfit.toFixed(2)} ج
                      <span className="text-xs block">({retailMargin}%)</span>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPrice(product)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        تعديل السعر
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowBarcodeModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 flex items-center gap-1"
                      >
                        <Printer size={16} />
                        تكويد
                      </button>
                    </div>
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

        {products.length > 0 && filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            لا توجد نتائج للبحث "{searchTerm}"
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingProduct ? 'تعديل الأسعار' : 'إضافة صنف جديد'}
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
                <label className="block text-gray-700 mb-2">سعر الجملة (ج) * <span className="text-xs text-gray-500">(للبيع من المخزن الرئيسي للفروع)</span></label>
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

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">سعر القطاعي (ج) * <span className="text-xs text-gray-500">(للبيع في الفروع للعملاء)</span></label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.retailPrice}
                  onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
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
                    <span>ربح الجملة:</span>
                    <span>
                      {((parseFloat(formData.sellingPrice) || 0) - (editingProduct.costPrice || 0)).toFixed(2)} ج
                    </span>
                  </div>
                  <div className="flex justify-between mt-1 text-blue-700">
                    <span>ربح القطاعي:</span>
                    <span>
                      {((parseFloat(formData.retailPrice) || 0) - (editingProduct.costPrice || 0)).toFixed(2)} ج
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

      {/* Barcode Modal */}
      {showBarcodeModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">طباعة باركود</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">الصنف:</div>
              <div className="font-bold text-lg">{selectedProduct.name}</div>
              <div className="text-sm text-gray-600 mt-2">الكود:</div>
              <div className="font-mono font-bold">{selectedProduct.sku}</div>
            </div>

            {/* اختيار نوع السعر */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">نوع السعر المطبوع *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBarcodePriceType('retail')}
                  className={`p-3 rounded-lg border-2 text-right transition-all ${
                    barcodePriceType === 'retail'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-sm">سعر القطاعي</div>
                  <div className="text-lg font-extrabold mt-1">{(selectedProduct.retailPrice || 0).toFixed(2)} ج</div>
                  <div className="text-xs opacity-70 mt-0.5">للفروع والعملاء</div>
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodePriceType('wholesale')}
                  className={`p-3 rounded-lg border-2 text-right transition-all ${
                    barcodePriceType === 'wholesale'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-sm">سعر الجملة</div>
                  <div className="text-lg font-extrabold mt-1">{(selectedProduct.sellingPrice || 0).toFixed(2)} ج</div>
                  <div className="text-xs opacity-70 mt-0.5">للبيع بالجملة</div>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">الكمية المطلوبة *</label>
              <input
                type="number"
                min="1"
                value={barcodeQuantity}
                onChange={(e) => setBarcodeQuantity(parseInt(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="مثال: 50"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                سيتم طباعة {barcodeQuantity} باركود لنفس الصنف
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={generateBarcodes}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Printer size={20} />
                طباعة PDF
              </button>
              <button
                onClick={() => {
                  setShowBarcodeModal(false);
                  setSelectedProduct(null);
                  setBarcodeQuantity(1);
                  setBarcodePriceType('retail');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
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
