import React from 'react';

export default function AuditsReportSection({ auditsData }) {
  if (!auditsData?.data || auditsData.data.totalAudits === 0) {
    return null;
  }

  const data = auditsData.data;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 page-break-before">
      <h2 className="text-2xl font-bold mb-6 text-red-800 flex items-center gap-2">
        📦 تقرير الجرود والخسائر
      </h2>

      {/* ملخص الجرود */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <div className="text-sm text-blue-600 mb-1">عدد الجرود المنفذة</div>
          <div className="text-2xl font-bold text-blue-800">{data.totalAudits}</div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
          <div className="text-sm text-orange-600 mb-1">إجمالي كمية العجز</div>
          <div className="text-2xl font-bold text-orange-800">{data.totalShortageQty} قطعة</div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
          <div className="text-sm text-red-600 mb-1">خسائر العجز (بالتكلفة)</div>
          <div className="text-2xl font-bold text-red-800">{(data.totalShortageValue || 0).toFixed(2)} ج.م</div>
          <div className="text-xs text-red-600 mt-1">💰 الخسارة الفعلية</div>
        </div>

        <div className={`p-4 rounded-lg border-l-4 ${(data.netLoss || 0) >= 0 ? 'bg-red-50 border-red-500' : 'bg-emerald-50 border-emerald-500'}`}>
          <div className={`text-sm mb-1 ${(data.netLoss || 0) >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>صافي الخسارة</div>
          <div className={`text-2xl font-bold ${(data.netLoss || 0) >= 0 ? 'text-red-800' : 'text-emerald-800'}`}>
            {(data.netLoss || 0) >= 0 
              ? `${(data.netLoss || 0).toFixed(2)} ج.م`
              : `+${Math.abs(data.netLoss || 0).toFixed(2)} ج.م`
            }
          </div>
          <div className={`text-xs mt-1 ${(data.netLoss || 0) >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {(data.netLoss || 0) >= 0 ? '📉 خسارة' : '📈 مكسب'}
          </div>
        </div>
      </div>

      {/* جدول تفاصيل الجرود */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 border-b">رقم الجرد</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 border-b">الفرع</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 border-b">التاريخ</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 border-b">عدد الأصناف</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 border-b">أصناف بها عجز</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 border-b">كمية العجز</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 border-b">الخسارة الفعلية</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 border-b">صافي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.audits.map((audit) => (
              <tr key={audit.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-900">{audit.auditNumber}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{audit.branch.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(audit.settledAt).toLocaleDateString('ar-EG')}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-700">{audit.totalItems}</td>
                <td className="px-4 py-3 text-sm text-center text-orange-700 font-semibold">
                  {audit.itemsWithShortage}
                </td>
                <td className="px-4 py-3 text-sm text-center text-orange-800 font-bold">
                  {audit.totalShortageQty}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-700 font-bold">
                  {(audit.actualLoss || 0).toFixed(2)} ج.م
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold">
                  <span className={(audit.netLoss || 0) >= 0 ? 'text-red-700' : 'text-emerald-700'}>
                    {(audit.netLoss || 0) >= 0 
                      ? `-${(audit.netLoss || 0).toFixed(2)}`
                      : `+${Math.abs(audit.netLoss || 0).toFixed(2)}`
                    } ج.م
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr className="font-bold">
              <td colSpan="5" className="px-4 py-3 text-right text-gray-800">الإجمالي</td>
              <td className="px-4 py-3 text-center text-orange-800">{data.totalShortageQty || 0}</td>
              <td className="px-4 py-3 text-right text-red-700">{(data.totalShortageValue || 0).toFixed(2)} ج.م</td>
              <td className="px-4 py-3 text-right">
                <span className={(data.netLoss || 0) >= 0 ? 'text-red-700' : 'text-emerald-700'}>
                  {(data.netLoss || 0) >= 0 
                    ? `-${(data.netLoss || 0).toFixed(2)}`
                    : `+${Math.abs(data.netLoss || 0).toFixed(2)}`
                  } ج.م
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* تفاصيل الأصناف المفقودة */}
      {data.audits.some(a => a.items && a.items.length > 0) && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">تفاصيل الأصناف بها فروقات:</h3>
          {data.audits.map((audit) => (
            audit.items && audit.items.length > 0 && (
              <div key={audit.id} className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="font-bold text-red-800 mb-2">
                  {audit.auditNumber} - {audit.branch.name}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {audit.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-red-100">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{item.product.name}</div>
                        <div className="text-xs text-gray-500">
                          متوقع: {item.expectedQty} | فعلي: {item.actualQty} | 
                          <span className={item.differenceQty < 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                            {' '}{item.differenceType === 'SHORTAGE' ? 'عجز' : 'زيادة'}: {Math.abs(item.differenceQty)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-red-700">
                          {(item.actualDifferenceValue || 0).toFixed(2)} ج.م
                        </div>
                        <div className="text-xs text-gray-500">خسارة فعلية</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* ملاحظة مهمة */}
      <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <div className="flex items-start gap-2">
          <span className="text-yellow-600 text-xl">💡</span>
          <div className="flex-1">
            <div className="font-bold text-yellow-800 mb-1">ملاحظة مهمة:</div>
            <div className="text-sm text-yellow-700">
              الخسائر المعروضة محسوبة <strong>بسعر التكلفة</strong> (السعر اللي دفعته في المنتج)، مش بسعر البيع. 
              هذا هو المبلغ الفعلي اللي خسرته من رأس المال.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
