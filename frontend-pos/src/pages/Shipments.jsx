import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import api from '../services/api';

export default function Shipments() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({
    status: '',
    shipmentCompany: ''
  });

  useEffect(() => {
    fetchShipments();
  }, [filter]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.shipmentCompany) params.append('shipmentCompany', filter.shipmentCompany);

      const response = await api.get(`/shipments?${params}`);
      setShipments(response.data);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (shipmentId, newStatus) => {
    try {
      await api.put(`/shipments/${shipmentId}/status`, {
        status: newStatus,
        shippedAt: newStatus === 'SHIPPED' ? new Date().toISOString() : undefined,
        deliveredAt: newStatus === 'DELIVERED' ? new Date().toISOString() : undefined
      });
      
      alert('✅ تم تحديث حالة الشحنة');
      fetchShipments();
      setShowModal(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ فشل تحديث الحالة');
    }
  };

  const confirmPayment = async (shipmentId) => {
    const amount = prompt('أدخل المبلغ المحصل:');
    if (!amount) return;

    try {
      await api.post(`/shipments/${shipmentId}/confirm-payment`, {
        collectedAmount: parseFloat(amount),
        paymentCollectedAt: new Date().toISOString()
      });
      
      alert('✅ تم تأكيد استلام الدفع');
      fetchShipments();
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('❌ فشل تأكيد الدفع');
    }
  };

  const getStatusInfo = (status) => {
    const statuses = {
      PENDING: { label: 'قيد الانتظار', icon: Package, color: 'bg-yellow-100 text-yellow-800' },
      SHIPPED: { label: 'تم الشحن', icon: Truck, color: 'bg-blue-100 text-blue-800' },
      IN_TRANSIT: { label: 'في الطريق', icon: Truck, color: 'bg-indigo-100 text-indigo-800' },
      DELIVERED: { label: 'تم التسليم', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      RETURNED: { label: 'تم الإرجاع', icon: XCircle, color: 'bg-red-100 text-red-800' }
    };
    return statuses[status] || statuses.PENDING;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📦 حالة الشحنات</h1>
        <p className="text-gray-600 mt-1">تتبع وإدارة الشحنات</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">الكل</option>
              <option value="PENDING">قيد الانتظار</option>
              <option value="SHIPPED">تم الشحن</option>
              <option value="IN_TRANSIT">في الطريق</option>
              <option value="DELIVERED">تم التسليم</option>
              <option value="RETURNED">تم الإرجاع</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">شركة الشحن</label>
            <input
              type="text"
              value={filter.shipmentCompany}
              onChange={(e) => setFilter({ ...filter, shipmentCompany: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="ابحث بشركة الشحن..."
            />
          </div>
        </div>
      </div>

      {/* Shipments Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">لا توجد شحنات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shipments.map((shipment) => {
            const statusInfo = getStatusInfo(shipment.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div key={shipment.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm opacity-90">رقم الشحنة</p>
                      <p className="text-lg font-bold">{shipment.shipmentNumber}</p>
                    </div>
                    <StatusIcon size={24} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                      <StatusIcon size={16} />
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">العميل:</span>
                      <span className="font-medium">{shipment.customerName}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">شركة الشحن:</span>
                      <span className="font-medium">{shipment.shipmentCompany}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">رقم البوليصة:</span>
                      <span className="font-medium">{shipment.shipmentBill}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">قيمة الفاتورة:</span>
                      <span className="font-bold text-blue-600">{shipment.invoice.total.toFixed(2)} ج</span>
                    </div>

                    {shipment.paymentCollected && (
                      <div className="bg-green-50 p-2 rounded">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle size={16} />
                          <span className="text-sm font-medium">تم تحصيل المبلغ</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t space-y-2">
                    {shipment.status === 'PENDING' && (
                      <button
                        onClick={() => updateStatus(shipment.id, 'SHIPPED')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Truck size={16} className="inline mr-2" />
                        تأكيد الشحن
                      </button>
                    )}

                    {shipment.status === 'SHIPPED' && (
                      <button
                        onClick={() => updateStatus(shipment.id, 'IN_TRANSIT')}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        في الطريق
                      </button>
                    )}

                    {(shipment.status === 'SHIPPED' || shipment.status === 'IN_TRANSIT') && (
                      <button
                        onClick={() => updateStatus(shipment.id, 'DELIVERED')}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <CheckCircle size={16} className="inline mr-2" />
                        تأكيد التسليم
                      </button>
                    )}

                    {shipment.status === 'DELIVERED' && !shipment.paymentCollected && (
                      <button
                        onClick={() => confirmPayment(shipment.id)}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <DollarSign size={16} className="inline mr-2" />
                        تأكيد استلام المبلغ
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedShipment(shipment);
                        setShowModal(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {showModal && selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 text-white p-6">
              <h2 className="text-2xl font-bold">تفاصيل الشحنة</h2>
              <p className="mt-1">{selectedShipment.shipmentNumber}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-bold text-lg mb-3">معلومات العميل</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">الاسم:</span> {selectedShipment.customerName}</p>
                  {selectedShipment.customerPhone && (
                    <p><span className="font-medium">الهاتف:</span> {selectedShipment.customerPhone}</p>
                  )}
                  {selectedShipment.customerAddress && (
                    <p><span className="font-medium">العنوان:</span> {selectedShipment.customerAddress}</p>
                  )}
                </div>
              </div>

              {/* Shipment Info */}
              <div>
                <h3 className="font-bold text-lg mb-3">معلومات الشحن</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">شركة الشحن:</span> {selectedShipment.shipmentCompany}</p>
                  <p><span className="font-medium">رقم البوليصة:</span> {selectedShipment.shipmentBill}</p>
                  <p><span className="font-medium">الحالة:</span> {getStatusInfo(selectedShipment.status).label}</p>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h3 className="font-bold text-lg mb-3">محتويات الشحنة</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">المنتج</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">الكمية</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">السعر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedShipment.invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm">{item.product.name}</td>
                          <td className="px-4 py-2 text-sm">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm font-medium">{item.totalSale.toFixed(2)} ج</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between text-lg font-bold">
                    <span>الإجمالي:</span>
                    <span className="text-blue-600">{selectedShipment.invoice.total.toFixed(2)} ج</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
