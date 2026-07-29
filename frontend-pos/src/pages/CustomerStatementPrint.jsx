import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export default function CustomerStatementPrint() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [officeInvoices, setOfficeInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerStatement();
  }, [customerId]);

  const fetchCustomerStatement = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/customers/${customerId}`);
      
      if (response.data.success) {
        const data = response.data.data;
        setCustomer(data);
        setSales(data.sales || []);
        setOfficeInvoices(data.officeInvoices || []);
        setPayments(data.payments || []);
        
        // طباعة تلقائية بعد التحميل
        setTimeout(() => window.print(), 500);
      }
    } catch (error) {
      console.error('Error fetching customer statement:', error);
      alert('حدث خطأ في تحميل كشف الحساب');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">لم يتم العثور على العميل</div>
      </div>
    );
  }

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);
  const totalPaidOnOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const grandTotal = totalSales + totalOfficeInvoices;
  const totalPaid = totalPaidOnSales + totalPaidOnOfficeInvoices + totalPayments;
  const remainingBalance = grandTotal - totalPaid;

  return (
    <div className="p-8 max-w-[210mm] mx-auto bg-white" dir="rtl">
      <style>
        {`
          @media print {
            body { margin: 0; }
            @page { size: A4; margin: 10mm; }
            .no-print { display: none; }
          }
        `}
      </style>

      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-bold mb-2">كشف حساب عميل</h1>
        <div className="flex justify-between text-sm">
          <div>
            <strong>التاريخ:</strong> {new Date().toLocaleDateString('ar-EG')}
          </div>
          <div>
            <strong>رقم العميل:</strong> {customer.code || customer.id}
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h2 className="text-xl font-bold mb-2">بيانات العميل</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><strong>الاسم:</strong> {customer.name}</div>
          <div><strong>الهاتف:</strong> {customer.phone || 'غير متوفر'}</div>
          <div className="col-span-2"><strong>العنوان:</strong> {customer.address || 'غير متوفر'}</div>
        </div>
      </div>

      {/* Sales Summary */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3 border-b border-gray-400 pb-2">ملخص الحساب</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="font-bold">إجمالي الفواتير:</div>
          <div className="text-left">{grandTotal.toFixed(2)} جنيه</div>
          
          <div className="font-bold">إجمالي المدفوع:</div>
          <div className="text-left text-green-600">{totalPaid.toFixed(2)} جنيه</div>
          
          <div className="font-bold text-lg pt-2 border-t-2 border-gray-800">الرصيد المستحق:</div>
          <div className="text-left text-lg font-bold text-red-600 pt-2 border-t-2 border-gray-800">
            {remainingBalance.toFixed(2)} جنيه
          </div>
        </div>
      </div>

      {/* Office Invoices */}
      {officeInvoices.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 border-b border-gray-400 pb-2">
            فواتير المكتب ({officeInvoices.length})
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 p-2">رقم الفاتورة</th>
                <th className="border border-gray-400 p-2">التاريخ</th>
                <th className="border border-gray-400 p-2">الأصناف</th>
                <th className="border border-gray-400 p-2">الإجمالي</th>
                <th className="border border-gray-400 p-2">المدفوع</th>
                <th className="border border-gray-400 p-2">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {officeInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="border border-gray-400 p-2">{invoice.invoiceNumber}</td>
                  <td className="border border-gray-400 p-2">
                    {new Date(invoice.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {invoice.items?.map(item => (
                      <div key={item.id}>
                        {item.product.name} × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="border border-gray-400 p-2 text-left">
                    {invoice.total.toFixed(2)}
                  </td>
                  <td className="border border-gray-400 p-2 text-left text-green-600">
                    {invoice.paidAmount.toFixed(2)}
                  </td>
                  <td className="border border-gray-400 p-2 text-left text-red-600">
                    {invoice.remainingAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td colSpan="3" className="border border-gray-400 p-2">الإجمالي</td>
                <td className="border border-gray-400 p-2 text-left">
                  {totalOfficeInvoices.toFixed(2)}
                </td>
                <td className="border border-gray-400 p-2 text-left text-green-600">
                  {totalPaidOnOfficeInvoices.toFixed(2)}
                </td>
                <td className="border border-gray-400 p-2 text-left text-red-600">
                  {(totalOfficeInvoices - totalPaidOnOfficeInvoices).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Branch Sales */}
      {sales.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 border-b border-gray-400 pb-2">
            فواتير الفروع ({sales.length})
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 p-2">رقم الفاتورة</th>
                <th className="border border-gray-400 p-2">التاريخ</th>
                <th className="border border-gray-400 p-2">الأصناف</th>
                <th className="border border-gray-400 p-2">الإجمالي</th>
                <th className="border border-gray-400 p-2">المدفوع</th>
                <th className="border border-gray-400 p-2">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="border border-gray-400 p-2">{sale.invoiceNumber}</td>
                  <td className="border border-gray-400 p-2">
                    {new Date(sale.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {sale.items?.map(item => (
                      <div key={item.id}>
                        {item.product.name} × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="border border-gray-400 p-2 text-left">
                    {sale.total.toFixed(2)}
                  </td>
                  <td className="border border-gray-400 p-2 text-left text-green-600">
                    {sale.amountPaid.toFixed(2)}
                  </td>
                  <td className="border border-gray-400 p-2 text-left text-red-600">
                    {(sale.total - sale.amountPaid).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td colSpan="3" className="border border-gray-400 p-2">الإجمالي</td>
                <td className="border border-gray-400 p-2 text-left">
                  {totalSales.toFixed(2)}
                </td>
                <td className="border border-gray-400 p-2 text-left text-green-600">
                  {totalPaidOnSales.toFixed(2)}
                </td>
                <td className="border border-gray-400 p-2 text-left text-red-600">
                  {(totalSales - totalPaidOnSales).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 border-b border-gray-400 pb-2">
            الدفعات ({payments.length})
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 p-2">التاريخ</th>
                <th className="border border-gray-400 p-2">المبلغ</th>
                <th className="border border-gray-400 p-2">طريقة الدفع</th>
                <th className="border border-gray-400 p-2">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="border border-gray-400 p-2">
                    {new Date(payment.paymentDate).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="border border-gray-400 p-2 text-left font-bold text-green-600">
                    {payment.amount.toFixed(2)} جنيه
                  </td>
                  <td className="border border-gray-400 p-2">
                    {payment.paymentMethod === 'CASH' ? 'نقدي' : payment.paymentMethod === 'CARD' ? 'فيزا' : 'آجل'}
                  </td>
                  <td className="border border-gray-400 p-2">{payment.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-400 p-2">الإجمالي</td>
                <td className="border border-gray-400 p-2 text-left text-green-600">
                  {totalPayments.toFixed(2)} جنيه
                </td>
                <td colSpan="2" className="border border-gray-400 p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-gray-800 text-center text-sm text-gray-600">
        <p>تم الطباعة بتاريخ: {new Date().toLocaleString('ar-EG')}</p>
        <p className="mt-2">نظام إدارة نقاط البيع - Bee Jeans</p>
      </div>
    </div>
  );
}
