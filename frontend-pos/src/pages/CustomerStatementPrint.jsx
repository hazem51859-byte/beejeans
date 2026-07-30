import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import dayjs from 'dayjs';
import html2pdf from 'html2pdf.js';

export default function CustomerStatementPrint() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef(null);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    const opt = {
      margin: 10,
      filename: `كشف-حساب-${customer.name}-${dayjs().format('YYYY-MM-DD')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
      await html2pdf().set(opt).from(contentRef.current).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء PDF');
    }
  };

  useEffect(() => {
    const fetchCustomerStatement = async () => {
      try {
        const response = await api.get(`/customers/${customerId}`);
        
        if (response.data.success) {
          setCustomer(response.data.data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading customer:', error);
        alert('خطأ في تحميل كشف الحساب');
        setLoading(false);
      }
    };
    
    if (customerId) {
      fetchCustomerStatement();
    }
  }, [customerId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>لم يتم العثور على العميل</p>
      </div>
    );
  }

  const sales = customer.sales || [];
  const officeInvoices = customer.officeInvoices || [];
  const payments = customer.payments || [];

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);
  const totalPaidOnOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const grandTotal = totalSales + totalOfficeInvoices;
  const totalPaid = totalPaidOnSales + totalPaidOnOfficeInvoices + totalPayments;
  const remainingBalance = grandTotal - totalPaid;

  return (
    <>
      {/* Buttons - Not included in PDF */}
      <div className="button-container">
        <button onClick={handleDownloadPDF} className="btn-download">
          📥 تحميل PDF
        </button>
        <button onClick={() => window.close()} className="btn-close">
          إغلاق
        </button>
      </div>

      {/* PDF Content */}
      <div className="print-content" dir="rtl" ref={contentRef}>
        <style>{`
          .button-container {
            text-align: center;
            padding: 15px;
            background: #f5f5f5;
            border-bottom: 1px solid #ccc;
            position: sticky;
            top: 0;
            z-index: 1000;
          }
          
          .btn-download, .btn-close {
            padding: 10px 24px;
            margin: 0 5px;
            border: 1px solid #000;
            border-radius: 4px;
            fontSize: 14px;
            fontWeight: 600;
            cursor: pointer;
          }
          
          .btn-download {
            background: #000;
            color: #fff;
          }
          
          .btn-close {
            background: #fff;
            color: #000;
          }
          
          .print-content {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
            color: #000;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          
          .header h1 {
            font-size: 24px;
            margin: 5px 0;
            color: #000;
          }
          
          .header p {
            font-size: 14px;
            margin: 3px 0;
            color: #000;
          }
          
          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .info-box {
            border: 1px solid #000;
            padding: 10px;
          }
          
          .info-box h3 {
            font-size: 15px;
            margin: 0 0 10px 0;
            color: #000;
            font-weight: bold;
          }
          
          .info-box p {
            font-size: 14px;
            margin: 5px 0;
            color: #000;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #000;
            color: #000;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 10px 8px;
            text-align: center;
            font-size: 14px;
            color: #000;
          }
          
          thead {
            background: #000;
            color: #fff !important;
            font-weight: bold;
          }
          
          thead th {
            font-size: 14px;
            color: #fff !important;
            font-weight: bold;
          }
          
          tfoot {
            background: #f0f0f0;
            font-weight: bold;
          }
          
          .totals {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px solid #000;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 15px;
          }
          
          .total-row.main {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 12px;
            margin-top: 12px;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #000;
            text-align: center;
            font-size: 10px;
            color: #000;
          }
        `}</style>

        {/* Header */}
        <div className="header">
          <h1>كشف حساب عميل</h1>
          <p>التاريخ: {dayjs().format('DD/MM/YYYY')}</p>
        </div>

        {/* Customer & Summary Info */}
        <div className="info-section">
          <div className="info-box">
            <h3>بيانات العميل</h3>
            <p><strong>الاسم:</strong> {customer.name}</p>
            <p><strong>الهاتف:</strong> {customer.phone || '-'}</p>
            <p><strong>العنوان:</strong> {customer.address || '-'}</p>
          </div>

          <div className="info-box">
            <h3>ملخص الحساب</h3>
            <p><strong>إجمالي الفواتير:</strong> {grandTotal.toFixed(2)} ج.م</p>
            <p><strong>إجمالي المدفوع:</strong> {totalPaid.toFixed(2)} ج.م</p>
            <p><strong>الرصيد المستحق:</strong> {remainingBalance.toFixed(2)} ج.م</p>
          </div>
        </div>

        {/* Office Invoices */}
        {officeInvoices.length > 0 && (
          <>
            <div className="section-title">فواتير المكتب ({officeInvoices.length})</div>
            <table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {officeInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{dayjs(inv.createdAt).format('DD/MM/YYYY')}</td>
                    <td>{inv.total.toFixed(2)}</td>
                    <td>{inv.paidAmount.toFixed(2)}</td>
                    <td>{inv.remainingAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2">الإجمالي</td>
                  <td>{totalOfficeInvoices.toFixed(2)}</td>
                  <td>{totalPaidOnOfficeInvoices.toFixed(2)}</td>
                  <td>{(totalOfficeInvoices - totalPaidOnOfficeInvoices).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* Branch Sales */}
        {sales.length > 0 && (
          <>
            <div className="section-title">فواتير الفروع ({sales.length})</div>
            <table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.invoiceNumber}</td>
                    <td>{dayjs(sale.createdAt).format('DD/MM/YYYY')}</td>
                    <td>{sale.total.toFixed(2)}</td>
                    <td>{sale.amountPaid.toFixed(2)}</td>
                    <td>{(sale.total - sale.amountPaid).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2">الإجمالي</td>
                  <td>{totalSales.toFixed(2)}</td>
                  <td>{totalPaidOnSales.toFixed(2)}</td>
                  <td>{(totalSales - totalPaidOnSales).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* Payments */}
        {payments.length > 0 && (
          <>
            <div className="section-title">الدفعات ({payments.length})</div>
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المبلغ</th>
                  <th>طريقة الدفع</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{dayjs(payment.paymentDate).format('DD/MM/YYYY')}</td>
                    <td>{payment.amount.toFixed(2)}</td>
                    <td>
                      {payment.paymentMethod === 'CASH' ? 'نقدي' : 
                       payment.paymentMethod === 'CARD' ? 'فيزا' : 'آجل'}
                    </td>
                    <td>{payment.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>الإجمالي</td>
                  <td>{totalPayments.toFixed(2)}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* Final Totals */}
        <div className="totals">
          <div className="total-row">
            <span>إجمالي الفواتير:</span>
            <span>{grandTotal.toFixed(2)} ج.م</span>
          </div>
          <div className="total-row">
            <span>إجمالي المدفوع:</span>
            <span>{totalPaid.toFixed(2)} ج.م</span>
          </div>
          <div className="total-row main">
            <span>الرصيد المستحق:</span>
            <span>{remainingBalance.toFixed(2)} ج.م</span>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <p>شكراً لتعاملكم معنا</p>
          <p>طُبع في: {dayjs().format('DD/MM/YYYY - HH:mm')}</p>
          <p>نظام إدارة نقاط البيع - Bee Jeans</p>
        </div>
      </div>
    </>
  );
}
