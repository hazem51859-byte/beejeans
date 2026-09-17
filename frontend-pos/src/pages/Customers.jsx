import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, DollarSign, Eye, X, Receipt, FileText, Printer, Trash2, Search } from 'lucide-react';
import api from '../services/api';
import dayjs from 'dayjs';

export default function Customers() {
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  
  // Office Customers
  const [officeCustomerSearch, setOfficeCustomerSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL'); // ALL, REGULAR, SHIPMENT, CLIENT
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const [saleData, setSaleData] = useState({
    items: [],
    paidAmount: 0,
    paymentMethod: 'CASH',
    notes: '',
  });

  const [saleItem, setSaleItem] = useState({
    productId: '',
    productName: '',
    quantity: 1,
    unitPrice: 0,
    size: '',
    color: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    vaultId: '', // الخزينة المختارة
    referenceNumber: '',
    notes: '',
    invoiceAllocations: [], // توزيع المبلغ على الفواتير
  });

  const [vaults, setVaults] = useState([]); // قائمة الخزائن

  // Fetch vaults
  const { data: vaultsData } = useQuery({
    queryKey: ['vaults'],
    queryFn: async () => {
      const response = await api.get('/vaults');
      return response.data;
    },
  });

  // Update vaults when data changes
  useEffect(() => {
    if (vaultsData?.data) {
      const vaultsList = Array.isArray(vaultsData.data) ? vaultsData.data : [];
      setVaults(vaultsList.filter(v => v.isActive));
    }
  }, [vaultsData]);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products', { params: { status: 'ACTIVE' } });
      return response.data;
    },
  });

  const { data: officeCustomers } = useQuery({
    queryKey: ['officeCustomers'],
    queryFn: async () => {
      const response = await api.get('/office-customers');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setShowModal(false);
      resetForm();
      toast.success('تم إضافة العميل بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل في إضافة العميل');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setShowModal(false);
      setEditingCustomer(null);
      resetForm();
      toast.success('تم تحديث العميل');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      toast.success('تم حذف العميل بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل في حذف العميل');
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: ({ customerId, data }) => api.post(`/customers/${customerId}/sales`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setShowSaleModal(false);
      setSelectedCustomer(null);
      setSaleData({ items: [], paidAmount: 0, paymentMethod: 'CASH', notes: '' });
      toast.success('تم تسجيل الفاتورة بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل في تسجيل الفاتورة');
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ customerId, data }) => api.post(`/customers/${customerId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setShowPaymentModal(false);
      setSelectedCustomer(null);
      setPaymentData({ amount: 0, paymentMethod: 'CASH', referenceNumber: '', notes: '' });
      toast.success('تم تسجيل الدفعة بنجاح');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل في تسجيل الدفعة');
    },
  });

  const deleteCompletedSaleMutation = useMutation({
    mutationFn: (saleId) => api.delete(`/customers/sales/${saleId}`),
    onSuccess: async () => {
      toast.success('تم حذف الفاتورة بنجاح');
      // تحديث بيانات العميل المفتوح في الـ modal
      if (selectedCustomer) {
        const response = await api.get(`/customers/${selectedCustomer.id}`);
        setSelectedCustomer(response.data.data);
      }
      queryClient.invalidateQueries(['customers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل في حذف الفاتورة');
    },
  });

  const deleteCompletedOfficeInvoiceMutation = useMutation({
    mutationFn: (invoiceId) => api.delete(`/customers/office-invoices/${invoiceId}`),
    onSuccess: async () => {
      toast.success('تم حذف فاتورة المكتب بنجاح');
      if (selectedCustomer) {
        const response = await api.get(`/customers/${selectedCustomer.id}`);
        setSelectedCustomer(response.data.data);
      }
      queryClient.invalidateQueries(['customers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'فشل في حذف الفاتورة');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '', notes: '' });
  };

  const handleEdit = (customer) => {
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

  const openSaleModal = (customer) => {
    setSelectedCustomer(customer);
    setShowSaleModal(true);
  };

  const openPaymentModal = async (customer) => {
    try {
      const response = await api.get(`/customers/${customer.id}`);
      const customerData = response.data.data;
      
      // جلب فواتير التقسيط المستحقة (اللي لسه عليها فلوس)
      const unpaidSales = customerData.sales?.filter(sale => sale.total > sale.amountPaid) || [];
      
      // جلب فواتير المكتب المستحقة
      const unpaidOfficeInvoices = customerData.officeInvoices?.filter(inv => inv.total > inv.paidAmount) || [];
      
      // إعداد توزيع افتراضي للفواتير
      const allocations = [
        ...unpaidSales.map(sale => ({
          saleId: sale.id,
          invoiceType: 'sale',
          invoiceNumber: sale.invoiceNumber,
          description: 'فاتورة تقسيط',
          total: sale.total,
          amountPaid: sale.amountPaid,
          remaining: sale.total - sale.amountPaid,
          allocation: 0,
        })),
        ...unpaidOfficeInvoices.map(invoice => ({
          officeInvoiceId: invoice.id,
          invoiceType: 'office',
          invoiceNumber: invoice.invoiceNumber,
          description: `فاتورة مكتب (${
            invoice.type === 'REGULAR' ? 'زبون عادي' :
            invoice.type === 'SHIPMENT' ? 'شحن' :
            invoice.type === 'CLIENT' ? 'عميل دائم' : invoice.type
          })`,
          total: invoice.total,
          amountPaid: invoice.paidAmount,
          remaining: invoice.total - invoice.paidAmount,
          allocation: 0,
        }))
      ];
      
      setSelectedCustomer(customerData);
      setPaymentData({
        amount: 0,
        paymentMethod: 'CASH',
        referenceNumber: '',
        notes: '',
        invoiceAllocations: allocations,
      });
      setShowPaymentModal(true);
    } catch (error) {
      toast.error('فشل في تحميل بيانات العميل');
    }
  };

  const openDetailsModal = async (customer) => {
    try {
      const response = await api.get(`/customers/${customer.id}`);
      setSelectedCustomer(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('فشل في تحميل بيانات العميل');
    }
  };

  const openStatementModal = async (customer) => {
    try {
      const response = await api.get(`/customers/${customer.id}`);
      setSelectedCustomer(response.data.data);
      setShowStatementModal(true);
    } catch (error) {
      toast.error('فشل في تحميل كشف الحساب');
    }
  };

  const openPrintModal = (sale) => {
    // فتح نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank');
    const content = generateInvoiceHTML(sale, selectedCustomer);
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generateInvoiceHTML = (sale, customer) => {
    const totalItems = sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const remaining = sale.total - sale.amountPaid;
    
    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${sale.invoiceNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 10mm; 
            direction: rtl;
            font-size: 11px;
            color: #000;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 8px; 
            margin-bottom: 10px; 
          }
          .logo { 
            width: 80px; 
            height: 80px; 
            margin: 0 auto 5px; 
          }
          h1 { 
            font-size: 16px; 
            color: #000; 
            margin: 5px 0; 
          }
          .contact { 
            font-size: 9px; 
            color: #000; 
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 8px; 
            margin-bottom: 10px; 
          }
          .info-box { 
            border: 1px solid #000; 
            padding: 6px; 
          }
          .info-box h3 { 
            font-size: 11px; 
            color: #000; 
            margin-bottom: 4px; 
            font-weight: bold;
          }
          .info-box p { 
            margin: 3px 0; 
            font-size: 10px; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0; 
            font-size: 11px;
            border: 2px solid #000;
          }
          th { 
            background: #000; 
            color: white; 
            padding: 6px; 
            text-align: right; 
            border: 2px solid #000; 
            font-size: 11px;
            font-weight: bold;
          }
          td { 
            padding: 5px; 
            border: 1.5px solid #000; 
          }
          .totals { 
            max-width: 300px; 
            margin-left: auto; 
            border-top: 2px solid #000; 
            padding-top: 8px; 
            font-size: 11px;
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 3px 0; 
          }
          .total-row.grand { 
            font-size: 14px; 
            font-weight: bold; 
            border-top: 2px solid #000; 
            padding-top: 6px; 
            margin-top: 4px; 
          }
          .total-row.paid { 
            font-size: 12px; 
            font-weight: bold; 
          }
          .total-row.remaining { 
            font-size: 13px; 
            font-weight: bold; 
            border: 2px solid #000; 
            padding: 6px; 
            margin-top: 4px; 
          }
          .footer { 
            text-align: center; 
            margin-top: 12px; 
            padding-top: 8px; 
            border-top: 1px solid #000; 
            font-size: 10px;
          }
          @media print {
            body { margin: 5mm; }
            @page { 
              size: A4; 
              margin: 5mm; 
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/BISO.jpg" alt="Logo" class="logo">
          <h1>Biso & Gilan & Layan</h1>
          <p class="contact">01XXXXXXXXX | info@biso.com | القاهرة، مصر</p>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>بيانات الفاتورة</h3>
            <p><strong>رقم الفاتورة:</strong> ${sale.invoiceNumber}</p>
            <p><strong>التاريخ:</strong> ${new Date(sale.createdAt).toLocaleString('ar-EG')}</p>
            <p><strong>طريقة الدفع:</strong> ${
              sale.paymentMethod === 'CASH' ? 'نقدي' :
              sale.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
              sale.paymentMethod === 'CARD' ? 'بطاقة' : 'آجل'
            }</p>
          </div>

          <div class="info-box">
            <h3>بيانات العميل</h3>
            <p><strong>الاسم:</strong> ${customer?.name || 'غير محدد'}</p>
            <p><strong>الهاتف:</strong> ${customer?.phone || 'غير محدد'}</p>
            <p><strong>العنوان:</strong> ${customer?.address || 'غير محدد'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>المنتج</th>
              <th style="width: 60px;">اللون</th>
              <th style="width: 50px;">الكمية</th>
              <th style="width: 70px;">السعر</th>
              <th style="width: 80px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items?.map((item, index) => `
              <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td><strong>${item.product?.name || 'غير محدد'}</strong></td>
                <td>${item.color || '-'}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td>${item.unitPrice.toFixed(2)}</td>
                <td><strong>${item.total.toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>إجمالي الكمية:</span>
            <strong>${totalItems} قطعة</strong>
          </div>
          <div class="total-row">
            <span>المجموع الفرعي:</span>
            <span>${sale.subtotal.toFixed(2)} ج.م</span>
          </div>
          ${sale.discountAmount > 0 ? `
          <div class="total-row">
            <span>الخصم:</span>
            <span>- ${sale.discountAmount.toFixed(2)} ج.م</span>
          </div>
          ` : ''}
          <div class="total-row grand">
            <span>الإجمالي الكلي:</span>
            <span>${sale.total.toFixed(2)} ج.م</span>
          </div>
          <div class="total-row paid">
            <span>المبلغ المدفوع:</span>
            <span>${sale.amountPaid.toFixed(2)} ج.م</span>
          </div>
          ${remaining > 0 ? `
          <div class="total-row remaining">
            <span>المبلغ المتبقي:</span>
            <span>${remaining.toFixed(2)} ج.م</span>
          </div>
          ` : ''}
        </div>

        ${sale.notes ? `
        <div style="margin-top: 8px; padding: 6px; border: 1px solid #000; font-size: 10px;">
          <strong>ملاحظات:</strong> ${sale.notes}
        </div>
        ` : ''}

        <div class="footer">
          <p style="font-weight: bold;">شكراً لتعاملكم معنا</p>
          <p style="margin-top: 3px;">طُبعت في: ${new Date().toLocaleString('ar-EG')}</p>
        </div>
      </body>
      </html>
    `;
  };

  const addSaleItem = () => {
    if (!saleItem.productName || saleItem.quantity <= 0 || saleItem.unitPrice <= 0) {
      toast.error('يرجى ملء جميع البيانات المطلوبة');
      return;
    }

    const newItem = {
      ...saleItem,
      quantity: parseInt(saleItem.quantity),
      unitPrice: parseFloat(saleItem.unitPrice),
      total: parseInt(saleItem.quantity) * parseFloat(saleItem.unitPrice),
    };

    setSaleData({ ...saleData, items: [...saleData.items, newItem] });
    setSaleItem({ productId: '', productName: '', quantity: 1, unitPrice: 0, size: '', color: '' });
  };

  const removeSaleItem = (index) => {
    setSaleData({ ...saleData, items: saleData.items.filter((_, i) => i !== index) });
  };

  const handleSaleSubmit = (e) => {
    e.preventDefault();
    if (saleData.items.length === 0) {
      toast.error('يرجى إضافة منتج واحد على الأقل');
      return;
    }
    createSaleMutation.mutate({
      customerId: selectedCustomer.id,
      data: {
        items: saleData.items,
        paidAmount: parseFloat(saleData.paidAmount),
        paymentMethod: saleData.paymentMethod,
        notes: saleData.notes,
      },
    });
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    
    const totalAllocated = paymentData.invoiceAllocations.reduce((sum, inv) => sum + (parseFloat(inv.allocation) || 0), 0);
    
    if (totalAllocated <= 0) {
      toast.error('يرجى توزيع المبلغ على الفواتير');
      return;
    }

    if (!paymentData.vaultId) {
      toast.error('يرجى اختيار الخزينة');
      return;
    }
    
    // فلترة وتقسيم الفواتير حسب النوع
    const salesAllocations = paymentData.invoiceAllocations
      .filter(inv => inv.invoiceType === 'sale' && inv.allocation > 0)
      .map(inv => ({
        saleId: inv.saleId,
        amount: parseFloat(inv.allocation),
      }));
    
    const officeInvoicesAllocations = paymentData.invoiceAllocations
      .filter(inv => inv.invoiceType === 'office' && inv.allocation > 0)
      .map(inv => ({
        officeInvoiceId: inv.officeInvoiceId,
        amount: parseFloat(inv.allocation),
      }));
    
    recordPaymentMutation.mutate({
      customerId: selectedCustomer.id,
      data: {
        amount: totalAllocated,
        paymentMethod: paymentData.paymentMethod,
        vaultId: paymentData.vaultId, // إضافة الخزينة
        referenceNumber: paymentData.referenceNumber,
        notes: paymentData.notes,
        invoiceAllocations: salesAllocations,
        officeInvoicesAllocations: officeInvoicesAllocations,
      },
    });
  };
  
  const autoDistributePayment = (amount) => {
    const totalAmount = parseFloat(amount) || 0;
    let remaining = totalAmount;
    
    const updatedAllocations = paymentData.invoiceAllocations.map(inv => {
      if (remaining <= 0) return { ...inv, allocation: 0 };
      
      const toAllocate = Math.min(remaining, inv.remaining);
      remaining -= toAllocate;
      
      return { ...inv, allocation: toAllocate };
    });
    
    setPaymentData({ ...paymentData, amount: totalAmount, invoiceAllocations: updatedAllocations });
  };
  
  const updateInvoiceAllocation = (index, value) => {
    const newValue = parseFloat(value) || 0;
    const invoice = paymentData.invoiceAllocations[index];
    
    // التأكد من عدم تجاوز المبلغ المتبقي
    const allocatedValue = Math.min(newValue, invoice.remaining);
    
    const updatedAllocations = [...paymentData.invoiceAllocations];
    updatedAllocations[index] = { ...invoice, allocation: allocatedValue };
    
    // حساب الإجمالي
    const totalAllocated = updatedAllocations.reduce((sum, inv) => sum + (inv.allocation || 0), 0);
    
    setPaymentData({ ...paymentData, amount: totalAllocated, invoiceAllocations: updatedAllocations });
  };

  const saleTotal = saleData.items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">العملاء (الجملة)</h1>
          <p className="text-gray-600 mt-1">إدارة عملاء الجملة والمبيعات الآجلة</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={20} />
          <span>عميل جديد</span>
        </button>
      </div>

      {/* Search and Filter Tabs - at the top */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={officeCustomerSearch}
              onChange={(e) => setOfficeCustomerSearch(e.target.value)}
              placeholder="ابحث برقم الهاتف أو الاسم..."
              className="w-full p-3 pr-10 border rounded-lg"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل ({(customers?.data?.length || 0) + (officeCustomers?.data?.length || 0)})
            </button>
            <button
              onClick={() => setSelectedType('CLIENT')}
              className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === 'CLIENT'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👤 عملاء دائمين ({(customers?.data?.length || 0) + (officeCustomers?.data?.filter(c => c.type === 'CLIENT').length || 0)})
            </button>
            <button
              onClick={() => setSelectedType('REGULAR')}
              className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === 'REGULAR'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🛒 زباين عاديين ({officeCustomers?.data?.filter(c => c.type === 'REGULAR').length || 0})
            </button>
            <button
              onClick={() => setSelectedType('SHIPMENT')}
              className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === 'SHIPMENT'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📦 شحن ({officeCustomers?.data?.filter(c => c.type === 'SHIPMENT').length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Wholesale Customers (عملاء دائمين) - show when ALL or CLIENT */}
      {(selectedType === 'ALL' || selectedType === 'CLIENT') && (() => {
        const filteredWholesale = customers?.data?.filter(customer => {
          if (!officeCustomerSearch) return true;
          return customer.name?.toLowerCase().includes(officeCustomerSearch.toLowerCase()) ||
            customer.phone?.includes(officeCustomerSearch);
        }) || [];
        
        return filteredWholesale.length > 0 ? (
          <div className="mb-8">
            {selectedType === 'ALL' && (
              <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                👤 عملاء دائمين (الجملة)
                <span className="text-sm font-normal text-gray-500">({filteredWholesale.length} عميل)</span>
              </h2>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredWholesale.map((customer) => (
                <div key={customer.id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
                        <DollarSign className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{customer.name}</h3>
                        <p className="text-sm text-gray-500">{customer.phone || 'بدون هاتف'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(customer)} className="text-gray-600 hover:text-gray-800">
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف العميل "${customer.name}"؟`)) {
                            deleteMutation.mutate(customer.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">إجمالي المبيعات</p>
                      <p className="text-lg font-bold text-blue-700">{(customer.totalSales || 0).toFixed(2)} ج.م</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">المدفوع</p>
                      <p className="text-lg font-bold text-green-700">{(customer.totalPaid || 0).toFixed(2)} ج.م</p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      customer.balance > 0 ? 'bg-red-50' : 
                      customer.balance < 0 ? 'bg-orange-50' : 
                      'bg-gray-50'
                    }`}>
                      <p className="text-xs text-gray-600 mb-1">
                        {customer.balance > 0 ? 'المتبقي (لنا)' : customer.balance < 0 ? 'علينا ليه' : 'لا يوجد'}
                      </p>
                      <p className={`text-lg font-bold ${
                        customer.balance > 0 ? 'text-red-700' : 
                        customer.balance < 0 ? 'text-orange-700' : 
                        'text-gray-700'
                      }`}>
                        {Math.abs(customer.balance || 0).toFixed(2)} ج.م
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openSaleModal(customer)} className="btn-primary flex-1">
                      <Receipt size={16} />
                      فاتورة جديدة
                    </button>
                    {customer.balance > 0 && (
                      <button onClick={() => openPaymentModal(customer)} className="btn-primary flex-1 bg-green-600 hover:bg-green-700">
                        <DollarSign size={16} />
                        تحصيل
                      </button>
                    )}
                    <button onClick={() => openDetailsModal(customer)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Office Customers (زباين عاديين وشحن) - show when ALL, REGULAR, or SHIPMENT */}
      {(selectedType === 'ALL' || selectedType === 'REGULAR' || selectedType === 'SHIPMENT' || selectedType === 'CLIENT') && (() => {
        const filteredOffice = officeCustomers?.data?.filter(customer => {
          const matchesSearch = officeCustomerSearch.length === 0 || 
            customer.phone.includes(officeCustomerSearch) ||
            customer.name.toLowerCase().includes(officeCustomerSearch.toLowerCase());
          const matchesType = selectedType === 'ALL' || customer.type === selectedType;
          return matchesSearch && matchesType;
        }) || [];

        // Don't show wholesale customers again under CLIENT tab (they're already shown above)
        const officeFiltered = selectedType === 'CLIENT' 
          ? filteredOffice.filter(c => c.type === 'CLIENT')
          : filteredOffice;
        
        return officeFiltered.length > 0 ? (
          <div>
            {selectedType === 'ALL' && (
              <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                🛒 عملاء المكتب (زباين عاديين وشحن)
                <span className="text-sm font-normal text-gray-500">({officeFiltered.length} عميل)</span>
              </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {officeFiltered.map((customer) => (
                <div key={customer.id} className={`card ${
                  customer.type === 'CLIENT' ? 'border-l-4 border-teal-500' :
                  customer.type === 'REGULAR' ? 'border-l-4 border-green-500' : 
                  'border-l-4 border-purple-500'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          customer.type === 'CLIENT' ? 'bg-teal-100 text-teal-700' :
                          customer.type === 'REGULAR' ? 'bg-green-100 text-green-700' : 
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {customer.type === 'CLIENT' ? '👤 عميل دائم' : 
                           customer.type === 'REGULAR' ? '🛒 زبون عادي' : '📦 شحن'}
                        </span>
                        {!customer.isActive && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                            غير نشط
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg">{customer.name}</h3>
                      <p className="text-sm text-gray-600">📱 {customer.phone}</p>
                      {customer.shipmentCompany && (
                        <p className="text-xs text-purple-600 mt-1">📦 {customer.shipmentCompany}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-gray-600">عدد الفواتير</p>
                      <p className="text-lg font-bold text-blue-700">{customer.totalInvoices}</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-xs text-gray-600">إجمالي المبيعات</p>
                      <p className="text-sm font-bold text-green-700">{customer.totalSales.toFixed(2)} ج</p>
                    </div>
                  </div>

                  {customer.lastInvoiceDate && (
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                      آخر فاتورة: {dayjs(customer.lastInvoiceDate).format('DD/MM/YYYY')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (selectedType !== 'ALL' && selectedType !== 'CLIENT') ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">
              {officeCustomerSearch ? 'لا توجد نتائج للبحث' : 'لا يوجد عملاء مكتب حتى الآن'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              سيتم تسجيل العملاء تلقائياً عند إنشاء فواتير مكتب
            </p>
          </div>
        ) : null;
      })()}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingCustomer ? 'تعديل عميل' : 'عميل جديد'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الاسم *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الهاتف</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">العنوان</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                />
              </div>
              <div className="flex gap-3">
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


      {showSaleModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
            <h2 className="text-xl font-bold mb-4">فاتورة جديدة - {selectedCustomer.name}</h2>
            <form onSubmit={handleSaleSubmit} className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-bold mb-3">إضافة منتج</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">المنتج</label>
                    <select
                      value={saleItem.productId}
                      onChange={(e) => {
                        const product = products?.data?.find(p => p.id === e.target.value);
                        if (product) {
                          setSaleItem({
                            ...saleItem,
                            productId: product.id,
                            productName: product.name,
                            unitPrice: product.sellingPrice,
                            size: product.size || '',
                            color: product.color || '',
                          });
                        } else {
                          setSaleItem({ ...saleItem, productId: '', productName: '' });
                        }
                      }}
                      className="input-field text-sm"
                    >
                      <option value="">اختر منتج</option>
                      {products?.data?.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.size ? `- ${product.size}` : ''} {product.color ? `- ${product.color}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">اسم المنتج</label>
                    <input
                      type="text"
                      value={saleItem.productName}
                      onChange={(e) => setSaleItem({ ...saleItem, productName: e.target.value })}
                      className="input-field text-sm"
                      placeholder="أو اكتب اسم"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">اللون</label>
                    <input
                      type="text"
                      value={saleItem.color}
                      onChange={(e) => setSaleItem({ ...saleItem, color: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">الكمية</label>
                    <input
                      type="number"
                      value={saleItem.quantity}
                      onChange={(e) => setSaleItem({ ...saleItem, quantity: e.target.value })}
                      className="input-field text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">السعر</label>
                    <input
                      type="number"
                      value={saleItem.unitPrice}
                      onChange={(e) => setSaleItem({ ...saleItem, unitPrice: e.target.value })}
                      className="input-field text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addSaleItem}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus size={16} className="inline ml-1" />
                  إضافة للفاتورة
                </button>
              </div>

              {saleData.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-right text-sm">#</th>
                        <th className="p-2 text-right text-sm">المنتج</th>
                        <th className="p-2 text-right text-sm">اللون</th>
                        <th className="p-2 text-right text-sm">الكمية</th>
                        <th className="p-2 text-right text-sm">السعر</th>
                        <th className="p-2 text-right text-sm">الإجمالي</th>
                        <th className="p-2 text-sm"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleData.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2 text-sm">{index + 1}</td>
                          <td className="p-2 text-sm font-medium">{item.productName}</td>
                          <td className="p-2 text-sm">{item.color || '-'}</td>
                          <td className="p-2 text-sm">{item.quantity}</td>
                          <td className="p-2 text-sm">{item.unitPrice.toFixed(2)}</td>
                          <td className="p-2 text-sm font-bold">{item.total.toFixed(2)} ج.م</td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => removeSaleItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">الإجمالي:</span>
                  <span className="text-2xl font-bold text-blue-700">{saleTotal.toFixed(2)} ج.م</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">المبلغ المدفوع</label>
                    <input
                      type="number"
                      value={saleData.paidAmount}
                      onChange={(e) => setSaleData({ ...saleData, paidAmount: e.target.value })}
                      className="input-field"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">طريقة الدفع</label>
                    <select
                      value={saleData.paymentMethod}
                      onChange={(e) => setSaleData({ ...saleData, paymentMethod: e.target.value })}
                      className="input-field"
                    >
                      <option value="CASH">نقدي</option>
                      <option value="BANK_TRANSFER">تحويل بنكي</option>
                      <option value="CARD">بطاقة</option>
                      <option value="CREDIT">آجل</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">ملاحظات</label>
                  <textarea
                    value={saleData.notes}
                    onChange={(e) => setSaleData({ ...saleData, notes: e.target.value })}
                    className="input-field"
                    rows="2"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1" disabled={saleData.items.length === 0}>
                  <Receipt size={16} />
                  حفظ الفاتورة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaleModal(false);
                    setSelectedCustomer(null);
                    setSaleData({ items: [], paidAmount: 0, paymentMethod: 'CASH', notes: '' });
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

      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8">
            <h2 className="text-xl font-bold mb-4">تسجيل دفعة - {selectedCustomer.name}</h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className={`p-4 rounded-lg ${
                selectedCustomer.balance > 0 ? 'bg-red-50' : 
                selectedCustomer.balance < 0 ? 'bg-orange-50' : 
                'bg-gray-50'
              }`}>
                <p className="text-sm text-gray-600">
                  {selectedCustomer.balance > 0 ? 'المتبقي على العميل (لنا)' : 
                   selectedCustomer.balance < 0 ? 'علينا للعميل' : 
                   'لا يوجد رصيد'}
                </p>
                <p className={`text-2xl font-bold ${
                  selectedCustomer.balance > 0 ? 'text-red-700' : 
                  selectedCustomer.balance < 0 ? 'text-orange-700' : 
                  'text-gray-700'
                }`}>
                  {Math.abs(selectedCustomer.balance).toFixed(2)} ج.م
                </p>
              </div>

              {/* الفواتير المستحقة */}
              {paymentData.invoiceAllocations.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-3 font-bold">توزيع الدفعة على الفواتير</div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="p-2 text-right">نوع</th>
                          <th className="p-2 text-right">رقم الفاتورة</th>
                          <th className="p-2 text-right">الإجمالي</th>
                          <th className="p-2 text-right">المدفوع</th>
                          <th className="p-2 text-right">المتبقي</th>
                          <th className="p-2 text-right">المبلغ المدفوع الآن</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentData.invoiceAllocations.map((invoice, index) => (
                          <tr key={`${invoice.invoiceType}-${invoice.saleId || invoice.officeInvoiceId}`} className="border-t">
                            <td className="p-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                invoice.invoiceType === 'office' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {invoice.description}
                              </span>
                            </td>
                            <td className="p-2 font-medium">{invoice.invoiceNumber}</td>
                            <td className="p-2">{invoice.total.toFixed(2)} ج.م</td>
                            <td className="p-2">{invoice.amountPaid.toFixed(2)} ج.م</td>
                            <td className="p-2 text-red-700 font-bold">{invoice.remaining.toFixed(2)} ج.م</td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={invoice.allocation || ''}
                                onChange={(e) => updateInvoiceAllocation(index, e.target.value)}
                                className="input-field w-full"
                                min="0"
                                max={invoice.remaining}
                                step="0.01"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-blue-50 p-3 flex justify-between items-center border-t-2">
                    <span className="font-bold">إجمالي المبلغ المدفوع:</span>
                    <span className="text-xl font-bold text-blue-700">
                      {paymentData.invoiceAllocations.reduce((sum, inv) => sum + (inv.allocation || 0), 0).toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              )}

              {/* توزيع تلقائي */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium mb-2">توزيع تلقائي للمبلغ</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input-field flex-1"
                    placeholder="أدخل المبلغ"
                    min="0"
                    step="0.01"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      autoDistributePayment(input.value);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    توزيع تلقائي
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">سيتم توزيع المبلغ على الفواتير بالترتيب</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">طريقة الدفع</label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="input-field"
                  >
                    <option value="CASH">نقدي</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CARD">بطاقة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">رقم المرجع</label>
                  <input
                    type="text"
                    value={paymentData.referenceNumber}
                    onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                    className="input-field"
                    placeholder="اختياري"
                  />
                </div>
              </div>

              {/* اختيار الخزينة */}
              <div>
                <label className="block text-sm font-medium mb-2">الخزينة *</label>
                <select
                  value={paymentData.vaultId}
                  onChange={(e) => setPaymentData({ ...paymentData, vaultId: e.target.value })}
                  className="input-field bg-yellow-50 border-yellow-300"
                  required
                >
                  <option value="">-- اختر الخزينة --</option>
                  {vaults.map((vault) => {
                    const icon = vault.type === 'CASH' ? '💵' : vault.type === 'VISA' ? '💳' : '📱';
                    return (
                      <option key={vault.id} value={vault.id}>
                        {icon} {vault.name}
                      </option>
                    );
                  })}
                </select>
                {paymentData.vaultId && (
                  <p className="text-xs text-gray-600 mt-1">
                    الرصيد الحالي: {vaults.find(v => v.id === paymentData.vaultId)?.balance?.toFixed(2) || '0.00'} جنيه
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="input-field"
                  rows="2"
                />
              </div>
              
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  <DollarSign size={16} />
                  تسجيل الدفعة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedCustomer(null);
                    setPaymentData({ 
                      amount: 0, 
                      paymentMethod: 'CASH', 
                      referenceNumber: '', 
                      notes: '',
                      invoiceAllocations: [],
                    });
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

      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">تفاصيل العميل - {selectedCustomer.name}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.open(`/print/customer-statement/${selectedCustomer.id}`, '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Printer size={18} />
                  طباعة كشف الحساب
                </button>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-600 hover:text-gray-800">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">إجمالي المبيعات</p>
                <p className="text-xl font-bold text-blue-700">{selectedCustomer.totalSales.toFixed(2)} ج.م</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">المدفوع</p>
                <p className="text-xl font-bold text-green-700">{selectedCustomer.totalPaid.toFixed(2)} ج.م</p>
              </div>
              <div className={`p-4 rounded-lg ${
                selectedCustomer.balance > 0 ? 'bg-red-50' : 
                selectedCustomer.balance < 0 ? 'bg-orange-50' : 
                'bg-gray-50'
              }`}>
                <p className="text-xs text-gray-600 mb-1">
                  {selectedCustomer.balance > 0 ? 'المتبقي (لنا)' : 
                   selectedCustomer.balance < 0 ? 'علينا ليه' : 
                   'لا يوجد'}
                </p>
                <p className={`text-xl font-bold ${
                  selectedCustomer.balance > 0 ? 'text-red-700' : 
                  selectedCustomer.balance < 0 ? 'text-orange-700' : 
                  'text-gray-700'
                }`}>
                  {Math.abs(selectedCustomer.balance).toFixed(2)} ج.م
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">عدد الفواتير</p>
                <p className="text-xl font-bold text-gray-700">
                  {(selectedCustomer.sales?.length || 0) + (selectedCustomer.officeInvoices?.length || 0)}
                </p>
              </div>
            </div>

            {/* فواتير المكتب */}
            {selectedCustomer.officeInvoices && selectedCustomer.officeInvoices.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-purple-600" />
                  فواتير المكتب (الجملة)
                </h3>
                <div className="space-y-3">
                  {selectedCustomer.officeInvoices.map((invoice) => {
                    const remaining = invoice.total - invoice.paidAmount;
                    const invoiceTypeLabel = 
                      invoice.type === 'REGULAR' ? 'زبون عادي' :
                      invoice.type === 'SHIPMENT' ? 'شحن' :
                      invoice.type === 'CLIENT' ? 'عميل دائم' : invoice.type;
                    
                    return (
                      <div key={invoice.id} className="border rounded-lg overflow-hidden bg-purple-50">
                        <div className="bg-purple-100 p-3 flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-6 gap-3">
                            <div>
                              <p className="text-xs text-gray-600">رقم الفاتورة</p>
                              <p className="font-bold text-sm">{invoice.invoiceNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">النوع</p>
                              <p className="text-sm font-medium">{invoiceTypeLabel}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">التاريخ</p>
                              <p className="text-sm">{dayjs(invoice.createdAt).format('DD/MM/YYYY')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">الإجمالي</p>
                              <p className="text-sm font-bold">{invoice.total.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المدفوع</p>
                              <p className="text-sm text-green-700 font-bold">{invoice.paidAmount.toFixed(2)} ج.م</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">المتبقي</p>
                              <p className={`text-sm font-bold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {remaining.toFixed(2)} ج.م
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open(`/office-invoice-print/${invoice.id}`, '_blank')}
                              className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 flex items-center gap-1"
                            >
                              <Receipt size={14} />
                              طباعة
                            </button>
                            {remaining <= 0 && (
                              <button
                                onClick={() => {
                                  if (confirm(`حذف فاتورة المكتب ${invoice.invoiceNumber}؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
                                    deleteCompletedOfficeInvoiceMutation.mutate(invoice.id);
                                  }
                                }}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center gap-1"
                                title="حذف الفاتورة المكتملة"
                              >
                                <Trash2 size={14} />
                                حذف
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="font-bold mb-3">فواتير التقسيط</h3>
              <div className="space-y-3">
                {selectedCustomer.sales?.map((sale) => {
                  const remaining = sale.total - sale.amountPaid;
                  const isExpanded = expandedSaleId === sale.id;
                  
                  return (
                    <div key={sale.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                           onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                        <div className="flex-1 grid grid-cols-5 gap-3">
                          <div>
                            <p className="text-xs text-gray-600">رقم الفاتورة</p>
                            <p className="font-bold text-sm">{sale.invoiceNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">التاريخ</p>
                            <p className="text-sm">{dayjs(sale.createdAt).format('DD/MM/YYYY')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">الإجمالي</p>
                            <p className="text-sm font-bold">{sale.total.toFixed(2)} ج.م</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">المدفوع</p>
                            <p className="text-sm text-green-700 font-bold">{sale.amountPaid.toFixed(2)} ج.م</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">المتبقي</p>
                            <p className="text-sm text-red-700 font-bold">{remaining.toFixed(2)} ج.م</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openPrintModal(sale);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Receipt size={14} />
                            طباعة
                          </button>
                          {remaining <= 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`حذف فاتورة ${sale.invoiceNumber}؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
                                  deleteCompletedSaleMutation.mutate(sale.id);
                                }
                              }}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center gap-1"
                              title="حذف الفاتورة المكتملة"
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                          )}
                          <span className={`text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </div>
                      </div>
                      
                      {isExpanded && sale.items && sale.items.length > 0 && (
                        <div className="p-3 bg-white border-t">
                          <h4 className="font-bold text-sm mb-2">المنتجات:</h4>
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2 text-right">#</th>
                                <th className="p-2 text-right">المنتج</th>
                                <th className="p-2 text-right">المقاس</th>
                                <th className="p-2 text-right">اللون</th>
                                <th className="p-2 text-right">الكمية</th>
                                <th className="p-2 text-right">السعر</th>
                                <th className="p-2 text-right">الإجمالي</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.items.map((item, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="p-2">{idx + 1}</td>
                                  <td className="p-2 font-medium">{item.product?.name || 'غير محدد'}</td>
                                  <td className="p-2">{item.size || '-'}</td>
                                  <td className="p-2">{item.color || '-'}</td>
                                  <td className="p-2">{item.quantity}</td>
                                  <td className="p-2">{item.unitPrice.toFixed(2)} ج.م</td>
                                  <td className="p-2 font-bold">{item.total.toFixed(2)} ج.م</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3">الدفعات</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-right text-sm">التاريخ</th>
                      <th className="p-3 text-right text-sm">المبلغ</th>
                      <th className="p-3 text-right text-sm">طريقة الدفع</th>
                      <th className="p-3 text-right text-sm">رقم المرجع</th>
                      <th className="p-3 text-right text-sm">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.payments?.map((payment) => (
                      <tr key={payment.id} className="border-t">
                        <td className="p-3 text-sm">{dayjs(payment.paymentDate).format('DD/MM/YYYY - h:mm A')}</td>
                        <td className="p-3 text-sm font-bold text-green-700">{payment.amount.toFixed(2)} ج.م</td>
                        <td className="p-3 text-sm">
                          {payment.paymentMethod === 'CASH' ? 'نقدي' :
                           payment.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
                           payment.paymentMethod === 'CARD' ? 'بطاقة' : payment.paymentMethod}
                        </td>
                        <td className="p-3 text-sm">{payment.referenceNumber || '-'}</td>
                        <td className="p-3 text-sm">{payment.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStatementModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">كشف حساب - {selectedCustomer.name}</h2>
              <button onClick={() => setShowStatementModal(false)} className="text-gray-600 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المبيعات</p>
                  <p className="text-xl font-bold text-blue-700">{selectedCustomer.totalSales.toFixed(2)} ج.م</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">إجمالي المدفوع</p>
                  <p className="text-xl font-bold text-green-700">{selectedCustomer.totalPaid.toFixed(2)} ج.م</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {selectedCustomer.balance > 0 ? 'الرصيد المتبقي (لنا)' : 
                     selectedCustomer.balance < 0 ? 'علينا للعميل' : 
                     'لا يوجد رصيد'}
                  </p>
                  <p className={`text-xl font-bold ${
                    selectedCustomer.balance > 0 ? 'text-red-700' : 
                    selectedCustomer.balance < 0 ? 'text-orange-700' : 
                    'text-gray-700'
                  }`}>
                    {Math.abs(selectedCustomer.balance).toFixed(2)} ج.م
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {(() => {
                const transactions = [];
                
                // إضافة فواتير التقسيط
                selectedCustomer.sales?.forEach(sale => {
                  transactions.push({
                    type: 'sale',
                    date: sale.createdAt,
                    description: `فاتورة تقسيط ${sale.invoiceNumber}`,
                    amount: sale.total,
                    amountPaid: sale.amountPaid,
                    saleId: sale.id,
                    items: sale.items || [],
                    sale: sale
                  });
                });
                
                // إضافة فواتير المكتب
                selectedCustomer.officeInvoices?.forEach(invoice => {
                  const invoiceTypeLabel = 
                    invoice.type === 'REGULAR' ? 'زبون عادي' :
                    invoice.type === 'SHIPMENT' ? 'شحن' :
                    invoice.type === 'CLIENT' ? 'عميل دائم' : invoice.type;
                  
                  transactions.push({
                    type: 'office-invoice',
                    date: invoice.createdAt,
                    description: `فاتورة مكتب (${invoiceTypeLabel}) ${invoice.invoiceNumber}`,
                    amount: invoice.total,
                    amountPaid: invoice.paidAmount,
                    saleId: invoice.id,
                    items: invoice.items || [],
                    invoice: invoice
                  });
                });
                
                // إضافة الدفعات
                selectedCustomer.payments?.forEach(payment => {
                  transactions.push({
                    type: 'payment',
                    date: payment.paymentDate,
                    description: 'دفعة',
                    amount: payment.amount,
                    notes: payment.notes,
                    paymentMethod: payment.paymentMethod
                  });
                });
                
                transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                return transactions.map((item, index) => {
                  const isExpanded = expandedSaleId === item.saleId;
                  const bgColor = item.type === 'office-invoice' ? 'bg-purple-50 border-purple-500' :
                                  item.type === 'sale' ? 'bg-red-50 border-red-500' : 
                                  'bg-green-50 border-green-500';
                  const iconColor = item.type === 'office-invoice' ? 'text-purple-600' :
                                   item.type === 'sale' ? 'text-red-600' : 
                                   'text-green-600';
                  const textColor = item.type === 'office-invoice' ? 'text-purple-700' :
                                   item.type === 'sale' ? 'text-red-700' : 
                                   'text-green-700';
                  
                  return (
                    <div key={`${item.type}-${index}`} className={`rounded-lg border-r-4 overflow-hidden ${bgColor}`}>
                      <div className="p-4 flex justify-between items-start"
                           onClick={() => (item.type === 'sale' || item.type === 'office-invoice') && setExpandedSaleId(isExpanded ? null : item.saleId)}
                           style={{ cursor: (item.type === 'sale' || item.type === 'office-invoice') ? 'pointer' : 'default' }}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {item.type === 'payment' ? (
                              <DollarSign className={iconColor} size={18} />
                            ) : (
                              <Receipt className={iconColor} size={18} />
                            )}
                            <span className="font-bold">{item.description}</span>
                            {(item.type === 'sale' || item.type === 'office-invoice') && item.items && item.items.length > 0 && (
                              <span className={`text-gray-500 text-xs transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                ▼
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            {dayjs(item.date).format('DD/MM/YYYY - h:mm A')}
                          </p>
                          {(item.type === 'sale' || item.type === 'office-invoice') && (
                            <div className="mt-2 text-xs">
                              <span className="text-green-700 font-bold">مدفوع: {item.amountPaid.toFixed(2)} ج.م</span>
                              <span className="mx-2">•</span>
                              <span className="text-red-700 font-bold">متبقي: {(item.amount - item.amountPaid).toFixed(2)} ج.م</span>
                            </div>
                          )}
                          {item.notes && <p className="text-xs text-gray-600 mt-1">ملاحظات: {item.notes}</p>}
                          {item.paymentMethod && (
                            <p className="text-xs text-gray-600 mt-1">
                              الطريقة: {
                                item.paymentMethod === 'CASH' ? 'نقدي' :
                                item.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
                                item.paymentMethod === 'CARD' ? 'بطاقة' : item.paymentMethod
                              }
                            </p>
                          )}
                        </div>
                        <div className="text-left">
                          <p className={`text-2xl font-bold ${textColor}`}>
                            {item.amount.toFixed(2)} ج.م
                          </p>
                          {item.type === 'payment' ? (
                            <p className="text-xs text-green-600">تم التحصيل ✓</p>
                          ) : (
                            <p className={`text-xs ${item.type === 'office-invoice' ? 'text-purple-600' : 'text-red-600'}`}>تم التحميل ✓</p>
                          )}
                          {item.type === 'sale' && item.sale && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPrintModal(item.sale);
                              }}
                              className="text-xs text-blue-600 hover:underline mt-1 block"
                            >
                              طباعة الفاتورة
                            </button>
                          )}
                          {item.type === 'office-invoice' && item.invoice && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/office-invoice-print/${item.invoice.id}`, '_blank');
                              }}
                              className="text-xs text-purple-600 hover:underline mt-1 block"
                            >
                              طباعة الفاتورة
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {(item.type === 'sale' || item.type === 'office-invoice') && isExpanded && item.items && item.items.length > 0 && (
                        <div className={`px-4 pb-4 bg-white border-t ${item.type === 'office-invoice' ? 'border-purple-200' : 'border-red-200'}`}>
                          <h4 className="font-bold text-sm mb-2 mt-2">المنتجات:</h4>
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2 text-right">#</th>
                                <th className="p-2 text-right">المنتج</th>
                                <th className="p-2 text-right">اللون</th>
                                <th className="p-2 text-right">الكمية</th>
                                <th className="p-2 text-right">السعر</th>
                                <th className="p-2 text-right">الإجمالي</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.items.map((saleItem, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="p-2">{idx + 1}</td>
                                  <td className="p-2 font-medium">{saleItem.product?.name || saleItem.productName || 'غير محدد'}</td>
                                  <td className="p-2">{saleItem.color || '-'}</td>
                                  <td className="p-2">{saleItem.quantity}</td>
                                  <td className="p-2">{saleItem.unitPrice.toFixed(2)} ج.م</td>
                                  <td className="p-2 font-bold">{saleItem.total.toFixed(2)} ج.م</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <button
                onClick={() => window.print()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                🖨️ طباعة كشف الحساب
              </button>
              <button
                onClick={() => setShowStatementModal(false)}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
