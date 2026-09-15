import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { returnsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateReturn() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [sale, setSale] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [returnReason, setReturnReason] = useState('عيب تصنيع');
  const [notes, setNotes] = useState('');

  // البحث عن الفاتورة
  const searchSale = async () => {
    try {
      const response = await api.get(`/sales?invoiceNumber=${invoiceNumber}`);
      const sales = response.data.data;
      
      if (sales && sales.length > 0) {
        const foundSale = sales[0];
        setSale(foundSale);
        
        // تحويل items للفورمات المناسب
        const items = foundSale.items.map(item => ({
          ...item,
          returnQuantity: 0,
          returnReason: returnReason,
          condition: 'GOOD'
        }));
        setSelectedItems(items);
        toast.success('تم العثور على الفاتورة');
      } else {
        toast.error('الفاتورة غير موجودة');
        setSale(null);
        setSelectedItems([]);
      }
    } catch (error) {
      toast.error('خطأ في البحث عن الفاتورة');
      console.error(error);
    }
  };

  const updateItemQuantity = (itemId, quantity) => {
    setSelectedItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, returnQuantity: Math.max(0, Math.min(quantity, item.quantity)) } : item
      )
    );
  };

  const updateItemReason = (itemId, reason) => {
    setSelectedItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, returnReason: reason } : item
      )
    );
  };

  const updateItemCondition = (itemId, condition) => {
    setSelectedItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, condition } : item
      )
    );
  };

  const createReturnMutation = useMutation({
    mutationFn: returnsAPI.create,
    onSuccess: () => {
      toast.success('تم تسجيل المرتجع بنجاح');
      navigate('/returns-management');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في تسجيل المرتجع');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const itemsToReturn = selectedItems.filter(item => item.returnQuantity > 0);

    if (itemsToReturn.length === 0) {
      toast.error('يجب اختيار منتج واحد على الأقل للإرجاع');
      return;
    }

    const returnData = {
      saleId: sale.id,
      items: itemsToReturn.map(item => ({
        productId: item.productId,
        quantity: item.returnQuantity,
        size: item.size,
        returnReason: item.returnReason,
        condition: item.condition,
        conditionNotes: item.conditionNotes
      })),
      refundMethod,
      returnReason,
      notes,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone
    };

    createReturnMutation.mutate(returnData);
  };

  const totalReturnAmount = selectedItems
    .filter(item => item.returnQuantity > 0)
    .reduce((sum, item) => sum + (item.unitPrice * item.returnQuantity), 0);

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/returns-management')}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          رجوع
        </button>
        <h1 className="text-2xl font-bold">تسجيل مرتجع جديد</h1>
      </div>

      {/* البحث عن الفاتورة */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4">بيانات الفاتورة</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">رقم الفاتورة</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchSale()}
                className="input-field flex-1"
                placeholder="INV-YYYYMMDD-XXXXX"
              />
              <button
                onClick={searchSale}
                className="btn-primary flex items-center gap-2"
              >
                <Search size={20} />
                بحث
              </button>
            </div>
          </div>
        </div>

        {sale && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600">رقم الفاتورة:</span>
                <p className="font-bold">{sale.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">التاريخ:</span>
                <p className="font-bold">{new Date(sale.createdAt).toLocaleDateString('ar-EG')}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">العميل:</span>
                <p className="font-bold">{sale.customerName || 'غير محدد'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">الإجمالي:</span>
                <p className="font-bold text-green-600">{sale.total.toFixed(2)} ج.م</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {sale && (
        <form onSubmit={handleSubmit}>
          {/* المنتجات */}
          <div className="card mb-6">
            <h2 className="text-lg font-bold mb-4">المنتجات المباعة</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-right">المنتج</th>
                    <th className="px-4 py-2 text-center">الكمية المباعة</th>
                    <th className="px-4 py-2 text-center">كمية الإرجاع</th>
                    <th className="px-4 py-2 text-center">السعر</th>
                    <th className="px-4 py-2 text-center">السبب</th>
                    <th className="px-4 py-2 text-center">الحالة</th>
                    <th className="px-4 py-2 text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-2">
                        <div>
                          <p className="font-bold">{item.product?.name}</p>
                          <p className="text-sm text-gray-500">{item.product?.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center font-bold">{item.quantity}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={item.returnQuantity}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="input-field text-center w-20"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">{item.unitPrice.toFixed(2)} ج.م</td>
                      <td className="px-4 py-2">
                        <select
                          value={item.returnReason}
                          onChange={(e) => updateItemReason(item.id, e.target.value)}
                          className="input-field text-sm"
                          disabled={item.returnQuantity === 0}
                        >
                          <option value="عيب تصنيع">عيب تصنيع</option>
                          <option value="مقاس غير مناسب">مقاس غير مناسب</option>
                          <option value="لون غير مناسب">لون غير مناسب</option>
                          <option value="تغيير رأي العميل">تغيير رأي العميل</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={item.condition}
                          onChange={(e) => updateItemCondition(item.id, e.target.value)}
                          className="input-field text-sm"
                          disabled={item.returnQuantity === 0}
                        >
                          <option value="GOOD">جيدة</option>
                          <option value="DAMAGED">تالفة</option>
                          <option value="DEFECTIVE">معيبة</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center font-bold text-red-600">
                        {(item.unitPrice * item.returnQuantity).toFixed(2)} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* معلومات الإرجاع */}
          <div className="card mb-6">
            <h2 className="text-lg font-bold mb-4">معلومات الإرجاع</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">طريقة الاسترداد</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="CASH">نقدي</option>
                  <option value="CARD">فيزا</option>
                  <option value="EXCHANGE">استبدال</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">سبب الإرجاع العام</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="عيب تصنيع">عيب تصنيع</option>
                  <option value="مقاس غير مناسب">مقاس غير مناسب</option>
                  <option value="لون غير مناسب">لون غير مناسب</option>
                  <option value="تغيير رأي العميل">تغيير رأي العميل</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
            </div>
          </div>

          {/* الإجمالي والإرسال */}
          <div className="card bg-yellow-50 border-2 border-yellow-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">إجمالي المبلغ المسترد:</h3>
              <p className="text-3xl font-bold text-red-600">{totalReturnAmount.toFixed(2)} ج.م</p>
            </div>
            
            <button
              type="submit"
              disabled={createReturnMutation.isPending || totalReturnAmount === 0}
              className="w-full btn-primary text-lg py-3 disabled:opacity-50"
            >
              {createReturnMutation.isPending ? 'جاري التسجيل...' : 'تسجيل المرتجع ✓'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
