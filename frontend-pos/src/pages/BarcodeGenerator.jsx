import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, Barcode } from 'lucide-react';
import * as XLSX from 'xlsx';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

export default function BarcodeGenerator() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');

  // تحميل Template Excel
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Serial', 'Product Name'],
      ['123456', 'بنطلون جينز أزرق'],
      ['789012', 'تيشيرت أبيض'],
      ['345678', 'جاكيت جلد أسود']
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Serials');
    XLSX.writeFile(wb, 'barcode_template.xlsx');
  };

  // قراءة ملف Excel
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError('');
    setData([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // التحقق من البيانات
        if (jsonData.length === 0) {
          setError('الملف فارغ! الرجاء إضافة بيانات');
          return;
        }

        // التحقق من الأعمدة المطلوبة
        const firstRow = jsonData[0];
        if (!firstRow.Serial && !firstRow.serial) {
          setError('العمود "Serial" مفقود في الملف');
          return;
        }
        if (!firstRow['Product Name'] && !firstRow['product name'] && !firstRow.ProductName) {
          setError('العمود "Product Name" مفقود في الملف');
          return;
        }

        // تنسيق البيانات
        const formattedData = jsonData.map((row, index) => ({
          serial: row.Serial || row.serial || '',
          productName: row['Product Name'] || row['product name'] || row.ProductName || '',
          index: index + 1
        })).filter(item => item.serial && item.productName);

        if (formattedData.length === 0) {
          setError('لا توجد بيانات صحيحة في الملف');
          return;
        }

        setData(formattedData);
      } catch (err) {
        setError('خطأ في قراءة الملف: ' + err.message);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  // توليد الباركود وإنشاء PDF
  const generatePDF = async () => {
    if (data.length === 0) {
      setError('الرجاء رفع ملف Excel أولاً');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210; // A4 width
      const pageHeight = 297; // A4 height
      const barcodeWidth = 80;
      const barcodeHeight = 25;
      const itemHeight = 45; // Height for each barcode item
      const margin = 15;
      const columns = 2;
      const itemsPerPage = 12; // 2 columns x 6 rows

      let currentPage = 0;
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const itemIndex = i % itemsPerPage;
        
        // إضافة صفحة جديدة إذا لزم الأمر
        if (itemIndex === 0 && i > 0) {
          pdf.addPage();
          currentPage++;
        }

        // حساب موضع الباركود
        const col = itemIndex % columns;
        const row = Math.floor(itemIndex / columns);
        const x = margin + (col * (barcodeWidth + 10));
        const y = margin + (row * itemHeight);

        // إنشاء canvas للباركود
        const canvas = document.createElement('canvas');
        try {
          JsBarcode(canvas, item.serial, {
            format: 'CODE128',
            width: 2,
            height: 60,
            displayValue: false,
            margin: 0
          });

          // إضافة الباركود إلى PDF
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', x, y, barcodeWidth, barcodeHeight);

          // إضافة رقم السيريال
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text(item.serial, x + (barcodeWidth / 2), y + barcodeHeight + 5, { align: 'center' });

          // إضافة اسم المنتج
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          const productName = item.productName.length > 30 
            ? item.productName.substring(0, 30) + '...' 
            : item.productName;
          pdf.text(productName, x + (barcodeWidth / 2), y + barcodeHeight + 10, { align: 'center' });

        } catch (err) {
          console.error('Error generating barcode for:', item.serial, err);
        }
      }

      // حفظ ملف PDF
      pdf.save(`barcodes_${new Date().toISOString().split('T')[0]}.pdf`);
      
      alert(`✅ تم إنشاء ${data.length} باركود بنجاح!`);
    } catch (err) {
      setError('خطأ في إنشاء PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b p-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <Barcode size={32} />
            <div>
              <h1 className="text-3xl font-bold">🏷️ توليد الباركود</h1>
              <p className="text-purple-100 mt-1">رفع ملف Excel وإنشاء ملف PDF بالباركود</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* تحميل Template */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-blue-900 mb-2 flex items-center gap-2">
                  <FileSpreadsheet size={24} className="text-blue-600" />
                  الخطوة 1: تحميل Template Excel
                </h3>
                <p className="text-blue-700 text-sm mb-4">
                  قم بتحميل ملف Excel الجاهز، املأ البيانات (Serial و Product Name)، ثم ارفعه مرة أخرى
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors"
                >
                  <Download size={20} />
                  تحميل Template
                </button>
              </div>
              <div className="text-6xl">📊</div>
            </div>
          </div>

          {/* رفع ملف Excel */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <h3 className="font-bold text-lg text-green-900 mb-4 flex items-center gap-2">
              <Upload size={24} className="text-green-600" />
              الخطوة 2: رفع ملف Excel
            </h3>
            
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-green-300 rounded-lg p-8 hover:bg-green-100 transition-colors">
                  <div className="text-center">
                    <Upload size={48} className="mx-auto text-green-600 mb-3" />
                    <p className="text-green-900 font-bold mb-2">
                      {file ? `✓ ${file.name}` : 'اضغط لرفع ملف Excel'}
                    </p>
                    <p className="text-green-600 text-sm">
                      يدعم: .xlsx, .xls
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
                ❌ {error}
              </div>
            )}

            {data.length > 0 && (
              <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800 font-bold">
                  ✅ تم قراءة {data.length} سيريال بنجاح
                </p>
              </div>
            )}
          </div>

          {/* معاينة البيانات */}
          {data.length > 0 && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-4">📋 معاينة البيانات</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="px-4 py-3 text-right">#</th>
                      <th className="px-4 py-3 text-right">السيريال</th>
                      <th className="px-4 py-3 text-right">اسم المنتج</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.slice(0, 10).map((item) => (
                      <tr key={item.index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{item.index}</td>
                        <td className="px-4 py-3 font-mono font-bold">{item.serial}</td>
                        <td className="px-4 py-3">{item.productName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length > 10 && (
                  <p className="text-center text-gray-500 mt-3 text-sm">
                    ... و {data.length - 10} سيريال آخر
                  </p>
                )}
              </div>
            </div>
          )}

          {/* توليد PDF */}
          {data.length > 0 && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
              <h3 className="font-bold text-lg text-purple-900 mb-4 flex items-center gap-2">
                <Barcode size={24} className="text-purple-600" />
                الخطوة 3: توليد ملف PDF
              </h3>
              
              <button
                onClick={generatePDF}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all transform hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Barcode size={24} />
                    توليد {data.length} باركود
                  </>
                )}
              </button>

              <p className="text-purple-700 text-sm mt-3 text-center">
                💡 سيتم إنشاء ملف PDF يحتوي على جميع الباركود مع السيريال واسم المنتج
              </p>
            </div>
          )}

          {/* معلومات إضافية */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-bold text-yellow-900 mb-2">📝 ملاحظات هامة:</h4>
            <ul className="text-yellow-800 text-sm space-y-1 list-disc list-inside">
              <li>تأكد أن ملف Excel يحتوي على عمودين: <strong>Serial</strong> و <strong>Product Name</strong></li>
              <li>كل صفحة A4 تحتوي على 12 باركود (2 عمود × 6 صفوف)</li>
              <li>الباركود بصيغة CODE128 للتوافق مع معظم قارئات الباركود</li>
              <li>يمكنك طباعة ملف PDF مباشرة على ملصقات الباركود</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
