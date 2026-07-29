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
  
  // Quick generate form
  const [quickSerial, setQuickSerial] = useState('');
  const [quickProductName, setQuickProductName] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

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

  // توليد باركود واحد سريع
  const generateQuickBarcode = async () => {
    if (!quickSerial.trim() || !quickProductName.trim()) {
      alert('⚠️ الرجاء إدخال السيريال واسم المنتج');
      return;
    }

    setQuickLoading(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const barcodeWidth = 85;
      const barcodeHeight = 15;
      const startY = 50;

      // إنشاء canvas للباركود
      const barcodeCanvas = document.createElement('canvas');
      JsBarcode(barcodeCanvas, quickSerial, {
        format: 'CODE128',
        width: 2.5,
        height: 50,
        displayValue: false,
        margin: 3
      });

      const barcodeX = (pageWidth - barcodeWidth) / 2;
      const barcodeImgData = barcodeCanvas.toDataURL('image/png');
      pdf.addImage(barcodeImgData, 'PNG', barcodeX, startY, barcodeWidth, barcodeHeight);

      // إنشاء canvas للسيريال
      const serialCanvas = document.createElement('canvas');
      const serialCtx = serialCanvas.getContext('2d');
      const serialFontSize = 28;
      serialCtx.font = `bold ${serialFontSize}px Arial`;
      const serialMetrics = serialCtx.measureText(quickSerial);
      const serialWidth = serialMetrics.width + 40;
      
      serialCanvas.width = serialWidth;
      serialCanvas.height = serialFontSize + 20;
      
      serialCtx.font = `bold ${serialFontSize}px Arial`;
      serialCtx.textAlign = 'center';
      serialCtx.textBaseline = 'middle';
      serialCtx.fillStyle = '#000000';
      serialCtx.fillText(quickSerial, serialWidth / 2, (serialFontSize + 20) / 2);
      
      const serialImgData = serialCanvas.toDataURL('image/png');
      const serialImgWidth = Math.min(serialWidth / 3.5, 80);
      const serialImgHeight = (serialFontSize + 20) / 3.5;
      const serialX = (pageWidth - serialImgWidth) / 2;
      
      pdf.addImage(
        serialImgData, 
        'PNG', 
        serialX, 
        startY + barcodeHeight + 2, 
        serialImgWidth, 
        serialImgHeight
      );

      // إنشاء canvas لاسم المنتج
      const productCanvas = document.createElement('canvas');
      const productCtx = productCanvas.getContext('2d');
      const productFontSize = 24;
      
      productCtx.font = `${productFontSize}px Arial`;
      const productMetrics = productCtx.measureText(quickProductName);
      const productWidth = Math.min(productMetrics.width + 40, 600);
      
      productCanvas.width = productWidth;
      productCanvas.height = productFontSize + 20;
      
      productCtx.font = `${productFontSize}px Arial`;
      productCtx.textAlign = 'center';
      productCtx.textBaseline = 'middle';
      productCtx.fillStyle = '#000000';
      productCtx.fillText(quickProductName, productWidth / 2, (productFontSize + 20) / 2);
      
      const productImgData = productCanvas.toDataURL('image/png');
      const productImgWidth = Math.min(productWidth / 3.5, 85);
      const productImgHeight = (productFontSize + 20) / 3.5;
      const productX = (pageWidth - productImgWidth) / 2;
      
      pdf.addImage(
        productImgData, 
        'PNG', 
        productX, 
        startY + barcodeHeight + serialImgHeight + 4, 
        productImgWidth, 
        productImgHeight
      );

      // حفظ ملف PDF
      const fileName = `barcode_${quickSerial}_${new Date().getTime()}.pdf`;
      pdf.save(fileName);
      
      alert(`✅ تم إنشاء الباركود بنجاح!`);
      
      // إعادة تعيين النموذج
      setQuickSerial('');
      setQuickProductName('');
    } catch (err) {
      alert('❌ خطأ في إنشاء الباركود: ' + err.message);
    } finally {
      setQuickLoading(false);
    }
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

      const pageWidth = 210;
      const pageHeight = 297;
      
      // إعدادات الباركود
      const barcodeWidth = 85;
      const barcodeHeight = 15;
      const startY = 50;
      const spacingY = 35;
      
      let currentY = startY;
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // إذا امتلأت الصفحة، أضف صفحة جديدة
        if (currentY > pageHeight - 50) {
          pdf.addPage();
          currentY = startY;
        }

        // إنشاء canvas للباركود
        const barcodeCanvas = document.createElement('canvas');
        try {
          JsBarcode(barcodeCanvas, item.serial, {
            format: 'CODE128',
            width: 2.5,
            height: 50,
            displayValue: false,
            margin: 3
          });

          // حساب موضع الباركود (في المنتصف)
          const barcodeX = (pageWidth - barcodeWidth) / 2;
          
          // إضافة الباركود إلى PDF
          const barcodeImgData = barcodeCanvas.toDataURL('image/png');
          pdf.addImage(barcodeImgData, 'PNG', barcodeX, currentY, barcodeWidth, barcodeHeight);

          // إنشاء canvas للسيريال
          const serialCanvas = document.createElement('canvas');
          const serialCtx = serialCanvas.getContext('2d');
          const serialFontSize = 28;
          serialCtx.font = `bold ${serialFontSize}px Arial`;
          const serialMetrics = serialCtx.measureText(item.serial);
          const serialWidth = serialMetrics.width + 40;
          
          serialCanvas.width = serialWidth;
          serialCanvas.height = serialFontSize + 20;
          
          // رسم السيريال
          serialCtx.font = `bold ${serialFontSize}px Arial`;
          serialCtx.textAlign = 'center';
          serialCtx.textBaseline = 'middle';
          serialCtx.fillStyle = '#000000';
          serialCtx.fillText(item.serial, serialWidth / 2, (serialFontSize + 20) / 2);
          
          // إضافة السيريال كصورة
          const serialImgData = serialCanvas.toDataURL('image/png');
          const serialImgWidth = Math.min(serialWidth / 3.5, 80);
          const serialImgHeight = (serialFontSize + 20) / 3.5;
          const serialX = (pageWidth - serialImgWidth) / 2;
          
          pdf.addImage(
            serialImgData, 
            'PNG', 
            serialX, 
            currentY + barcodeHeight + 2, 
            serialImgWidth, 
            serialImgHeight
          );

          // إنشاء canvas لاسم المنتج
          const productCanvas = document.createElement('canvas');
          const productCtx = productCanvas.getContext('2d');
          const productFontSize = 24;
          const currentProductName = item.productName; // حفظ اسم المنتج الحالي
          
          productCtx.font = `${productFontSize}px Arial`;
          const productMetrics = productCtx.measureText(currentProductName);
          const productWidth = Math.min(productMetrics.width + 40, 600);
          
          productCanvas.width = productWidth;
          productCanvas.height = productFontSize + 20;
          
          // رسم اسم المنتج
          productCtx.font = `${productFontSize}px Arial`;
          productCtx.textAlign = 'center';
          productCtx.textBaseline = 'middle';
          productCtx.fillStyle = '#000000';
          productCtx.fillText(currentProductName, productWidth / 2, (productFontSize + 20) / 2);
          
          // إضافة اسم المنتج كصورة
          const productImgData = productCanvas.toDataURL('image/png');
          const productImgWidth = Math.min(productWidth / 3.5, 85);
          const productImgHeight = (productFontSize + 20) / 3.5;
          const productX = (pageWidth - productImgWidth) / 2;
          
          pdf.addImage(
            productImgData, 
            'PNG', 
            productX, 
            currentY + barcodeHeight + serialImgHeight + 4, 
            productImgWidth, 
            productImgHeight
          );

          // الانتقال للباركود التالي
          currentY += spacingY;

        } catch (err) {
          console.error('Error generating barcode for:', item.serial, err);
        }
      }

      // حفظ ملف PDF
      const fileName = `barcodes_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
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
        <div className="border-b p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <Barcode size={32} />
            <div>
              <h1 className="text-3xl font-bold">🏷️ توليد الباركود</h1>
              <p className="text-emerald-100 mt-1">رفع ملف Excel وإنشاء ملف PDF بالباركود</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* توليد سريع لباركود واحد */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-300 rounded-lg p-6">
            <h3 className="font-bold text-lg text-teal-900 mb-4 flex items-center gap-2">
              <Barcode size={24} className="text-teal-600" />
              ⚡ توليد سريع - باركود واحد
            </h3>
            <p className="text-teal-700 text-sm mb-4">
              أدخل السيريال واسم المنتج لتوليد باركود واحد مباشرة بدون ملف Excel
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-teal-900 mb-2">السيريال *</label>
                <input
                  type="text"
                  value={quickSerial}
                  onChange={(e) => setQuickSerial(e.target.value)}
                  className="w-full p-3 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="مثال: 12345"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-teal-900 mb-2">اسم المنتج *</label>
                <input
                  type="text"
                  value={quickProductName}
                  onChange={(e) => setQuickProductName(e.target.value)}
                  className="w-full p-3 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="مثال: بنطلون جينز أزرق"
                />
              </div>
            </div>
            
            <button
              onClick={generateQuickBarcode}
              disabled={quickLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all transform hover:scale-[1.02]"
            >
              {quickLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  جاري التوليد...
                </>
              ) : (
                <>
                  <Barcode size={20} />
                  توليد الباركود الآن
                </>
              )}
            </button>
          </div>

          {/* فاصل */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-300"></div>
            <span className="text-slate-500 font-medium">أو</span>
            <div className="flex-1 h-px bg-slate-300"></div>
          </div>

          {/* تحميل Template */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-emerald-900 mb-2 flex items-center gap-2">
                  <FileSpreadsheet size={24} className="text-emerald-600" />
                  الخطوة 1: تحميل Template Excel
                </h3>
                <p className="text-emerald-700 text-sm mb-4">
                  قم بتحميل ملف Excel الجاهز، املأ البيانات (Serial و Product Name)، ثم ارفعه مرة أخرى
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold transition-colors"
                >
                  <Download size={20} />
                  تحميل Template
                </button>
              </div>
              <div className="text-6xl">📊</div>
            </div>
          </div>

          {/* رفع ملف Excel */}
          <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-6">
            <h3 className="font-bold text-lg text-teal-900 mb-4 flex items-center gap-2">
              <Upload size={24} className="text-teal-600" />
              الخطوة 2: رفع ملف Excel
            </h3>
            
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-teal-300 rounded-lg p-8 hover:bg-teal-100 transition-colors">
                  <div className="text-center">
                    <Upload size={48} className="mx-auto text-teal-600 mb-3" />
                    <p className="text-teal-900 font-bold mb-2">
                      {file ? `✓ ${file.name}` : 'اضغط لرفع ملف Excel'}
                    </p>
                    <p className="text-teal-600 text-sm">
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
              <div className="mt-4 p-4 bg-emerald-100 border border-emerald-300 rounded-lg">
                <p className="text-emerald-800 font-bold">
                  ✅ تم قراءة {data.length} سيريال بنجاح
                </p>
              </div>
            )}
          </div>

          {/* معاينة البيانات */}
          {data.length > 0 && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
              <h3 className="font-bold text-lg text-slate-900 mb-4">📋 معاينة البيانات</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="px-4 py-3 text-right">#</th>
                      <th className="px-4 py-3 text-right">السيريال</th>
                      <th className="px-4 py-3 text-right">اسم المنتج</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.slice(0, 10).map((item) => (
                      <tr key={item.index} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{item.index}</td>
                        <td className="px-4 py-3 font-mono font-bold">{item.serial}</td>
                        <td className="px-4 py-3">{item.productName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length > 10 && (
                  <p className="text-center text-slate-500 mt-3 text-sm">
                    ... و {data.length - 10} سيريال آخر
                  </p>
                )}
              </div>
            </div>
          )}

          {/* توليد PDF */}
          {data.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg p-6">
              <h3 className="font-bold text-lg text-emerald-900 mb-4 flex items-center gap-2">
                <Barcode size={24} className="text-emerald-600" />
                الخطوة 3: توليد ملف PDF
              </h3>
              
              <button
                onClick={generatePDF}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg"
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

              <p className="text-emerald-700 text-sm mt-3 text-center">
                💡 سيتم إنشاء ملف PDF يحتوي على جميع الباركود مع السيريال واسم المنتج
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
