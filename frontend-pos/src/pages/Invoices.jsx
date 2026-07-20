import { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { FileText, Search, Calendar, DollarSign, RotateCcw, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Invoices() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  
  const [selectedBranch, setSelectedBranch] = useState(isAdmin ? '' : user?.branchId);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnToMainWarehouse, setReturnToMainWarehouse] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState(null);

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data;
    },
    enabled: isAdmin,
  });

  // normalize: API may return { data: [] } or [] directly
  const branchList = Array.isArray(branches) ? branches : (branches?.data || []);

  const { data: sales } = useQuery({
    queryKey: ['sales', selectedBranch, startDate, endDate],
    queryFn: async () => {
      const params = { startDate, endDate };
      if (selectedBranch) params.branchId = selectedBranch;
      const response = await api.get('/sales', { params });
      return response.data;
    },
  });

  const returnMutation = useMutation({
    mutationFn: async ({ invoiceNumber, items, returnReason, returnToMainWarehouse }) => {
      const response = await api.post(`/sales/return/${invoiceNumber}`, {
        items,
        returnReason,
        returnToMainWarehouse
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales']);
      setShowReturnModal(false);
      setSelectedSale(null);
      setReturnItems([]);
      setReturnReason('');
      setReturnToMainWarehouse(false);
      toast.success('تم استرجاع المنتجات بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ في الاسترجاع');
    },
  });

  const handleSearchInvoice = async () => {
    if (!searchInvoice.trim()) {
      toast.error('الرجاء إدخال رقم الفاتورة');
      return;
    }
    
    try {
      const response = await api.get(`/sales/invoice/${searchInvoice}`);
      const sale = response.data.data;
      
      // التحقق من عمر الفاتورة (14 يوم)
      const saleDate = new Date(sale.createdAt);
      const daysDiff = Math.floor((new Date() - saleDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 14) {
        toast.error('عذراً، لا يمكن استرجاع المنتجات بعد 14 يوم من تاريخ الشراء');
        return;
      }
      
      setSelectedSale(sale);
      setReturnItems(sale.items.map(item => ({
        ...item,
        returnQuantity: 0,
        selected: false,
      })));
      setShowReturnModal(true);
    } catch (error) {
      toast.error('لم يتم العثور على الفاتورة');
    }
  };

  const toggleItemReturn = (index) => {
    const newItems = [...returnItems];
    newItems[index].selected = !newItems[index].selected;
    if (newItems[index].selected) {
      newItems[index].returnQuantity = newItems[index].quantity;
    } else {
      newItems[index].returnQuantity = 0;
    }
    setReturnItems(newItems);
  };

  const updateReturnQuantity = (index, quantity) => {
    const newItems = [...returnItems];
    newItems[index].returnQuantity = Math.min(Math.max(0, quantity), newItems[index].quantity);
    setReturnItems(newItems);
  };

  const handleReturn = () => {
    const itemsToReturn = returnItems.filter(item => item.selected && item.returnQuantity > 0);
    
    if (itemsToReturn.length === 0) {
      toast.error('الرجاء اختيار المنتجات المراد استرجاعها');
      return;
    }
    
    if (!returnReason.trim()) {
      toast.error('الرجاء إدخال سبب الاسترجاع');
      return;
    }
    
    returnMutation.mutate({
      invoiceNumber: selectedSale.invoiceNumber,
      items: itemsToReturn.map(item => ({
        productId: item.productId,
        quantity: item.returnQuantity,
      })),
      returnReason,
      returnToMainWarehouse
    });
  };

  // normalize sales the same way
  const salesList = Array.isArray(sales) ? sales : (sales?.data || []);

  // Calculate totals with refunds
  const totalSales = salesList.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
  const totalRefunds = salesList.reduce((sum, sale) => sum + (sale.refundAmount || 0), 0) || 0;
  const netSales = totalSales - totalRefunds;
  const totalReturns = salesList.filter(s => s.refundAmount > 0).length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الفواتير</h1>
          <p className="text-gray-600 mt-1">سجل كامل للفواتير والمبيعات</p>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium mb-2">الفرع</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="input-field"
              >
                <option value="">كل الفروع</option>
                {branchList.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-blue-700">{totalSales.toFixed(2)} ج.م</p>
            </div>
            <DollarSign className="text-blue-600" size={32} />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">المرتجعات</p>
              <p className="text-2xl font-bold text-red-700">- {totalRefunds.toFixed(2)} ج.م</p>
            </div>
            <RotateCcw className="text-red-600" size={32} />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">الصافي</p>
              <p className="text-2xl font-bold text-green-700">{netSales.toFixed(2)} ج.م</p>
            </div>
            <DollarSign className="text-green-600" size={32} />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">عدد الفواتير</p>
              <p className="text-2xl font-bold text-gray-700">{salesList.length}</p>
            </div>
            <FileText className="text-gray-600" size={32} />
          </div>
        </div>
      </div>

      {/* بحث واسترجاع */}
      <div className="card mb-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <RotateCcw size={20} />
          استرجاع منتج
        </h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              placeholder="أدخل رقم الفاتورة..."
              className="input-field"
              onKeyPress={(e) => e.key === 'Enter' && handleSearchInvoice()}
            />
          </div>
          <button onClick={handleSearchInvoice} className="btn-primary">
            <Search size={20} />
            بحث
          </button>
        </div>
        <div className="mt-3 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
          <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            <strong>ملحوظة:</strong> يمكن استرجاع المنتجات خلال 14 يوم من تاريخ الشراء فقط، ويجب توفر الفاتورة الأصلية.
          </p>
        </div>
      </div>

      {/* قائمة الفواتير */}
      <div className="card">
        <h3 className="font-bold mb-4">سجل الفواتير</h3>
        {salesList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-3 text-sm">رقم الفاتورة</th>
                  <th className="text-right p-3 text-sm">التاريخ</th>
                  <th className="text-right p-3 text-sm">الكاشير</th>
                  {isAdmin && <th className="text-right p-3 text-sm">الفرع</th>}
                  <th className="text-right p-3 text-sm">الإجمالي</th>
                  <th className="text-right p-3 text-sm">مرتجع</th>
                  <th className="text-right p-3 text-sm">الصافي</th>
                  <th className="text-right p-3 text-sm">طريقة الدفع</th>
                </tr>
              </thead>
              <tbody>
                {salesList.map((sale) => {
                  const refundAmount = sale.refundAmount || 0;
                  const netAmount = sale.total - refundAmount;
                  
                  return (
                  <tr 
                    key={sale.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedSaleForDetails(sale);
                      setShowDetailsModal(true);
                    }}
                  >
                    <td className="p-3 text-sm font-mono font-medium text-primary-600">{sale.invoiceNumber}</td>
                    <td className="p-3 text-sm">{new Date(sale.createdAt).toLocaleString('ar-EG')}</td>
                    <td className="p-3 text-sm">{sale.cashier?.fullName}</td>
                    {isAdmin && <td className="p-3 text-sm">{sale.branch?.name}</td>}
                    <td className="p-3 text-sm font-medium text-gray-700">{sale.total.toFixed(2)} ج.م</td>
                    <td className="p-3 text-sm font-medium text-red-600">
                      {refundAmount > 0 ? `${refundAmount.toFixed(2)} ج.م` : '-'}
                    </td>
                    <td className="p-3 text-sm font-bold text-green-700">{netAmount.toFixed(2)} ج.م</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sale.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {sale.paymentMethod === 'CASH' ? 'كاش' : 'فيزا'}
                      </span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">لا توجد فواتير</p>
        )}
      </div>

      {/* Modal الاسترجاع */}
      {showReturnModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">استرجاع منتجات - {selectedSale.invoiceNumber}</h2>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm">
              <p><strong>التاريخ:</strong> {new Date(selectedSale.createdAt).toLocaleString('ar-EG')}</p>
              <p><strong>الإجمالي:</strong> {selectedSale.total.toFixed(2)} ج.م</p>
            </div>

            <div className="space-y-3 mb-4">
              {returnItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItemReturn(index)}
                      className="mt-1 w-5 h-5"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.product?.name}</p>
                      {item.serialNumber && (
                        <p className="text-sm text-primary-600 font-mono">
                          📦 سيريال: {item.serialNumber}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        السعر: {item.unitPrice.toFixed(2)} ج.م
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">سبب الاسترجاع *</label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="input-field"
                rows="3"
                placeholder="مثال: عيب في المنتج، مقاس غير مناسب، إلخ..."
                required
              />
            </div>

            {/* خيار إرجاع للمخزن الرئيسي - للمانجر فقط */}
            {user?.role === 'MANAGER' && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={returnToMainWarehouse}
                    onChange={(e) => setReturnToMainWarehouse(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="font-medium text-sm">
                    إرجاع للمخزن الرئيسي بدلاً من فرعي
                  </span>
                </label>
                <p className="text-xs text-gray-600 mr-7 mt-1">
                  {returnToMainWarehouse 
                    ? '✅ سيتم إرجاع المنتجات للمخزن الرئيسي' 
                    : 'ℹ️ سيتم إرجاع المنتجات لمخزون فرعك'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleReturn}
                className="btn-primary flex-1"
                disabled={returnMutation.isPending}
              >
                {returnMutation.isPending ? 'جاري الاسترجاع...' : 'تأكيد الاسترجاع'}
              </button>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedSale(null);
                  setReturnItems([]);
                  setReturnReason('');
                }}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تفاصيل الفاتورة */}
      {showDetailsModal && selectedSaleForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">تفاصيل الفاتورة - {selectedSaleForDetails.invoiceNumber}</h2>
                {selectedSaleForDetails.refundAmount > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    مرتجع جزئي: {selectedSaleForDetails.refundAmount.toFixed(2)} ج.م
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSaleForDetails(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {selectedSaleForDetails.refundAmount > 0 && selectedSaleForDetails.returnReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-red-700 mb-1">سبب الإرجاع:</p>
                <p className="text-sm text-red-600">{selectedSaleForDetails.returnReason}</p>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><strong>التاريخ:</strong> {new Date(selectedSaleForDetails.createdAt).toLocaleString('ar-EG')}</div>
              <div><strong>الكاشير:</strong> {selectedSaleForDetails.cashier?.fullName}</div>
              <div><strong>الفرع:</strong> {selectedSaleForDetails.branch?.name}</div>
              <div><strong>طريقة الدفع:</strong> {selectedSaleForDetails.paymentMethod === 'CASH' ? 'كاش 💵' : 'فيزا 💳'}</div>
              {selectedSaleForDetails.customerName && (
                <div><strong>العميل:</strong> {selectedSaleForDetails.customerName}</div>
              )}
            </div>

            <h3 className="font-bold mb-3">المنتجات</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-right p-3 text-sm">المنتج</th>
                    <th className="text-center p-3 text-sm">المقاس</th>
                    <th className="text-center p-3 text-sm">اللون</th>
                    <th className="text-center p-3 text-sm">السيريال</th>
                    <th className="text-center p-3 text-sm">الكمية</th>
                    <th className="text-center p-3 text-sm">السعر</th>
                    <th className="text-center p-3 text-sm">الإجمالي</th>
                    <th className="text-center p-3 text-sm">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSaleForDetails.items?.map((item, index) => {
                    const isReturned = item.status === 'RETURNED' || item.isReturned;
                    return (
                    <tr key={index} className={`border-b ${isReturned ? 'bg-red-50' : ''}`}>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={isReturned ? 'line-through text-gray-500' : ''}>{item.product?.name}</span>
                          {isReturned && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                              مرتجع
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-center">
                        {item.size ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            📏 {item.size}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-center">
                        {item.product?.color ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {item.product.color}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-center font-mono text-xs">{item.serialNumber || '-'}</td>
                      <td className="p-3 text-sm text-center">{item.quantity}</td>
                      <td className="p-3 text-sm text-center">{item.unitPrice.toFixed(2)}</td>
                      <td className="p-3 text-sm text-center font-bold">{item.total.toFixed(2)}</td>
                      <td className="p-3 text-sm text-center">
                        {isReturned ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              مرتجع
                            </span>
                            {selectedSaleForDetails.returnReason && (
                              <span className="text-xs text-red-600 italic">
                                {selectedSaleForDetails.returnReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            مباع
                          </span>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan="7" className="p-3 text-sm text-right font-bold">الإجمالي:</td>
                    <td className="p-3 text-sm text-center font-bold text-gray-700">{selectedSaleForDetails.total.toFixed(2)} ج.م</td>
                  </tr>
                  {selectedSaleForDetails.refundAmount > 0 && (
                    <>
                      <tr>
                        <td colSpan="6" className="p-3 text-sm text-right font-bold text-red-600">المرتجع:</td>
                        <td className="p-3 text-sm text-center font-bold text-red-600">-{selectedSaleForDetails.refundAmount.toFixed(2)} ج.م</td>
                      </tr>
                      <tr className="bg-green-50">
                        <td colSpan="6" className="p-3 text-sm text-right font-bold text-green-700">الصافي:</td>
                        <td className="p-3 text-sm text-center font-bold text-green-700">{(selectedSaleForDetails.total - selectedSaleForDetails.refundAmount).toFixed(2)} ج.م</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </div>

            <button
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedSaleForDetails(null);
              }}
              className="w-full btn-secondary"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
