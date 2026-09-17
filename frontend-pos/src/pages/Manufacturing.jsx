import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Plus, Trash2, Layers, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function Manufacturing() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [suppliers, setSuppliers] = useState([]);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [sendForm, setSendForm] = useState({
    orderNumber: '',
    supplierId: '',
    productId: '',
    sentDate: new Date().toISOString().split('T')[0],
    notes: '',
    fabrics: [{ fabricTypeId: '', metersUsed: '' }]
  });

  const [productCode, setProductCode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [receiveForm, setReceiveForm] = useState({
    piecesReceived: '',
    manufacturingCostPerPiece: '',
    paidAmount: '',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchFabricTypes();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/production/manufacturing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/suppliers?type=MANUFACTURING`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchFabricTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/fabric/types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFabricTypes(response.data.data);
    } catch (error) {
      console.error('Error fetching fabric types:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products?status=ACTIVE`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Multi-fabric handlers
  const addFabricRow = () => {
    setSendForm(prev => ({
      ...prev,
      fabrics: [...prev.fabrics, { fabricTypeId: '', metersUsed: '' }]
    }));
  };

  const removeFabricRow = (index) => {
    if (sendForm.fabrics.length <= 1) return;
    setSendForm(prev => ({
      ...prev,
      fabrics: prev.fabrics.filter((_, i) => i !== index)
    }));
  };

  const updateFabricRow = (index, field, value) => {
    setSendForm(prev => {
      const updated = [...prev.fabrics];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, fabrics: updated };
    });
  };

  const handleSendSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      alert('الرجاء إدخال كود منتج صحيح');
      return;
    }

    const validFabrics = sendForm.fabrics
      .map(f => ({
        fabricTypeId: f.fabricTypeId,
        metersUsed: parseFloat(f.metersUsed) || 0
      }))
      .filter(f => f.fabricTypeId && f.metersUsed > 0);

    if (validFabrics.length === 0) {
      alert('الرجاء اختيار خامة واحدة على الأقل وتحديد الأمتار');
      return;
    }

    if (anyFabricOverLimit) {
      alert('الكمية المطلوبة لبعض الخامات تتجاوز الرصيد المتوفر في المخزن!');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/production/manufacturing`, {
        orderNumber: sendForm.orderNumber,
        supplierId: sendForm.supplierId,
        productId: sendForm.productId,
        sentDate: sendForm.sentDate,
        notes: sendForm.notes,
        fabrics: validFabrics
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('تم إرسال القماش للتصنيع بنجاح');
      setShowSendModal(false);
      setSendForm({
        orderNumber: '',
        supplierId: '',
        productId: '',
        sentDate: new Date().toISOString().split('T')[0],
        notes: '',
        fabrics: [{ fabricTypeId: '', metersUsed: '' }]
      });
      setProductCode('');
      setSelectedProduct(null);
      fetchOrders();
    } catch (error) {
      console.error('Error sending order:', error);
      alert(error.response?.data?.message || 'فشل في إرسال الأمر');
    }
  };

  // Handle product code search
  const handleProductCodeChange = (code) => {
    setProductCode(code);
    
    if (code.trim().length >= 3) {
      const product = products.find(p => 
        p.barcode?.toLowerCase() === code.toLowerCase().trim() ||
        p.sku?.toLowerCase() === code.toLowerCase().trim()
      );
      
      if (product) {
        setSelectedProduct(product);
        setSendForm(prev => ({ ...prev, productId: product.id }));
      } else {
        setSelectedProduct(null);
        setSendForm(prev => ({ ...prev, productId: '' }));
      }
    } else {
      setSelectedProduct(null);
      setSendForm(prev => ({ ...prev, productId: '' }));
    }
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${API_URL}/production/manufacturing/${selectedOrder.id}/complete`,
        receiveForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('تم استلام القطع المصنعة بنجاح');
      setShowReceiveModal(false);
      setSelectedOrder(null);
      setReceiveForm({
        piecesReceived: '',
        manufacturingCostPerPiece: '',
        paidAmount: '',
        receivedDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchOrders();
    } catch (error) {
      console.error('Error receiving order:', error);
      alert(error.response?.data?.message || 'فشل في استلام القطع');
    }
  };

  // Calculation helpers for send form
  const fabricRowCalculations = sendForm.fabrics.map(row => {
    const fab = fabricTypes.find(f => f.id === row.fabricTypeId);
    const available = fab?.fabricStock?.availableMeters ?? fab?.fabricStock?.[0]?.availableMeters ?? 0;
    const meters = parseFloat(row.metersUsed) || 0;
    const price = fab?.pricePerMeter || 0;
    const cost = meters * price;
    const isOver = meters > available;
    const remaining = available - meters;
    return { fab, available, meters, price, cost, isOver, remaining };
  });

  const totalSendMeters = fabricRowCalculations.reduce((sum, r) => sum + r.meters, 0);
  const totalSendFabricCost = fabricRowCalculations.reduce((sum, r) => sum + r.cost, 0);
  const anyFabricOverLimit = fabricRowCalculations.some(r => r.isOver && r.meters > 0);

  // Helper for order fabric cost
  const getOrderFabricCost = (order) => {
    if (order.totalFabricCost != null) return order.totalFabricCost;
    if (order.fabrics && order.fabrics.length > 0) {
      return order.fabrics.reduce((s, f) => s + (f.totalFabricCost || (f.metersUsed * f.fabricCostPerMeter)), 0);
    }
    return (order.metersUsed || 0) * (order.fabricCostPerMeter || 0);
  };

  // Helper for order total meters
  const getOrderTotalMeters = (order) => {
    if (order.fabrics && order.fabrics.length > 0) {
      return order.fabrics.reduce((s, f) => s + (f.metersUsed || 0), 0);
    }
    return order.metersUsed || 0;
  };

  const getStatusBadge = (status) => {
    const badges = {
      SENT: { text: 'تم الإرسال للتصنيع', class: 'bg-blue-100 text-blue-800' },
      IN_PRODUCTION: { text: 'قيد التصنيع', class: 'bg-yellow-100 text-yellow-800' },
      COMPLETED: { text: 'مكتمل (تم الاستلام)', class: 'bg-green-100 text-green-800' }
    };
    const badge = badges[status] || badges.SENT;
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.class}`}>{badge.text}</span>;
  };

  // Receive modal calculations
  const selectedOrderFabricCost = selectedOrder ? getOrderFabricCost(selectedOrder) : 0;
  const receivePieces = parseInt(receiveForm.piecesReceived) || 0;
  const receiveMfgCostPerPiece = parseFloat(receiveForm.manufacturingCostPerPiece) || 0;
  const receiveTotalMfgCost = receivePieces * receiveMfgCostPerPiece;
  const receiveFabricCostPerPiece = receivePieces > 0 ? (selectedOrderFabricCost / receivePieces) : 0;
  const receiveInitialCostPerPiece = receiveFabricCostPerPiece + receiveMfgCostPerPiece;
  const receiveGrandTotal = selectedOrderFabricCost + receiveTotalMfgCost;

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-gray-500 font-medium">جاري التحميل...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">أوامر التصنيع</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة إرسال الخامات للمصانع واستلام القطع المنتجة وتتبع التكاليف</p>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={20} />
          إرسال قماش للتصنيع
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3.5 text-right font-semibold">رقم الأمر</th>
              <th className="px-4 py-3.5 text-right font-semibold">الصنف المطلوب</th>
              <th className="px-4 py-3.5 text-right font-semibold">المصنع / المورد</th>
              <th className="px-4 py-3.5 text-right font-semibold">الخامات المستخدمة</th>
              <th className="px-4 py-3.5 text-center font-semibold">إجمالي الأمتار</th>
              <th className="px-4 py-3.5 text-center font-semibold">تكلفة القماش</th>
              <th className="px-4 py-3.5 text-center font-semibold">القطع المستلمة</th>
              <th className="px-4 py-3.5 text-center font-semibold">تكلفة التصنيع</th>
              <th className="px-4 py-3.5 text-center font-semibold">الحالة</th>
              <th className="px-4 py-3.5 text-center font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {orders.map((order) => {
              const fabricCostTotal = getOrderFabricCost(order);
              const totalMeters = getOrderTotalMeters(order);
              const hasMultipleFabrics = order.fabrics && order.fabrics.length > 0;

              return (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap font-mono font-bold text-gray-900">
                    #{order.orderNumber}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.product ? (
                      <div>
                        <p className="font-medium text-gray-900">{order.product.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{order.product.barcode || order.product.sku}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">غير محدد</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-800">
                    {order.supplier?.name}
                  </td>
                  <td className="px-4 py-4">
                    {hasMultipleFabrics ? (
                      <div className="space-y-1">
                        {order.fabrics.map((f, idx) => (
                          <div key={idx} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-xs ml-1 mb-1 border border-blue-100">
                            <span className="font-semibold">{f.fabricType?.name}</span>
                            <span>({f.metersUsed} م)</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
                        {order.fabricType?.name || 'خامة أساسية'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center font-medium text-gray-700">
                    {totalMeters.toFixed(2)} متر
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-blue-700">
                    {fabricCostTotal.toFixed(2)} ج.م
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {order.piecesReceived ? (
                      <span className="font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                        {order.piecesReceived} قطعة
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {order.totalManufacturingCost ? (
                      <span className="font-medium text-purple-700">
                        {order.totalManufacturingCost.toFixed(2)} ج.م
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {order.status !== 'COMPLETED' ? (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowReceiveModal(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
                      >
                        استلام القطع
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">تم الاستلام</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            لا توجد أوامر تصنيع حالياً. اضغط "إرسال قماش للتصنيع" لإنشاء أول أمر.
          </div>
        )}
      </div>

      {/* Send Modal (Multiple Fabrics) */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl my-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">إرسال قماش للتصنيع (أمر جديد)</h2>
                <p className="text-xs text-gray-500 mt-0.5">يمكنك تحديد خامة واحدة أو خامات متعددة لنفس أمر التصنيع</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendSubmit} className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">رقم أمر التصنيع *</label>
                  <input
                    type="text"
                    value={sendForm.orderNumber}
                    onChange={(e) => setSendForm({ ...sendForm, orderNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    placeholder="مثال: MFG-101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">تاريخ الإرسال *</label>
                  <input
                    type="date"
                    value={sendForm.sentDate}
                    onChange={(e) => setSendForm({ ...sendForm, sentDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">كود الصنف المطلوب تصنيعه (SKU / Barcode) *</label>
                  <input
                    type="text"
                    value={productCode}
                    onChange={(e) => handleProductCodeChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    placeholder="ابحث بكود الصنف أو الباركود..."
                  />
                  {productCode && selectedProduct && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-green-900">✓ {selectedProduct.name}</p>
                        <p className="text-xs text-green-700 mt-0.5">الكود: {selectedProduct.barcode || selectedProduct.sku}</p>
                      </div>
                      <span className="text-xs font-semibold bg-green-200/80 text-green-900 px-2.5 py-1 rounded-full">
                        صنف نشط
                      </span>
                    </div>
                  )}
                  {productCode && !selectedProduct && productCode.trim().length >= 3 && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                      <AlertTriangle size={14} />
                      لم يتم العثور على صنف نشط بهذا الكود في Product Master
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">المصنع / مورد التصنيع *</label>
                  <select
                    value={sendForm.supplierId}
                    onChange={(e) => setSendForm({ ...sendForm, supplierId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">اختر مورد التصنيع</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multiple Fabrics Section */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="text-blue-600" size={18} />
                    <h3 className="text-base font-bold text-gray-900">الخامات المستخدمة في الأمر</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addFabricRow}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    إضافة خامة أخرى
                  </button>
                </div>

                <div className="space-y-3">
                  {sendForm.fabrics.map((row, index) => {
                    const calc = fabricRowCalculations[index];
                    return (
                      <div key={index} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 relative space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">خامة #{index + 1}</span>
                          {sendForm.fabrics.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFabricRow(index)}
                              className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium"
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">نوع القماش *</label>
                            <select
                              value={row.fabricTypeId}
                              onChange={(e) => updateFabricRow(index, 'fabricTypeId', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                              required
                            >
                              <option value="">اختر نوع القماش</option>
                              {fabricTypes.map((fabric) => {
                                const avail = fabric.fabricStock?.availableMeters ?? fabric.fabricStock?.[0]?.availableMeters ?? 0;
                                return (
                                  <option key={fabric.id} value={fabric.id}>
                                    {fabric.name} ({fabric.pricePerMeter} ج/متر - متاح: {avail.toFixed(1)} متر)
                                  </option>
                                );
                              })}
                            </select>
                            {calc?.fab && (
                              <p className="text-xs text-gray-500 mt-1">
                                سعر المتر: <span className="font-semibold text-gray-800">{calc.price.toFixed(2)} ج.م</span> | المتاح: <span className="font-bold text-green-700">{calc.available.toFixed(2)} متر</span>
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">الأمتار المطلوبة *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={row.metersUsed}
                              onChange={(e) => updateFabricRow(index, 'metersUsed', e.target.value)}
                              className={`w-full border rounded-lg px-3 py-2 text-sm bg-white ${calc?.isOver ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                              required
                              placeholder="0.00"
                            />
                            {calc?.meters > 0 && (
                              <div className="flex justify-between items-center text-xs mt-1">
                                <span className="text-gray-500">
                                  تكلفة هذه الخامة: <strong className="text-blue-700 font-bold">{calc.cost.toFixed(2)} ج.م</strong>
                                </span>
                                {calc.isOver ? (
                                  <span className="text-red-600 font-bold flex items-center gap-1">
                                    ⚠️ غير متوفر (متبقي {calc.remaining.toFixed(1)} م)
                                  </span>
                                ) : (
                                  <span className="text-green-700 font-medium">
                                    متبقي بعد الاستخدام: {calc.remaining.toFixed(1)} م
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total Summary Card */}
                {totalSendMeters > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 text-sm space-y-2">
                    <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider">📊 ملخص تكلفة القماش الكلية للأمر</h4>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="text-gray-600 block text-xs">إجمالي الأمتار من كل الخامات:</span>
                        <p className="text-lg font-bold text-gray-900">{totalSendMeters.toFixed(2)} متر</p>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-xs">إجمالي تكلفة القماش المستهلك:</span>
                        <p className="text-lg font-bold text-blue-700">{totalSendFabricCost.toFixed(2)} ج.م</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">ملاحظات</label>
                <textarea
                  value={sendForm.notes}
                  onChange={(e) => setSendForm({ ...sendForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm"
                  rows="2"
                  placeholder="أي تعليمات أو ملاحظات إضافية للمصنع..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={anyFabricOverLimit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg shadow-md transition-all"
                >
                  إرسال أمر التصنيع
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal (Detailed Manufacturing Receive) */}
      {showReceiveModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">استلام القطع المصنعة</h2>
                <p className="text-xs text-gray-500 mt-0.5">تسجيل عدد القطع المستلمة وتكلفة التصنيع وتحديث التكاليف</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowReceiveModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Order info & Fabrics Breakdown */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 mb-5 text-sm space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block">رقم الأمر:</span>
                  <span className="font-mono font-bold text-gray-900">#{selectedOrder.orderNumber}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">الصنف:</span>
                  <span className="font-bold text-gray-900">{selectedOrder.product?.name || 'غير محدد'}</span>
                </div>
              </div>

              <div className="border-t border-blue-200/60 pt-2">
                <span className="text-xs font-bold text-blue-900 block mb-1.5">📦 الخامات المستخدمة وتكلفتها:</span>
                {selectedOrder.fabrics && selectedOrder.fabrics.length > 0 ? (
                  <div className="space-y-1">
                    {selectedOrder.fabrics.map((f, i) => (
                      <div key={i} className="flex justify-between text-xs bg-white/80 px-2.5 py-1.5 rounded border border-blue-100">
                        <span className="font-medium text-gray-800">{f.fabricType?.name || 'خامة'}</span>
                        <span className="text-gray-600">{f.metersUsed} متر × {f.fabricCostPerMeter} ج = <strong className="text-blue-800 font-bold">{f.totalFabricCost.toFixed(2)} ج.م</strong></span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-between text-xs bg-white/80 px-2.5 py-1.5 rounded border border-blue-100">
                    <span className="font-medium text-gray-800">{selectedOrder.fabricType?.name || 'خامة أساسية'}</span>
                    <span className="text-gray-600">{selectedOrder.metersUsed} متر</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200 font-bold text-blue-900">
                  <span>إجمالي تكلفة القماش المستهلك:</span>
                  <span className="text-base">{selectedOrderFabricCost.toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">عدد القطع المستلمة *</label>
                  <input
                    type="number"
                    min="1"
                    value={receiveForm.piecesReceived}
                    onChange={(e) => setReceiveForm({ ...receiveForm, piecesReceived: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-bold"
                    required
                    placeholder="مثال: 100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">تكلفة التصنيع للقطعة الواحدة (ج.م) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={receiveForm.manufacturingCostPerPiece}
                    onChange={(e) => setReceiveForm({ ...receiveForm, manufacturingCostPerPiece: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-bold"
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Dynamic Live Cost Calculations */}
              {receivePieces > 0 && receiveMfgCostPerPiece > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-4 text-sm space-y-3">
                  <h4 className="font-bold text-green-900 text-xs">💰 تحليل تكلفة القطعة بعد التصنيع المبدئي</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-sm">
                      <span className="text-[11px] text-gray-500 block">تكلفة القماش/قطعة</span>
                      <p className="font-bold text-blue-700">{receiveFabricCostPerPiece.toFixed(2)} ج</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-green-100 shadow-sm">
                      <span className="text-[11px] text-gray-500 block">مصنعية القطعة</span>
                      <p className="font-bold text-green-700">{receiveMfgCostPerPiece.toFixed(2)} ج</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100 shadow-sm">
                      <span className="text-[11px] text-gray-500 block">إجمالي مصنعية الأمر</span>
                      <p className="font-bold text-purple-700">{receiveTotalMfgCost.toFixed(2)} ج</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border-2 border-orange-400 shadow-sm">
                      <span className="text-[11px] text-gray-500 block font-semibold">التكلفة المبدئية/قطعة</span>
                      <p className="font-bold text-orange-700">{receiveInitialCostPerPiece.toFixed(2)} ج</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-green-200 text-xs text-gray-600">
                    <span>إجمالي تكلفة الأمر (قماش + تصنيع):</span>
                    <span className="font-bold text-gray-900 text-sm">{receiveGrandTotal.toFixed(2)} ج.م</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">المبلغ المدفوع للمصنع</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={receiveForm.paidAmount}
                    onChange={(e) => setReceiveForm({ ...receiveForm, paidAmount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">تاريخ الاستلام *</label>
                  <input
                    type="date"
                    value={receiveForm.receivedDate}
                    onChange={(e) => setReceiveForm({ ...receiveForm, receivedDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">ملاحظات الاستلام</label>
                <textarea
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm"
                  rows="2"
                  placeholder="أي ملاحظات حول جودة القطع أو الكميات..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg shadow-md transition-all"
                >
                  استلام وتأكيد التكاليف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiveModal(false);
                    setSelectedOrder(null);
                  }}
                  className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors"
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
