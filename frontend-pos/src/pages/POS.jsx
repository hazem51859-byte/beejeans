import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Search, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { productAPI, saleAPI, shiftAPI } from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export default function POS() {
  const { user } = useAuthStore();
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal, getSubtotal, getTotalTax } = useCartStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [currentShift, setCurrentShift] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Get current shift
  const { data: shiftData } = useQuery({
    queryKey: ['current-shift'],
    queryFn: shiftAPI.getCurrent,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (shiftData?.data?.data) {
      setCurrentShift(shiftData.data.data);
    }
  }, [shiftData]);

  // Search products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-search', searchQuery],
    queryFn: () => productAPI.search(searchQuery),
    enabled: searchQuery.length > 0,
  });

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: saleAPI.create,
    onSuccess: (response) => {
      toast.success('تم إتمام البيع بنجاح!');
      clearCart();
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      
      // Print invoice (optional)
      if (window.confirm('هل تريد طباعة الفاتورة؟')) {
        printInvoice(response.data.data);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في إتمام البيع');
    },
  });

  const handleAddProduct = (product) => {
    addItem(product);
    setSearchQuery('');
    toast.success(`تم إضافة ${product.name}`);
  };

  const handleCompleteSale = () => {
    if (!currentShift) {
      toast.error('يجب فتح شيفت أولاً');
      return;
    }

    if (items.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    const total = getTotal();
    const paid = parseFloat(amountPaid) || 0;

    if (paid < total) {
      toast.error('المبلغ المدفوع أقل من الإجمالي');
      return;
    }

    const saleData = {
      branchId: user.branchId,
      shiftId: currentShift.id,
      items: items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        discount: item.discount || 0,
      })),
      paymentMethod,
      amountPaid: paid,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      discountAmount: 0,
    };

    createSaleMutation.mutate(saleData);
  };

  const printInvoice = (sale) => {
    // Simple print implementation
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة ${sale.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <h2>فاتورة بيع</h2>
          <p><strong>رقم الفاتورة:</strong> ${sale.invoiceNumber}</p>
          <p><strong>التاريخ:</strong> ${new Date(sale.createdAt).toLocaleString('ar-EG')}</p>
          <p><strong>الكاشير:</strong> ${sale.cashier.fullName}</p>
          <p><strong>الفرع:</strong> ${sale.branch.name}</p>
          ${customerName ? `<p><strong>العميل:</strong> ${customerName}</p>` : ''}
          
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unitPrice} جنيه</td>
                  <td>${item.total} جنيه</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p><strong>المجموع الفرعي:</strong> ${sale.subtotal} جنيه</p>
          <p><strong>الضريبة:</strong> ${sale.taxAmount} جنيه</p>
          <p class="total"><strong>الإجمالي:</strong> ${sale.total} جنيه</p>
          <p><strong>المدفوع:</strong> ${sale.amountPaid} جنيه</p>
          <p><strong>الباقي:</strong> ${sale.changeAmount} جنيه</p>
          
          <p style="text-align: center; margin-top: 30px;">شكراً لتعاملكم معنا</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const total = getTotal();
  const subtotal = getSubtotal();
  const tax = getTotalTax();
  const change = parseFloat(amountPaid || 0) - total;

  return (
    <div className="h-full flex gap-4">
      {/* Left: Products Search */}
      <div className="flex-1 flex flex-col">
        <div className="card mb-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن منتج (اسم، باركود، SKU)..."
              className="input-field pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="card flex-1 overflow-auto">
            {isLoading ? (
              <p className="text-center text-gray-500">جاري البحث...</p>
            ) : productsData?.data?.data?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productsData.data.data.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    className="p-4 border rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-right"
                  >
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.sku}</p>
                    <p className="text-lg font-bold text-primary-600 mt-2">
                      {product.sellingPrice} جنيه
                    </p>
                    {product.color && (
                      <p className="text-sm text-gray-600">اللون: {product.color}</p>
                    )}
                    {product.size && (
                      <p className="text-sm text-gray-600">المقاس: {product.size}</p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">لا توجد نتائج</p>
            )}
          </div>
        )}

        {!searchQuery && (
          <div className="card flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Search size={64} className="mx-auto mb-4" />
              <p>ابحث عن منتج لإضافته</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Cart & Payment */}
      <div className="w-96 flex flex-col">
        {/* Current Shift Info */}
        {currentShift ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium">الشيفت مفتوح</p>
            <p className="text-xs text-gray-600">رقم: {currentShift.shiftNumber}</p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-red-700">لا يوجد شيفت مفتوح</p>
          </div>
        )}

        {/* Cart Items */}
        <div className="card flex-1 overflow-auto mb-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={20} />
            <h2 className="font-bold">السلة ({items.length})</h2>
          </div>

          {items.length === 0 ? (
            <p className="text-center text-gray-400 py-8">السلة فارغة</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.sellingPrice} جنيه</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 text-center border rounded py-1"
                      min="1"
                    />
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      <Plus size={16} />
                    </button>
                    <span className="mr-auto font-medium">
                      {(item.sellingPrice * item.quantity).toFixed(2)} جنيه
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="card">
          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="font-medium">{subtotal.toFixed(2)} جنيه</span>
            </div>
            <div className="flex justify-between">
              <span>الضريبة:</span>
              <span className="font-medium">{tax.toFixed(2)} جنيه</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>الإجمالي:</span>
              <span className="text-primary-600">{total.toFixed(2)} جنيه</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">طريقة الدفع</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input-field"
              >
                <option value="CASH">نقدي</option>
                <option value="CARD">بطاقة</option>
                <option value="CREDIT">آجل</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">المبلغ المدفوع</label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="input-field"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            {change >= 0 && amountPaid && (
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-sm">الباقي: </span>
                <span className="font-bold">{change.toFixed(2)} جنيه</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">اسم العميل (اختياري)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-field"
                placeholder="اسم العميل"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">رقم الهاتف (اختياري)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="input-field"
                placeholder="01XXXXXXXXX"
              />
            </div>

            <button
              onClick={handleCompleteSale}
              disabled={items.length === 0 || !currentShift || createSaleMutation.isPending}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createSaleMutation.isPending ? 'جاري الحفظ...' : 'إتمام البيع'}
            </button>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="w-full btn-secondary"
              >
                مسح السلة
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
