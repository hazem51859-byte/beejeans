import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, User, DollarSign, Package, FileText, Search, CreditCard, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function Customers() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'details'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const [saleData, setSaleData] = useState({
    items: [{ productId: '', description: '', quantity: 1, unitPrice: 0, size: '', color: '', availableQty: 0 }],
    paidAmount: 0,
    paymentMethod: 'CASH',
    notes: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    referenceNumber: '',
    notes: '',
  });

  // Queries
  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data;
    },
  });

  const { data: customerDetailsResponse } = useQuery({
    queryKey: ['customer', selectedCustomer?.id],
    queryFn: async () => {
      const response = await api.get(`/customers/${selectedCustomer.id}`);
      return response.data;
    },
    enabled: !!selectedCustomer?.id,
  });

  const customers = customersResponse?.data || [];
  const customerDetails = customerDetailsResponse?.data || null;

  // Fetch MAIN warehouse branch and its inventory
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data;
    },
  });

  const mainBranch = (branchesData?.data || []).find(b => b.code === 'MAIN');

  const { data: inventoryResponse } = useQuery({
    queryKey: ['main-inventory', mainBranch?.id],
    queryFn: async () => {
      const response = await api.get(`/inventory/branch/${mainBranch.id}`, { params: { limit: 500 } });
      return response.data;
    },
    enabled: !!mainBranch?.id,
  });

  const mainInventory = (inventoryResponse?.data || []).filter(inv => inv.quantity > 0);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setShowModal(false);
      resetForm();
      toast.success('تم إضافة العميل بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      if (selectedCustomer) {
        queryClient.invalidateQueries(['customer', selectedCustomer.id]);
      }
      setShowModal(false);
      setEditingCustomer(null);
      resetForm();
      toast.success('تم تحديث بيانات العميل');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ ما');
    }
  });

  const createSaleMutation = useMutation({
    mutationFn: ({ customerId, data }) => api.post(`/customers/${customerId}/sale`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      if (selectedCustomer) {
        queryClient.invalidateQueries(['customer', selectedCustomer.id]);
      }
      setShowSaleModal(false);
      resetSaleForm();
      toast.success('تم تسجيل الفاتورة وصرفها من المخزن الرئيسي');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء تسجيل الفاتورة');
    }
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ customerId, data }) => api.post(`/customers/${customerId}/payment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      if (selectedCustomer) {
        queryClient.invalidateQueries(['customer', selectedCustomer.id]);
      }
      setShowPaymentModal(false);
      resetPaymentForm();
      toast.success('تم تسجيل الدفعة وتحديث الرصيد');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء تسجيل الدفعة');
    }
  });

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '', notes: '' });
  };

  const resetSaleForm = () => {
    setSaleData({
      items: [{ productId: '', description: '', quantity: 1, unitPrice: 0, size: '', color: '', availableQty: 0 }],
      paidAmount: 0,
      paymentMethod: 'CASH',
      notes: '',
    });
  };

  const resetPaymentForm = () => {
    setPaymentData({ amount: 0, paymentMethod: 'CASH', referenceNumber: '', notes: '' });
  };

  const handleEdit = (customer, e) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSaleSubmit = (e) => {
    e.preventDefault();
    createSaleMutation.mutate({
      customerId: selectedCustomer.id,
      data: saleData
    });
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    recordPaymentMutation.mutate({
      customerId: selectedCustomer.id,
      data: paymentData
    });
  };

  const addSaleItem = () => {
    setSaleData({
      ...saleData,
      items: [...saleData.items, { productId: '', description: '', quantity: 1, unitPrice: 0, size: '', color: '', availableQty: 0 }]
    });
  };

  const updateSaleItem = (index, field, value) => {
    const newItems = [...saleData.items];
    newItems[index][field] = value;
    setSaleData({ ...saleData, items: newItems });
  };

  const removeSaleItem = (index) => {
    setSaleData({
      ...saleData,
      items: saleData.items.filter((_, i) => i !== index)
    });
  };

  const calculateSaleTotal = () => {
    return saleData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6" dir="rtl">
      {activeTab === 'list' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">العملاء</h1>
              <p className="text-gray-600 mt-1">توريد بضاعة مباشرة للعملاء وتتبع حساباتهم والديون المستحقة</p>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary self-start">
              <Plus size={20} />
              <span>عميل جديد</span>
            </button>
          </div>

          <div className="flex items-center bg-white border rounded-lg px-3 py-2 w-full max-w-md shadow-sm">
            <Search className="text-gray-400 mr-1" size={20} />
            <input
              type="text"
              placeholder="ابحث باسم العميل أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm mr-2"
            />
          </div>

          {isLoading ? (
            <p className="text-center text-gray-500 py-12">جاري تحميل العملاء...</p>
          ) : filteredCustomers.length === 0 ? (
            <div className="card text-center py-12 text-gray-500">
              <User size={48} className="mx-auto mb-3 opacity-30" />
              <p>لا يوجد عملاء مطبقين للبحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <div 
                  key={customer.id} 
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setActiveTab('details');
                  }}
                  className="card hover:border-primary-500 hover:shadow-md transition-all cursor-pointer border border-gray-100 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-100 w-10 h-10 rounded-lg flex items-center justify-center text-primary-600">
                          <User size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{customer.name}</h3>
                          <p className="text-sm text-gray-500">{customer.phone || 'بدون هاتف'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleEdit(customer, e)} 
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>

                    {customer.address && (
                      <p className="text-sm text-gray-600 mb-3">📍 {customer.address}</p>
                    )}
                  </div>

                  <div className="border-t pt-3 mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">الرصيد المستحق (لنا)</p>
                      <p className={`text-lg font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {customer.balance.toFixed(2)} ج.م
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        // تفاصيل العميل
        <div className="space-y-6">
          <button 
            onClick={() => {
              setActiveTab('list');
              setSelectedCustomer(null);
            }}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors font-medium"
          >
            <ChevronRight size={20} />
            <span>العودة لقائمة العملاء</span>
          </button>

          {customerDetails && (
            <>
              <div className="card flex flex-col md:flex-row md:items-center justify-between gap-6 border-r-4 border-primary-600">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center text-primary-600">
                    <User size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{customerDetails.name}</h2>
                    <p className="text-gray-500">📞 {customerDetails.phone || 'بدون هاتف'} | 📍 {customerDetails.address || 'بدون عنوان'}</p>
                    {customerDetails.notes && <p className="text-sm text-gray-600 mt-1 italic">ملاحظة: {customerDetails.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-left">
                    <p className="text-xs text-gray-500 text-right">المديونية المتبقية</p>
                    <p className={`text-2xl font-bold ${customerDetails.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {customerDetails.balance.toFixed(2)} ج.م
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setShowSaleModal(true)} className="btn-primary text-sm py-2">
                      <Package size={16} />
                      <span>توريد فاتورة بيع</span>
                    </button>
                    {customerDetails.balance > 0 && (
                      <button onClick={() => setShowPaymentModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm">
                        <DollarSign size={16} />
                        <span>تحصيل دفعة مالية</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* جدول المبيعات والمتحصلات */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* فواتير التوريد */}
                <div className="card">
                  <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    <span>فواتير البيع المباشر</span>
                  </h3>
                  {customerDetails.sales.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">لا توجد فواتير بيع للعميل</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {customerDetails.sales.map((sale) => (
                        <div key={sale.id} className="bg-gray-50 p-3 rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-bold text-sm text-gray-800">{sale.invoiceNumber}</span>
                              <span className="text-xs text-gray-400 block">
                                {new Date(sale.createdAt).toLocaleString('ar-EG')}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              sale.total === sale.amountPaid ? 'bg-green-100 text-green-700' :
                              sale.amountPaid > 0 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {sale.total === sale.amountPaid ? 'مدفوع بالكامل' :
                               sale.amountPaid > 0 ? 'مدفوع جزئياً' : 'آجل'}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-2 pt-2 border-t border-dashed">
                            {sale.items?.map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-600 flex justify-between">
                                <span>• {item.product?.name || 'صنف'} × {item.quantity}</span>
                                <span>{(item.quantity * item.unitPrice).toFixed(2)} ج.م</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between mt-2 pt-2 border-t text-xs font-semibold text-gray-700">
                            <span>الإجمالي: {sale.total.toFixed(2)} ج.م</span>
                            <span>المدفوع: {sale.amountPaid.toFixed(2)} ج.م</span>
                            <span className="text-red-600">المتبقي: {(sale.total - sale.amountPaid).toFixed(2)} ج.م</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* التحصيلات والدفعات */}
                <div className="card">
                  <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign className="text-green-600" size={20} />
                    <span>سجل المدفوعات والتحصيلات</span>
                  </h3>
                  {customerDetails.payments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">لا توجد دفعات مالية مسجلة للعميل</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {customerDetails.payments.map((payment) => (
                        <div key={payment.id} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                          <div>
                            <p className="font-bold text-green-700">{payment.amount.toFixed(2)} ج.م</p>
                            <p className="text-xs text-gray-500">
                              طريقة الدفع: {payment.paymentMethod === 'CASH' ? 'نقدي' : payment.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : 'شيك'}
                            </p>
                            {payment.notes && <p className="text-xs text-gray-600 italic mt-0.5">{payment.notes}</p>}
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(payment.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal: إضافة / تعديل عميل */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingCustomer ? 'تعديل بيانات العميل' : 'عميل جديد'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="اسم العميل بالكامل"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="رقم الموبايل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">العنوان</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                  placeholder="العنوان السكني أو العمل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                  placeholder="أي تفاصيل أو ملاحظات إضافية..."
                />
              </div>
              <div className="flex gap-3 pt-3 border-t">
                <button type="submit" className="btn-primary flex-1">
                  {editingCustomer ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCustomer(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: توريد فاتورة بيع */}
      {showSaleModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">توريد بضاعة للعميل - {selectedCustomer.name}</h2>
            <form onSubmit={handleSaleSubmit} className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-semibold">تفاصيل المنتجات</label>
                {saleData.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-3 relative">
                    <div className="md:col-span-2">
                      <label className="block text-xs mb-1">اختر المنتج من المخزون *</label>
                      <select
                        value={item.productId || ''}
                        onChange={(e) => {
                          const selectedInv = mainInventory.find(inv => inv.product.id === e.target.value);
                          if (selectedInv) {
                            const newItems = [...saleData.items];
                            newItems[index] = {
                              ...newItems[index],
                              productId: selectedInv.product.id,
                              description: selectedInv.product.name,
                              size: '',
                              color: selectedInv.product.color || '',
                              unitPrice: selectedInv.product.sellingPrice || 0,
                              availableQty: selectedInv.quantity,
                            };
                            setSaleData({ ...saleData, items: newItems });
                          }
                        }}
                        className="input-field"
                        required
                      >
                        <option value="">اختر منتج...</option>
                        {mainInventory.map(inv => (
                          <option key={inv.product.id} value={inv.product.id}>
                            {inv.product.name}
                            {inv.product.color ? ` - ${inv.product.color}` : ''}
                            {` (متاح: ${inv.quantity})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1">اللون</label>
                      <input
                        type="text"
                        value={item.color}
                        className="input-field bg-gray-100"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">الكمية * (متاح: {item.availableQty || 0})</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateSaleItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="input-field"
                        min="1"
                        max={item.availableQty || 9999}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">سعر البيع للقطعة *</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateSaleItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="input-field"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    {saleData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSaleItem(index)}
                        className="text-red-500 hover:text-red-700 text-xs mt-2 self-end block"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addSaleItem}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  + إضافة منتج آخر
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">إجمالي الفاتورة</label>
                  <input
                    type="text"
                    value={`${calculateSaleTotal().toFixed(2)} ج.م`}
                    className="input-field bg-gray-100 font-bold text-gray-700"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">المبلغ المدفوع</label>
                  <input
                    type="number"
                    value={saleData.paidAmount}
                    onChange={(e) => setSaleData({ ...saleData, paidAmount: parseFloat(e.target.value) || 0 })}
                    className="input-field font-bold text-green-700"
                    min="0"
                    max={calculateSaleTotal()}
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">طريقة دفع الجزء المقبوض</label>
                  <select
                    value={saleData.paymentMethod}
                    onChange={(e) => setSaleData({ ...saleData, paymentMethod: e.target.value })}
                    className="input-field"
                  >
                    <option value="CASH">نقدي</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CARD">فيزا/كارت</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات الفاتورة</label>
                <textarea
                  value={saleData.notes}
                  onChange={(e) => setSaleData({ ...saleData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                  placeholder="أي تفاصيل أو شروط خاصة بالفاتورة..."
                />
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={createSaleMutation.isLoading}
                >
                  {createSaleMutation.isLoading ? 'جاري تسجيل الفاتورة...' : 'تسجيل وتوريد الفاتورة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaleModal(false);
                    resetSaleForm();
                  }}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: تسجيل دفعة مالية */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">تسجيل دفعة من العميل - {selectedCustomer.name}</h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">المبلغ المطلوب تحصيله *</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                  className="input-field text-lg font-bold text-green-700"
                  min="0.01"
                  max={selectedCustomer.balance}
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">الحد الأقصى هو إجمالي الدين الحالي: {selectedCustomer.balance.toFixed(2)} ج.م</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">طريقة الدفع *</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="CASH">نقدي</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                  <option value="CHECK">شيك بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رقم المرجع (شيك/تحويل)</label>
                <input
                  type="text"
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  className="input-field"
                  placeholder="مثال: رقم الحوالة أو رقم الشيك"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                  placeholder="ملاحظات على الاستلام..."
                />
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={recordPaymentMutation.isLoading}
                >
                  {recordPaymentMutation.isLoading ? 'جاري الحفظ...' : 'تسجيل استلام الدفعة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    resetPaymentForm();
                  }}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50"
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
