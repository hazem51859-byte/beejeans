import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export default function OfficeInvoicePrint() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/office-invoices/${id}`);
        setInvoice(response.data);
        setLoading(false);
        // Auto print after content loads
        setTimeout(() => {
          window.print();
        }, 1000);
      } catch (error) {
        console.error('Error loading invoice:', error);
        alert('خطأ في تحميل الفاتورة');
        setLoading(false);
      }
    };
    
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">جاري تحميل الفاتورة...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">لم يتم العثور على الفاتورة</p>
      </div>
    );
  }

  const invoiceTypeLabels = {
    REGULAR: 'زبون عادي',
    SHIPMENT: 'شحن',
    CLIENT: 'عميل'
  };

  const paymentMethodLabels = {
    CASH: 'نقدي',
    CARD: 'بطاقة',
    CREDIT: 'آجل'
  };

  const pageStyle = {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: 'white',
    color: '#000'
  };

  const headerStyle = {
    textAlign: 'center',
    borderBottom: '3px solid #000',
    paddingBottom: '15px',
    marginBottom: '20px'
  };

  const h1Style = {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '10px 0',
    color: '#000'
  };

  const pStyle = {
    fontSize: '16px',
    margin: '5px 0',
    color: '#000'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '20px'
  };

  const tdStyle = {
    padding: '8px',
    fontSize: '15px',
    color: '#000'
  };

  const itemsTableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '20px 0',
    border: '2px solid #000'
  };

  const thStyle = {
    padding: '12px',
    textAlign: 'right',
    fontSize: '14px',
    fontWeight: '600',
    border: '1px solid #000',
    backgroundColor: '#fff',
    color: '#000'
  };

  const itemTdStyle = {
    padding: '10px',
    border: '1px solid #000',
    fontSize: '14px',
    color: '#000'
  };

  const totalsStyle = {
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '2px solid #000'
  };

  const totalRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '16px',
    color: '#000'
  };

  const grandTotalStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px 0 8px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    borderTop: '2px solid #000',
    marginTop: '15px',
    color: '#000'
  };

  const paymentBoxStyle = {
    border: '2px solid #000',
    padding: '15px',
    margin: '15px 0'
  };

  const notesBoxStyle = {
    border: '2px solid #000',
    padding: '15px',
    margin: '15px 0'
  };

  const footerStyle = {
    marginTop: '30px',
    paddingTop: '15px',
    borderTop: '2px solid #000',
    textAlign: 'center',
    fontSize: '13px',
    color: '#000'
  };

  const buttonContainerStyle = {
    textAlign: 'center',
    marginTop: '30px',
    marginBottom: '20px'
  };

  const printButtonStyle = {
    padding: '12px 32px',
    background: '#000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: '10px'
  };

  const closeButtonStyle = {
    padding: '12px 32px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  };

  return (
    <div dir="rtl" className="office-invoice-print">
      <div style={pageStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={h1Style}>Biso & Gilan & Layan</h1>
          <p style={pStyle}>فاتورة مكتب - المخزن الرئيسي</p>
        </div>

        {/* Invoice Info */}
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={{...tdStyle, width: '50%'}}>
                <strong>رقم الفاتورة:</strong> {invoice.invoiceNumber}
              </td>
              <td style={{...tdStyle, textAlign: 'left'}}>
                <strong>اسم الزبون:</strong> {invoice.customerName}
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>
                <strong>نوع الفاتورة:</strong> {invoiceTypeLabels[invoice.type]}
              </td>
              <td style={{...tdStyle, textAlign: 'left'}}>
                <strong>رقم الهاتف:</strong> {invoice.customerPhone}
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>
                <strong>التاريخ:</strong> {new Date(invoice.createdAt).toLocaleDateString('ar-EG')}
              </td>
              <td style={{...tdStyle, textAlign: 'left'}}>
                {invoice.type === 'SHIPMENT' && invoice.shipmentCompany && (
                  <>
                    <strong>شركة الشحن:</strong> {invoice.shipmentCompany}
                  </>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table style={itemsTableStyle}>
          <thead>
            <tr style={{borderBottom: '2px solid #000'}}>
              <th style={thStyle}>المنتج</th>
              <th style={{...thStyle, width: '80px', textAlign: 'center'}}>الكمية</th>
              <th style={{...thStyle, width: '80px', textAlign: 'center'}}>المقاس</th>
              <th style={{...thStyle, width: '120px'}}>السعر</th>
              <th style={{...thStyle, width: '120px'}}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={index}>
                <td style={itemTdStyle}>{item.product?.name || 'غير محدد'}</td>
                <td style={{...itemTdStyle, textAlign: 'center'}}>{item.quantity}</td>
                <td style={{...itemTdStyle, textAlign: 'center'}}>{item.size || '-'}</td>
                <td style={{...itemTdStyle, textAlign: 'right'}}>{item.unitSalePrice.toFixed(2)} ج</td>
                <td style={{...itemTdStyle, textAlign: 'right', fontWeight: 'bold'}}>
                  {(item.quantity * item.unitSalePrice).toFixed(2)} ج
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={totalsStyle}>
          <div style={totalRowStyle}>
            <span><strong>المجموع الفرعي:</strong></span>
            <span>{invoice.subtotal.toFixed(2)} ج</span>
          </div>
          
          <div style={totalRowStyle}>
            <span><strong>الخصم:</strong></span>
            <span>-{invoice.discountAmount.toFixed(2)} ج</span>
          </div>
          
          <div style={grandTotalStyle}>
            <span>الإجمالي:</span>
            <span>{invoice.total.toFixed(2)} ج</span>
          </div>
        </div>

        {/* Payment Info */}
        <div style={paymentBoxStyle}>
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td style={{padding: '6px 0', fontSize: '16px', color: '#000'}}>
                  <strong>طريقة الدفع:</strong>
                </td>
                <td style={{padding: '6px 0', fontSize: '16px', color: '#000', textAlign: 'left'}}>
                  {paymentMethodLabels[invoice.paymentMethod]}
                </td>
              </tr>
              <tr>
                <td style={{padding: '6px 0', fontSize: '16px', color: '#000'}}>
                  <strong>المدفوع:</strong>
                </td>
                <td style={{padding: '6px 0', fontSize: '16px', color: '#000', textAlign: 'left', fontWeight: 'bold'}}>
                  {invoice.paidAmount.toFixed(2)} ج
                </td>
              </tr>
              <tr>
                <td style={{padding: '6px 0', fontSize: '16px', color: '#000'}}>
                  <strong>الباقي:</strong>
                </td>
                <td style={{padding: '6px 0', fontSize: '16px', color: '#000', textAlign: 'left', fontWeight: 'bold'}}>
                  {invoice.remainingAmount.toFixed(2)} ج
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={notesBoxStyle}>
            <p style={{margin: '0', fontWeight: 'bold', color: '#000'}}>ملاحظات:</p>
            <p style={{margin: '10px 0 0 0', color: '#000'}}>{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={footerStyle}>
          <p style={{margin: '0', fontWeight: 'bold'}}>شكراً لتعاملكم معنا</p>
          <p style={{margin: '10px 0 0 0'}}>هذه الفاتورة صادرة إلكترونياً ولا تحتاج إلى توقيع</p>
        </div>
      </div>
    </div>
  );
}
