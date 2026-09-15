import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import dayjs from 'dayjs';

export default function CustomerInvoicePrint() {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        console.log('📋 Fetching invoice with ID:', invoiceId);
        const response = await api.get(`/customers/invoices/${invoiceId}`);
        console.log('✅ Invoice response:', response.data);
        setInvoice(response.data.data);
        setLoading(false);
        // Auto print after load
        setTimeout(() => window.print(), 500);
      } catch (error) {
        console.error('❌ Error loading invoice:', error);
        console.error('Error details:', error.response?.data);
        alert(`خطأ في تحميل الفاتورة: ${error.response?.data?.error || error.message}`);
        setLoading(false);
      }
    };
    
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>جاري تحميل الفاتورة...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl mb-4">❌ لم يتم العثور على الفاتورة</p>
          <p className="text-gray-600">Invoice ID: {invoiceId}</p>
          <p className="text-sm text-gray-500 mt-2">يرجى التحقق من الرابط أو المحاولة مرة أخرى</p>
        </div>
      </div>
    );
  }

  const totalItems = invoice.items.reduce((sum, item) => sum + item.quantity, 0);
  const remainingBalance = invoice.total - invoice.amountPaid;

  return (
    <div className="print-invoice" dir="rtl">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print-invoice {
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        .print-invoice {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 21cm;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header .logo {
          width: 120px;
          height: 120px;
          margin: 0 auto 15px;
          background: #f3f4f6;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-center;
          font-size: 48px;
        }
        
        .header h1 {
          font-size: 32px;
          font-weight: bold;
          color: #1e40af;
          margin: 10px 0;
        }
        
        .header p {
          color: #6b7280;
          font-size: 14px;
        }
        
        .invoice-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .info-box {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .info-box h3 {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-box p {
          margin: 8px 0;
          color: #111827;
          font-size: 15px;
        }
        
        .info-box strong {
          font-weight: 600;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }
        
        .items-table thead {
          background: #2563eb;
          color: white;
        }
        
        .items-table th {
          padding: 12px;
          text-align: right;
          font-size: 14px;
          font-weight: 600;
        }
        
        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        
        .items-table tbody tr:hover {
          background: #f9fafb;
        }
        
        .totals {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 15px;
        }
        
        .total-row.grand-total {
          font-size: 20px;
          font-weight: bold;
          color: #1e40af;
          border-top: 2px solid #2563eb;
          padding-top: 15px;
          margin-top: 15px;
        }
        
        .total-row.paid {
          color: #059669;
          font-weight: 600;
        }
        
        .total-row.remaining {
          color: #dc2626;
          font-weight: 700;
          font-size: 18px;
          background: #fef2f2;
          padding: 12px;
          border-radius: 8px;
          margin-top: 10px;
        }
        
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin-top: 10px;
        }
        
        .status-paid {
          background: #d1fae5;
          color: #065f46;
        }
        
        .status-partial {
          background: #fef3c7;
          color: #92400e;
        }
        
        .status-unpaid {
          background: #fee2e2;
          color: #991b1b;
        }
      `}</style>

      {/* Header with Logo */}
      <div className="header">
        <div className="logo">
          <img src="/bee.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
        </div>
        <h1>مصنع بيسو للملابس الجاهزة</h1>
        <p>تصنيع وتوريد جميع أنواع الملابس الجاهزة</p>
        <p>📞 01XXXXXXXXX | 📧 info@biso.com | 📍 القاهرة، مصر</p>
      </div>

      {/* Invoice Info */}
      <div className="invoice-info">
        <div className="info-box">
          <h3>بيانات الفاتورة</h3>
          <p><strong>رقم الفاتورة:</strong> {invoice.invoiceNumber}</p>
          <p><strong>التاريخ:</strong> {dayjs(invoice.createdAt).format('DD/MM/YYYY - h:mm A')}</p>
          <p><strong>طريقة الدفع:</strong> {
            invoice.paymentMethod === 'CASH' ? 'نقدي' :
            invoice.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
            invoice.paymentMethod === 'CARD' ? 'بطاقة' : 'آجل'
          }</p>
          <div style={{ marginTop: '10px' }}>
            <span className={`status-badge ${
              invoice.total === invoice.amountPaid ? 'status-paid' :
              invoice.amountPaid > 0 ? 'status-partial' : 'status-unpaid'
            }`}>
              {invoice.total === invoice.amountPaid ? '✓ مدفوع بالكامل' :
               invoice.amountPaid > 0 ? '⚠ مدفوع جزئياً' : '✗ آجل'}
            </span>
          </div>
        </div>

        <div className="info-box">
          <h3>بيانات العميل</h3>
          <p><strong>الاسم:</strong> {invoice.customer?.name || invoice.customerName}</p>
          <p><strong>الهاتف:</strong> {invoice.customer?.phone || invoice.customerPhone || 'غير محدد'}</p>
          <p><strong>العنوان:</strong> {invoice.customer?.address || 'غير محدد'}</p>
          {invoice.customer?.balance !== undefined && (
            <p style={{ marginTop: '10px', color: '#dc2626', fontWeight: 'bold' }}>
              الرصيد الحالي: {invoice.customer.balance.toFixed(2)} ج.م
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="items-table">
        <thead>
          <tr>
            <th style={{ width: '50px' }}>#</th>
            <th>المنتج</th>
            <th>اللون</th>
            <th style={{ width: '80px' }}>الكمية</th>
            <th style={{ width: '100px' }}>السعر</th>
            <th style={{ width: '120px' }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index}>
              <td style={{ textAlign: 'center' }}>{index + 1}</td>
              <td><strong>{item.product?.name || item.description}</strong></td>
              <td>{item.color || '-'}</td>
              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ textAlign: 'left' }}>{item.unitPrice.toFixed(2)} ج.م</td>
              <td style={{ textAlign: 'left' }}><strong>{(item.quantity * item.unitPrice).toFixed(2)} ج.م</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="totals">
        <div className="total-row">
          <span>إجمالي الكمية:</span>
          <span><strong>{totalItems} قطعة</strong></span>
        </div>
        
        <div className="total-row">
          <span>المجموع الفرعي:</span>
          <span>{invoice.subtotal.toFixed(2)} ج.م</span>
        </div>
        
        {invoice.taxAmount > 0 && (
          <div className="total-row">
            <span>الضريبة:</span>
            <span>{invoice.taxAmount.toFixed(2)} ج.م</span>
          </div>
        )}
        
        {invoice.discountAmount > 0 && (
          <div className="total-row" style={{ color: '#dc2626' }}>
            <span>الخصم:</span>
            <span>- {invoice.discountAmount.toFixed(2)} ج.م</span>
          </div>
        )}
        
        <div className="total-row grand-total">
          <span>الإجمالي الكلي:</span>
          <span>{invoice.total.toFixed(2)} ج.م</span>
        </div>
        
        <div className="total-row paid">
          <span>المبلغ المدفوع:</span>
          <span>{invoice.amountPaid.toFixed(2)} ج.م</span>
        </div>
        
        {remainingBalance > 0 && (
          <div className="total-row remaining">
            <span>المبلغ المتبقي:</span>
            <span>{remainingBalance.toFixed(2)} ج.م</span>
          </div>
        )}
      </div>

      {invoice.notes && (
        <div style={{ marginTop: '30px', padding: '15px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <strong style={{ color: '#6b7280' }}>ملاحظات:</strong>
          <p style={{ margin: '5px 0 0', color: '#111827' }}>{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="footer">
        <p><strong>شكراً لتعاملكم معنا</strong></p>
        <p style={{ marginTop: '10px' }}>هذه الفاتورة صادرة إلكترونياً ولا تحتاج إلى توقيع</p>
        <p style={{ marginTop: '5px', fontSize: '12px', color: '#9ca3af' }}>
          طُبعت في: {dayjs().format('DD/MM/YYYY - h:mm A')}
        </p>
      </div>

      {/* Print Button - Hidden on print */}
      <div className="no-print" style={{ textAlign: 'center', marginTop: '30px' }}>
        <button 
          onClick={() => window.print()}
          style={{
            padding: '12px 32px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          🖨️ طباعة الفاتورة
        </button>
        <button 
          onClick={() => window.close()}
          style={{
            padding: '12px 32px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
