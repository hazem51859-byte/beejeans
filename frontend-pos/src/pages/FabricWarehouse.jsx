import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL;

export default function FabricWarehouse() {
  const { token } = useAuthStore();
  const [warehouse, setWarehouse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [purchaseForm, setPurchaseForm] = useState({
    invoiceNumber: '',
    supplierId: '',
    fabricTypeId: '',
    meters: '',
    paidAmount: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchWarehouse();
    fetchSuppliers();
    fetchFabricTypes();
  }, []);

  const fetchWarehouse = async () => {
    try {
      const response = await axios.get(`${API_URL}/fabric/warehouse`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarehouse(response.data.data);
    } catch (error) {
      console.error('Error fetching warehouse:', error);
      alert('فشل في جلب مخزن القماش');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/suppliers?type=FABRIC`, {
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

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/fabric/purchases`, purchaseForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('تم إضافة مشتريات القماش بنجاح');
      setShowPurchaseModal(false);
      setPurchaseForm({
        invoiceNumber: '',
        supplierId: '',
        fabricTypeId: '',
        meters: '',
        paidAmount: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchWarehouse();
    } catch (error) {
      console.error('Error creating purchase:', error);
      alert(error.response?.data?.message || 'فشل في إضافة المشتريات');
    }
  };

  const selectedFabric = fabricTypes.find(f => f.id === purchaseForm.fabricTypeId);
  const totalCost = selectedFabric ? (parseFloat(purchaseForm.meters) || 0) * selectedFabric.pricePerMeter : 0;
  const remaining = totalCost - (parseFloat(purchaseForm.paidAmount) || 0);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">مخزن القماش</h1>
        <button
          onClick={() => setShowPurchaseModal(true)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
        >
          + شراء قماش
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="text-gray-600 text-sm">إجمالي الأمتار المتاحة</h3>
          <p className="text-2xl font-bold text-blue-700">
            {warehouse.reduce((sum, item) => sum + (item.availableMeters || 0), 0).toFixed(2)} متر
          </p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="text-gray-600 text-sm">إجمالي المشتريات</h3>
          <p className="text-2xl font-bold text-green-700">
            {warehouse.reduce((sum, item) => sum + (item.totalPurchased || 0), 0).toFixed(2)} متر
          </p>
        </div>
        <div className="bg-orange-100 p-4 rounded-lg">
          <h3 className="text-gray-600 text-sm">إجمالي المستخدم</h3>
          <p className="text-2xl font-bold text-orange-700">
            {warehouse.reduce((sum, item) => sum + (item.totalUsed || 0), 0).toFixed(2)} متر
          </p>
        </div>
      </div>

      {/* Warehouse Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع القماش</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">سعر المتر</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">متاح (متر)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">محجوز (متر)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي المشتريات</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي المستخدم</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {warehouse.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{item.fabricType.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.fabricType.pricePerMeter} ج</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-bold ${item.availableMeters < 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.availableMeters.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{item.reservedMeters.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.totalPurchased.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.totalUsed.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">شراء قماش جديد</h2>
            <form onSubmit={handlePurchaseSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">رقم الفاتورة *</label>
                  <input
                    type="text"
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">تاريخ الشراء *</label>
                  <input
                    type="date"
                    value={purchaseForm.purchaseDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">المورد *</label>
                  <select
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
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
                    value={purchaseForm.fabricTypeId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, fabricTypeId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">اختر نوع القماش</option>
                    {fabricTypes.map((fabric) => (
                      <option key={fabric.id} value={fabric.id}>
                        {fabric.name} - {fabric.pricePerMeter} ج/متر
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">عدد الأمتار *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseForm.meters}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, meters: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">المبلغ المدفوع</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseForm.paidAmount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>
              
              {selectedFabric && purchaseForm.meters && (
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <div className="flex justify-between mb-2">
                    <span>سعر المتر:</span>
                    <span className="font-bold">{selectedFabric.pricePerMeter} ج</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>إجمالي التكلفة:</span>
                    <span className="font-bold text-blue-600">{totalCost.toFixed(2)} ج</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المتبقي:</span>
                    <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {remaining.toFixed(2)} ج
                    </span>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">ملاحظات</label>
                <textarea
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows="3"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
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
