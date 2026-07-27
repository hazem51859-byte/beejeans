import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

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
    fabricTypeId: '',
    productId: '',
    metersUsed: '',
    sentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

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
      console.log('📦 Fabric Types:', response.data.data);
      setFabricTypes(response.data.data);
    } catch (error) {
      console.error('Error fetching fabric types:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      // جلب المنتجات النشطة فقط من Product Master
      const response = await axios.get(`${API_URL}/products?status=ACTIVE`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSendSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/production/manufacturing`, sendForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('تم إرسال القماش للتصنيع بنجاح');
      setShowSendModal(false);
      setSendForm({
        orderNumber: '',
        supplierId: '',
        fabricTypeId: '',
        productId: '',
        metersUsed: '',
        sentDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchOrders();
    } catch (error) {
      console.error('Error sending order:', error);
      alert(error.response?.data?.message || 'فشل في إرسال الأمر');
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

  const selectedFabric = fabricTypes.find(f => f.id === sendForm.fabricTypeId);
  const fabricCost = selectedFabric ? (parseFloat(sendForm.metersUsed) || 0) * selectedFabric.pricePerMeter : 0;
  const availableMeters = selectedFabric?.fabricStock?.[0]?.availableMeters || 0;
  const metersUsed = parseFloat(sendForm.metersUsed) || 0;
  const remainingMeters = availableMeters - metersUsed;

  const getStatusBadge = (status) => {
    const badges = {
      SENT: { text: 'تم الإرسال', class: 'bg-blue-100 text-blue-800' },
      IN_PRODUCTION: { text: 'قيد التصنيع', class: 'bg-yellow-100 text-yellow-800' },
      COMPLETED: { text: 'مكتمل', class: 'bg-green-100 text-green-800' }
    };
    const badge = badges[status] || badges.SENT;
    return <span className={`px-2 py-1 rounded-full text-xs ${badge.class}`}>{badge.text}</span>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">أوامر التصنيع</h1>
        <button
          onClick={() => setShowSendModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          + إرسال قماش للتصنيع
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الأمر</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصنف</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المورد</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع القماش</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأمتار</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تكلفة القماش</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">القطع المستلمة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تكلفة التصنيع</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const fabricCostTotal = order.metersUsed * order.fabricCostPerMeter;
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap font-mono text-sm">{order.orderNumber}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.product?.name || <span className="text-gray-400">غير محدد</span>}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{order.supplier.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap">{order.fabricType.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap">{order.metersUsed} متر</td>
                  <td className="px-4 py-4 whitespace-nowrap">{fabricCostTotal.toFixed(2)} ج</td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {order.piecesReceived || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.totalManufacturingCost ? `${order.totalManufacturingCost.toFixed(2)} ج` : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {order.status !== 'COMPLETED' && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowReceiveModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 text-sm"
                      >
                        استلام القطع
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            لا توجد أوامر تصنيع. اضغط "إرسال قماش للتصنيع" للبدء.
          </div>
        )}
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
            <h2 className="text-2xl font-bold mb-4">إرسال قماش للتصنيع</h2>
            <form onSubmit={handleSendSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">رقم الأمر *</label>
                  <input
                    type="text"
                    value={sendForm.orderNumber}
                    onChange={(e) => setSendForm({ ...sendForm, orderNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                    placeholder="MFG-001"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">تاريخ الإرسال *</label>
                  <input
                    type="date"
                    value={sendForm.sentDate}
                    onChange={(e) => setSendForm({ ...sendForm, sentDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>
                <div className="mb-4 col-span-2">
                  <label className="block text-gray-700 mb-2">الصنف المطلوب تصنيعه *</label>
                  <select
                    value={sendForm.productId}
                    onChange={(e) => setSendForm({ ...sendForm, productId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">اختر الصنف</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    سيتم ربط القطع المصنعة بهذا الصنف وحساب التكاليف تلقائياً
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">مورد التصنيع *</label>
                  <select
                    value={sendForm.supplierId}
                    onChange={(e) => setSendForm({ ...sendForm, supplierId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">اختر المورد</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">نوع القماش *</label>
                  <select
                    value={sendForm.fabricTypeId}
                    onChange={(e) => setSendForm({ ...sendForm, fabricTypeId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">اختر نوع القماش</option>
                    {fabricTypes.map((fabric) => (
                      <option key={fabric.id} value={fabric.id}>
                        {fabric.name} - {fabric.pricePerMeter} ج/متر ({fabric.fabricStock?.[0]?.availableMeters || 0} متر متاح)
                      </option>
                    ))}
                  </select>
                  {selectedFabric && (
                    <p className="text-sm text-gray-600 mt-1">
                      متوفر: <span className="font-bold text-green-600">{availableMeters} متر</span>
                    </p>
                  )}
                </div>
                <div className="mb-4 col-span-2">
                  <label className="block text-gray-700 mb-2">عدد الأمتار المستخدمة *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sendForm.metersUsed}
                    onChange={(e) => setSendForm({ ...sendForm, metersUsed: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>
              </div>

              {fabricCost > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-2">
                  <div className="flex justify-between">
                    <span>تكلفة القماش الإجمالية:</span>
                    <span className="font-bold text-blue-600">{fabricCost.toFixed(2)} ج</span>
                  </div>
                  {metersUsed > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>الأمتار المتاحة:</span>
                        <span className="font-medium">{availableMeters.toFixed(2)} متر</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>سيتم استخدام:</span>
                        <span className="font-medium text-orange-600">{metersUsed.toFixed(2)} متر</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span>المتبقي بعد الإرسال:</span>
                        <span className={`font-bold ${remainingMeters < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {remainingMeters.toFixed(2)} متر
                        </span>
                      </div>
                      {remainingMeters < 0 && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                          ⚠️ الكمية المطلوبة أكبر من المتوفر!
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">ملاحظات</label>
                <textarea
                  value={sendForm.notes}
                  onChange={(e) => setSendForm({ ...sendForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows="2"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  إرسال
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">استلام القطع المصنعة</h2>
            <div className="bg-gray-100 p-3 rounded-lg mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span>رقم الأمر:</span>
                <span className="font-mono">{selectedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>الصنف:</span>
                <span className="font-medium">{selectedOrder.product?.name || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between">
                <span>الأمتار المستخدمة:</span>
                <span>{selectedOrder.metersUsed} متر</span>
              </div>
            </div>
            <form onSubmit={handleReceiveSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">عدد القطع المستلمة *</label>
                <input
                  type="number"
                  value={receiveForm.piecesReceived}
                  onChange={(e) => setReceiveForm({ ...receiveForm, piecesReceived: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">تكلفة التصنيع للقطعة (ج) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={receiveForm.manufacturingCostPerPiece}
                  onChange={(e) => setReceiveForm({ ...receiveForm, manufacturingCostPerPiece: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              {receiveForm.piecesReceived && receiveForm.manufacturingCostPerPiece && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm">
                  <div className="flex justify-between font-bold">
                    <span>إجمالي تكلفة التصنيع:</span>
                    <span className="text-blue-600">
                      {(parseFloat(receiveForm.piecesReceived) * parseFloat(receiveForm.manufacturingCostPerPiece)).toFixed(2)} ج
                    </span>
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">المبلغ المدفوع</label>
                <input
                  type="number"
                  step="0.01"
                  value={receiveForm.paidAmount}
                  onChange={(e) => setReceiveForm({ ...receiveForm, paidAmount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">تاريخ الاستلام *</label>
                <input
                  type="date"
                  value={receiveForm.receivedDate}
                  onChange={(e) => setReceiveForm({ ...receiveForm, receivedDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">ملاحظات</label>
                <textarea
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows="2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  استلام
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiveModal(false);
                    setSelectedOrder(null);
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
