import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Package, Users, FileText } from 'lucide-react';
import api from '../services/api';

export default function MonthlyReport() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const handlePrint = () => {
    window.print();
  };
  
  // تحويل endDate لآخر اليوم (23:59:59) للـ API calls
  const endDateForAPI = new Date(endDate);
  endDateForAPI.setHours(23, 59, 59, 999);
  const endDateString = endDateForAPI.toISOString();

  // جلب البيانات
  const { data: sales } = useQuery({
    queryKey: ['sales', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/sales', { params: { startDate, endDate: endDateString, all: 'true', branchesOnly: 'true' } });
      return response.data;
    },
  });

  const { data: purchases } = useQuery({
    queryKey: ['purchases', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/purchases', { params: { startDate, endDate: endDateString } });
      return response.data;
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/expenses', { params: { startDate, endDate: endDateString } });
      return response.data;
    },
  });

  const { data: transfers } = useQuery({
    queryKey: ['transfers', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/transfers', { params: { startDate, endDate: endDateString } });
      return response.data;
    },
  });

  const { data: partners } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const response = await api.get('/partners');
      return response.data;
    },
  });

  const { data: returns } = useQuery({
    queryKey: ['returns', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/returns', { params: { startDate, endDate: endDateString } });
      return response.data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/branches');
      return response.data;
    },
  });

  // بيانات توريدات الفروع ومبيعاتهم
  const { data: branchTransfersData } = useQuery({
    queryKey: ['branch-transfers-report', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/reports/branch-transfers', { 
        params: { startDate, endDate: endDateString } 
      });
      return response.data;
    },
  });

  // بيانات مبيعات العملاء (فواتير الجملة)
  const { data: customerSalesData } = useQuery({
    queryKey: ['customer-sales', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/sales', { 
        params: { 
          startDate, 
          endDate: endDateString,
          customerOnly: 'true' // فقط المبيعات للعملاء
        } 
      });
      return response.data;
    },
  });

  // بيانات الإنتاج - شراء القماش
  const { data: fabricPurchasesData } = useQuery({
    queryKey: ['fabric-purchases', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/fabric/purchases', { 
        params: { startDate, endDate: endDateString } 
      });
      return response.data;
    },
  });

  // بيانات الإنتاج - أوامر التصنيع
  const { data: manufacturingOrdersData } = useQuery({
    queryKey: ['manufacturing-orders-report', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/production/manufacturing', { 
        params: { startDate, endDate: endDateString, status: 'COMPLETED' } 
      });
      return response.data;
    },
  });

  // بيانات الإنتاج - أوامر الغسيل
  const { data: washingOrdersData } = useQuery({
    queryKey: ['washing-orders-report', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/production/washing', { 
        params: { startDate, endDate: endDateString, status: 'COMPLETED' } 
      });
      return response.data;
    },
  });

  // بيانات فواتير المكتب (المخزن الرئيسي)
  const { data: officeInvoicesData } = useQuery({
    queryKey: ['office-invoices-report', startDate, endDateString],
    queryFn: async () => {
      const response = await api.get('/reports/office-invoices', { 
        params: { startDate, endDate: endDateString } 
      });
      return response.data;
    },
  });

  // حساب الإجماليات - normalize data format
  const salesData = Array.isArray(sales?.data) ? sales.data : (Array.isArray(sales?.data?.data) ? sales.data.data : []);
  const purchasesData = purchases?.data?.data?.purchases || purchases?.data?.purchases || (Array.isArray(purchases?.data) ? purchases.data : (Array.isArray(purchases?.data?.data) ? purchases.data.data : []));
  const expensesData = expenses?.data?.expenses || (Array.isArray(expenses?.data) ? expenses.data : (Array.isArray(expenses?.data?.data) ? expenses.data.data : []));
  const transfersData = Array.isArray(transfers?.data) ? transfers.data : (Array.isArray(transfers?.data?.data) ? transfers.data.data : []);
  const partnersData = Array.isArray(partners?.data) ? partners.data : (Array.isArray(partners?.data?.data) ? partners.data.data : []);

  const returnsData = Array.isArray(returns?.data) ? returns.data : (Array.isArray(returns?.data?.data) ? returns.data.data : []);
  const branchesData = Array.isArray(branches?.data) ? branches.data : (Array.isArray(branches?.data?.data) ? branches.data.data : []);
  const branchTransfers = branchTransfersData?.data || [];
  const customerSales = Array.isArray(customerSalesData?.data) ? customerSalesData.data : (Array.isArray(customerSalesData?.data?.data) ? customerSalesData.data.data : []);

  // بيانات الإنتاج
  const fabricPurchases = fabricPurchasesData?.data || [];
  const manufacturingOrders = manufacturingOrdersData?.data || [];
  const washingOrders = washingOrdersData?.data || [];
  
  // بيانات فواتير المكتب
  const officeInvoices = officeInvoicesData?.data || {};
  const officeInvoicesTotalSales = officeInvoices.totalSales || 0;
  const officeInvoicesProfit = officeInvoices.totalProfit || 0;
  const officeInvoicesCollected = officeInvoices.totalCollected || 0;

  // حسابات الإنتاج
  const totalFabricPurchases = fabricPurchases.reduce((sum, purchase) => sum + (purchase.totalCost || 0), 0);
  const totalFabricMeters = fabricPurchases.reduce((sum, purchase) => sum + (purchase.meters || 0), 0);
  const totalFabricPaid = fabricPurchases.reduce((sum, purchase) => sum + (purchase.paidAmount || 0), 0);
  
  const totalManufacturingCost = manufacturingOrders.reduce((sum, order) => sum + (order.totalManufacturingCost || 0), 0);
  const totalManufacturingPieces = manufacturingOrders.reduce((sum, order) => sum + (order.piecesReceived || 0), 0);
  const totalManufacturingPaid = manufacturingOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
  
  const totalWashingCost = washingOrders.reduce((sum, order) => sum + (order.totalWashingCost || 0), 0);
  const totalWashingPieces = washingOrders.reduce((sum, order) => sum + (order.piecesReceived || 0), 0);
  const totalWashingPaid = washingOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
  
  const totalProductionCost = totalFabricPurchases + totalManufacturingCost + totalWashingCost;
  const totalProductionPaid = totalFabricPaid + totalManufacturingPaid + totalWashingPaid;

  const totalSales = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalReturns = returnsData.reduce((sum, ret) => sum + (ret.totalSaleAmount || 0), 0);
  const totalReturnsCost = returnsData.reduce((sum, ret) => sum + (ret.totalCostAmount || 0), 0);
  const netSales = totalSales - totalReturns;
  
  // المشتريات = المشتريات العادية + مشتريات الإنتاج (قماش + تصنيع + غسيل)
  const regularPurchases = purchasesData.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);
  const totalPurchases = regularPurchases + totalProductionCost;
  const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  
  // حساب معاملات الموردين
  const totalPurchasesPaid = purchasesData.reduce((sum, purchase) => sum + (purchase.paidAmount || 0), 0);
  const totalPurchasesRemaining = purchasesData.reduce((sum, purchase) => sum + (purchase.remainingAmount || 0), 0);
  
  // حساب مبيعات العملاء (فواتير الجملة)
  const totalCustomerSales = customerSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalCustomerSalesPaid = customerSales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0); // المدفوع فقط
  const totalCustomerSalesRemaining = totalCustomerSales - totalCustomerSalesPaid; // المتبقي عند العملاء
  const customerSalesCount = customerSales.length;
  
  // تكلفة بضاعة مبيعات العملاء
  const customerSalesCost = customerSales.reduce((sum, sale) => {
    return sum + (sale.items?.reduce((itemSum, item) => {
      return itemSum + ((item.product?.costPrice || 0) * item.quantity);
    }, 0) || 0);
  }, 0);
  
  // الربح من مبيعات العملاء (كل المبيعات - حتى لو مش مدفوعة)
  const customerSalesProfit = totalCustomerSales - customerSalesCost;
  
  // الإيرادات = مبيعات الفروع + مبيعات الجملة (المكتب) المحصلة
  const totalRevenue = netSales + officeInvoicesCollected;
  
  // تكلفة البضاعة المباعة (COGS)
  // تكلفة مبيعات الفروع + تكلفة مبيعات الجملة (المكتب)
  const branchSalesCost = salesData.reduce((sum, sale) => {
    return sum + (sale.items?.reduce((itemSum, item) => {
      return itemSum + ((item.product?.costPrice || 0) * item.quantity);
    }, 0) || 0);
  }, 0);
  
  const officeInvoicesCost = officeInvoices.totalCost || 0;

  const costOfGoodsSold = branchSalesCost + officeInvoicesCost;

  // صافي الربح (على أساس الاستحقاق)
  const grossProfit = totalRevenue - costOfGoodsSold;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;
  
  // التدفق النقدي (Cash Flow)
  // الإيرادات النقدية = مبيعات الفروع + مبيعات الجملة (المكتب) المحصلة
  const cashInflow = totalSales + officeInvoicesCollected - totalReturns;
  const cashOutflow = totalExpenses + totalProductionPaid; // المصروفات النقدية (مصروفات + إنتاج فقط)
  const netCashFlow = cashInflow - cashOutflow;

  // حساب حصص الشركاء (من الربح أو الخسارة)
  const partnersShare = partnersData.map(partner => {
    const share = (netProfit * (partner.sharePercentage || 0)) / 100;
    return {
      ...partner,
      calculatedShare: share,
      isLoss: netProfit < 0
    };
  });

  const totalPartnersShare = partnersShare.reduce((sum, p) => sum + p.calculatedShare, 0);
  const remainingProfit = netProfit - totalPartnersShare;

  return (
    <div className="space-y-6">
      <div id="monthly-report-content">
        <div className="flex items-center justify-between mb-6 print:block">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التقرير الشهري الشامل</h1>
            <p className="text-gray-600 mt-1">تقرير تفصيلي للمبيعات والمشتريات والأرباح</p>
          </div>
        </div>

      {/* فلتر التاريخ */}
      <div className="card mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-500" />
            <span className="text-sm font-medium">الفترة:</span>
          </div>
          <div className="flex gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">من</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">إلى</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* مبيعات الفروع */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">مبيعات الفروع</h3>
            <TrendingUp className="text-green-600" size={24} />
          </div>
          <p className="text-2xl font-bold text-green-700">{totalSales.toFixed(2)} ج.م</p>
          <p className="text-xs text-gray-600 mt-1">{salesData.length || 0} فاتورة</p>
          {totalReturns > 0 && (
            <p className="text-xs text-red-600 mt-1">- المرتجعات: {totalReturns.toFixed(2)} ج.م</p>
          )}
        </div>

        {/* مبيعات الجملة (المكتب) */}
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">مبيعات الجملة</h3>
            <Users className="text-purple-600" size={24} />
          </div>
          <p className="text-2xl font-bold text-purple-700">{officeInvoicesTotalSales.toFixed(2)} ج.م</p>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-green-600">محصل: {officeInvoicesCollected.toFixed(2)}</span>
            <span className="text-orange-600">متبقي: {(officeInvoicesTotalSales - officeInvoicesCollected).toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{officeInvoices.totalInvoices || 0} فاتورة • ربح: {officeInvoicesProfit.toFixed(2)} ج.م</p>
          <div className="text-xs text-gray-500 mt-2 space-y-1">
            <div className="flex justify-between">
              <span>زباين: {officeInvoices.byType?.regular?.count || 0}</span>
              <span>{(officeInvoices.byType?.regular?.sales || 0).toFixed(0)} ج</span>
            </div>
            <div className="flex justify-between">
              <span>شحن: {officeInvoices.byType?.shipment?.count || 0}</span>
              <span>{(officeInvoices.byType?.shipment?.sales || 0).toFixed(0)} ج</span>
            </div>
            <div className="flex justify-between">
              <span>عملاء: {officeInvoices.byType?.client?.count || 0}</span>
              <span>{(officeInvoices.byType?.client?.sales || 0).toFixed(0)} ج</span>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">المشتريات</h3>
            <Package className="text-red-600" size={24} />
          </div>
          <p className="text-2xl font-bold text-red-700">{totalPurchases.toFixed(2)} ج.م</p>
          <p className="text-xs text-gray-600 mt-1">{purchasesData.length || 0} فاتورة</p>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">المصروفات</h3>
            <DollarSign className="text-orange-600" size={24} />
          </div>
          <p className="text-2xl font-bold text-orange-700">{totalExpenses.toFixed(2)} ج.م</p>
          <p className="text-xs text-gray-600 mt-1">{expensesData.length || 0} مصروف</p>
        </div>

        <div className={`card bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-50 to-blue-100' : 'from-gray-50 to-gray-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">صافي الربح</h3>
            {netProfit >= 0 ? <TrendingUp className="text-blue-600" size={24} /> : <TrendingDown className="text-gray-600" size={24} />}
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-gray-700'}`}>
            {netProfit.toFixed(2)} ج.م
          </p>
          <p className="text-xs text-gray-600 mt-1">هامش الربح: {profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* التفاصيل */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* قائمة الدخل */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileText size={20} />
            قائمة الدخل (أساس الاستحقاق)
          </h2>
          <div className="text-xs text-gray-500 mb-3 bg-blue-50 p-2 rounded">
            💡 تحسب الإيرادات والتكاليف <strong>بغض النظر عن الدفع</strong>
          </div>
          
          <div className="space-y-3">
            {/* الإيرادات */}
            <div className="bg-green-50 p-2 rounded">
              <p className="font-bold text-sm text-green-900 mb-2">📥 الإيرادات النقدية</p>
              
              <div className="flex justify-between items-center pb-2 border-b border-green-200">
                <span className="text-sm">مبيعات الفروع</span>
                <span className="font-medium text-green-700">{totalSales.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-b border-green-200">
                <span className="text-sm">مبيعات الجملة (المكتب)</span>
                <span className="font-medium text-green-700">{officeInvoicesCollected.toFixed(2)}</span>
              </div>
              
              {totalReturns > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-green-200">
                  <span className="text-sm text-gray-600">- المرتجعات</span>
                  <span className="text-red-600">({totalReturns.toFixed(2)})</span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 font-bold">
                <span>= صافي الإيرادات</span>
                <span className="text-green-700">{totalRevenue.toFixed(2)}</span>
              </div>
            </div>
            
            {/* التكاليف */}
            <div className="bg-red-50 p-2 rounded">
              <p className="font-bold text-sm text-red-900 mb-2">📤 التكاليف</p>
              
              <div className="flex justify-between items-center pb-2 border-b border-red-200">
                <span className="text-sm">تكلفة البضاعة المباعة (فروع)</span>
                <span className="font-medium text-red-700">{branchSalesCost.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-b border-red-200">
                <span className="text-sm">تكلفة البضاعة المباعة (جملة)</span>
                <span className="font-medium text-red-700">{officeInvoicesCost.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-b border-red-200">
                <span className="text-sm">تكاليف الإنتاج (قماش + تصنيع + غسيل)</span>
                <span className="font-medium text-red-700">{totalProductionCost.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-b border-red-200">
                <span className="text-sm">المصروفات التشغيلية</span>
                <span className="font-medium text-red-700">{totalExpenses.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 font-bold">
                <span>= إجمالي التكاليف</span>
                <span className="text-red-700">{(costOfGoodsSold + totalProductionCost + totalExpenses).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-3 bg-blue-100 p-3 rounded-lg border-2 border-blue-300">
              <span className="font-bold text-lg">= صافي الربح / الخسارة</span>
              <span className={`font-bold text-xl ${(totalRevenue - costOfGoodsSold - totalProductionCost - totalExpenses) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {(totalRevenue - costOfGoodsSold - totalProductionCost - totalExpenses) >= 0 ? '+' : ''}{(totalRevenue - costOfGoodsSold - totalProductionCost - totalExpenses).toFixed(2)} ج.م
              </span>
            </div>
            
            {/* ملاحظة مبيعات الجملة بالتفصيل */}
            {officeInvoicesTotalSales > 0 && (
              <div className="bg-purple-50 p-3 rounded border border-purple-200 mt-3">
                <p className="text-xs font-bold text-purple-900 mb-1">📦 تفاصيل مبيعات الجملة:</p>
                <div className="text-xs text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>• زباين ({officeInvoices.byType?.regular?.count || 0} فاتورة):</span>
                    <span className="font-medium">{(officeInvoices.byType?.regular?.sales || 0).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• شحن ({officeInvoices.byType?.shipment?.count || 0} فاتورة):</span>
                    <span className="font-medium">{(officeInvoices.byType?.shipment?.sales || 0).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• عملاء دائمين ({officeInvoices.byType?.client?.count || 0} فاتورة):</span>
                    <span className="font-medium">{(officeInvoices.byType?.client?.sales || 0).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between border-t border-purple-300 pt-1 mt-1">
                    <span className="font-bold">إجمالي المبيعات:</span>
                    <span className="font-bold">{officeInvoicesTotalSales.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">المحصل:</span>
                    <span className="font-medium text-green-700">{officeInvoicesCollected.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-700">المتبقي:</span>
                    <span className="font-medium text-orange-700">{(officeInvoicesTotalSales - officeInvoicesCollected).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between border-t border-purple-300 pt-1 mt-1">
                    <span className="font-bold">الربح:</span>
                    <span className="font-bold text-purple-700">{officeInvoicesProfit.toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* التدفق النقدي */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            التدفق النقدي (Cash Flow)
          </h2>
          <div className="text-xs text-gray-500 mb-3 bg-green-50 p-2 rounded">
            💰 يحسب الفلوس اللي <strong>دخلت ودفعت فعلياً</strong> - مش المستحق
          </div>
          
          <div className="space-y-3">
            {/* التدفقات الداخلة */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                📥 التدفقات الداخلة (الإيرادات النقدية)
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">مبيعات الفروع (نقدي)</span>
                  <span className="font-medium text-green-700">+{totalSales.toFixed(2)}</span>
                </div>
                
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">مبيعات الجملة (المحصل نقدي)</span>
                    <span className="font-bold text-green-700">+{officeInvoicesCollected.toFixed(2)}</span>
                  </div>
                  
                  {/* تفصيل مبيعات الجملة */}
                  <div className="bg-purple-50 p-2 rounded mb-2 border border-purple-200">
                    <div className="flex justify-between items-center text-xs px-2 mb-1">
                      <span className="text-gray-600">• زباين ({officeInvoices.byType?.regular?.count || 0})</span>
                      <span className="text-gray-700">{(officeInvoices.byType?.regular?.collected || 0).toFixed(2)} ج</span>
                    </div>
                    <div className="flex justify-between items-center text-xs px-2 mb-1">
                      <span className="text-gray-600">• شحن ({officeInvoices.byType?.shipment?.count || 0})</span>
                      <span className="text-gray-700">{(officeInvoices.byType?.shipment?.collected || 0).toFixed(2)} ج</span>
                    </div>
                    <div className="flex justify-between items-center text-xs px-2">
                      <span className="text-gray-600">• عملاء دائمين ({officeInvoices.byType?.client?.count || 0})</span>
                      <span className="text-gray-700">{(officeInvoices.byType?.client?.collected || 0).toFixed(2)} ج</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs px-2">
                    <span className="text-gray-500">• إجمالي المبيعات</span>
                    <span className="text-gray-600">{officeInvoicesTotalSales.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center text-xs px-2">
                    <span className="text-blue-600">• المحصل</span>
                    <span className="text-green-600 font-semibold">{officeInvoicesCollected.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center text-xs px-2">
                    <span className="text-orange-600">• المتبقي (ديون لنا)</span>
                    <span className="text-orange-700 font-semibold">{(officeInvoicesTotalSales - officeInvoicesCollected).toFixed(2)} ج.م</span>
                  </div>
                </div>
                
                {totalReturns > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">- المرتجعات المستردة</span>
                    <span className="font-medium text-red-700">-{totalReturns.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-2 border-t-2 border-green-300">
                  <span className="font-bold text-green-800">= إجمالي الداخل</span>
                  <span className="font-bold text-lg text-green-700">{cashInflow.toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>
            
            {/* التدفقات الخارجة */}
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                📤 التدفقات الخارجة (المصروفات النقدية)
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-700">مدفوع للإنتاج (قماش)</span>
                    <div className="text-xs text-gray-500">من أصل {totalFabricPurchases.toFixed(2)} ج.م</div>
                  </div>
                  <span className="font-medium text-red-700">-{totalFabricPaid.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-700">مدفوع للتصنيع</span>
                    <div className="text-xs text-gray-500">من أصل {totalManufacturingCost.toFixed(2)} ج.م</div>
                  </div>
                  <span className="font-medium text-red-700">-{totalManufacturingPaid.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-700">مدفوع للغسيل</span>
                    <div className="text-xs text-gray-500">من أصل {totalWashingCost.toFixed(2)} ج.م</div>
                  </div>
                  <span className="font-medium text-red-700">-{totalWashingPaid.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-700">المصروفات التشغيلية</span>
                    <div className="text-xs text-gray-500">{expensesData.length} مصروف</div>
                  </div>
                  <span className="font-medium text-red-700">-{totalExpenses.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t-2 border-red-300">
                  <span className="font-bold text-red-800">= إجمالي الخارج</span>
                  <span className="font-bold text-lg text-red-700">{cashOutflow.toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>
            
            {/* صافي التدفق */}
            <div className={`p-4 rounded-lg border-2 ${netCashFlow >= 0 ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">💵 صافي التدفق النقدي</span>
                <span className={`font-bold text-2xl ${netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {netCashFlow >= 0 ? '+' : ''}{netCashFlow.toFixed(2)} ج.م
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {netCashFlow >= 0 ? '✅ عندك فائض نقدي' : '⚠️ عندك عجز نقدي'}
              </div>
            </div>
            
            {/* التزامات مستقبلية */}
            {(totalPurchasesRemaining > 0 || (totalProductionCost - totalProductionPaid) > 0) && (
              <div className="mt-3 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⚠️</span>
                  <span className="font-bold text-yellow-900">التزامات مستقبلية (لم تُدفع بعد)</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  {(totalFabricPurchases - totalFabricPaid) > 0 && (
                    <div className="flex justify-between items-center p-2 bg-yellow-100 rounded">
                      <div>
                        <span className="font-medium text-yellow-900">متبقي للقماش</span>
                        <div className="text-xs text-yellow-700">سيتم دفعها في المستقبل</div>
                      </div>
                      <span className="font-bold text-yellow-900">{(totalFabricPurchases - totalFabricPaid).toFixed(2)} ج.م</span>
                    </div>
                  )}
                  
                  {(totalManufacturingCost - totalManufacturingPaid) > 0 && (
                    <div className="flex justify-between items-center p-2 bg-yellow-100 rounded">
                      <div>
                        <span className="font-medium text-yellow-900">متبقي للتصنيع</span>
                        <div className="text-xs text-yellow-700">سيتم دفعها في المستقبل</div>
                      </div>
                      <span className="font-bold text-yellow-900">{(totalManufacturingCost - totalManufacturingPaid).toFixed(2)} ج.م</span>
                    </div>
                  )}
                  
                  {(totalWashingCost - totalWashingPaid) > 0 && (
                    <div className="flex justify-between items-center p-2 bg-yellow-100 rounded">
                      <div>
                        <span className="font-medium text-yellow-900">متبقي للغسيل</span>
                        <div className="text-xs text-yellow-700">سيتم دفعها في المستقبل</div>
                      </div>
                      <span className="font-bold text-yellow-900">{(totalWashingCost - totalWashingPaid).toFixed(2)} ج.م</span>
                    </div>
                  )}
                  
                  {totalCustomerSalesRemaining > 0 && (
                    <div className="flex justify-between items-center p-2 bg-blue-100 rounded border border-blue-300">
                      <div>
                        <span className="font-medium text-blue-900">💰 متبقي عند العملاء (ديون لنا)</span>
                        <div className="text-xs text-blue-700">مبيعات آجلة - سيتم تحصيلها في المستقبل</div>
                      </div>
                      <span className="font-bold text-blue-900">{totalCustomerSalesRemaining.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-yellow-800 bg-yellow-100 p-2 rounded">
                    💡 <strong>ملحوظة:</strong> هذه المبالغ مش محسوبة في التدفق النقدي لأنها لسه ما اتدفعتش
                  </div>
                </div>
              </div>
            )}
            
            {/* شرح الفرق */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="font-bold text-blue-900 mb-2">📚 الفرق بين الربح والتدفق النقدي:</div>
              <div className="space-y-1 text-blue-800">
                <div>• <strong>صافي الربح ({netProfit.toFixed(2)} ج.م):</strong> الربح المحاسبي (بغض النظر عن الدفع)</div>
                <div>• <strong>صافي التدفق ({netCashFlow.toFixed(2)} ج.م):</strong> الفلوس اللي دخلت وطلعت فعلاً</div>
                <div className="mt-2 pt-2 border-t border-blue-300">
                  💡 ممكن يكون عندك ربح لكن فلوس قليلة (لو الموردين مش متدفعلهم)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* بيانات الإنتاج */}
      <div className="card mt-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Package size={20} />
          دورة الإنتاج (القماش → التصنيع → الغسيل)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* شراء القماش */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              📦 شراء القماش
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">إجمالي التكلفة:</span>
                <span className="font-bold text-blue-700">{totalFabricPurchases.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">إجمالي الأمتار:</span>
                <span className="font-medium">{totalFabricMeters.toFixed(2)} متر</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">عدد الفواتير:</span>
                <span className="font-medium">{fabricPurchases.length}</span>
              </div>
            </div>
          </div>
          
          {/* التصنيع */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
              ⚙️ التصنيع
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">إجمالي التكلفة:</span>
                <span className="font-bold text-green-700">{totalManufacturingCost.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">إجمالي القطع:</span>
                <span className="font-medium">{totalManufacturingPieces} قطعة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">عدد الأوامر:</span>
                <span className="font-medium">{manufacturingOrders.length}</span>
              </div>
            </div>
          </div>
          
          {/* الغسيل */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
              🧼 الغسيل
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">إجمالي التكلفة:</span>
                <span className="font-bold text-purple-700">{totalWashingCost.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">إجمالي القطع:</span>
                <span className="font-medium">{totalWashingPieces} قطعة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">عدد الأوامر:</span>
                <span className="font-medium">{washingOrders.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* إجمالي تكاليف الإنتاج */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border-2 border-orange-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-orange-900 mb-1">إجمالي تكاليف الإنتاج</h3>
              <p className="text-xs text-gray-600">قماش + تصنيع + غسيل</p>
            </div>
            <span className="text-3xl font-bold text-orange-700">{totalProductionCost.toFixed(2)} ج.م</span>
          </div>
        </div>
        
        {/* تفاصيل أوامر التصنيع */}
        {manufacturingOrders.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold mb-3">تفاصيل أوامر التصنيع المكتملة</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-center p-2">رقم الأمر</th>
                    <th className="text-right p-2">المورد</th>
                    <th className="text-center p-2">القماش المستخدم</th>
                    <th className="text-center p-2">القطع المنتجة</th>
                    <th className="text-center p-2">التكلفة</th>
                    <th className="text-center p-2">تاريخ الاستلام</th>
                  </tr>
                </thead>
                <tbody>
                  {manufacturingOrders.map(order => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-center font-mono">#{order.orderNumber}</td>
                      <td className="p-2">{order.supplier?.name}</td>
                      <td className="p-2 text-center">{order.metersUsed?.toFixed(2)} متر</td>
                      <td className="p-2 text-center font-medium">{order.piecesReceived} قطعة</td>
                      <td className="p-2 text-center font-bold text-green-700">{order.totalManufacturingCost?.toFixed(2)} ج.م</td>
                      <td className="p-2 text-center">{new Date(order.receivedDate).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* تفاصيل أوامر الغسيل */}
        {washingOrders.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold mb-3">تفاصيل أوامر الغسيل المكتملة</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-center p-2">رقم الأمر</th>
                    <th className="text-right p-2">المغسلة</th>
                    <th className="text-center p-2">القطع المغسولة</th>
                    <th className="text-center p-2">التكلفة/قطعة</th>
                    <th className="text-center p-2">إجمالي التكلفة</th>
                    <th className="text-center p-2">تاريخ الاستلام</th>
                  </tr>
                </thead>
                <tbody>
                  {washingOrders.map(order => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-center font-mono">#{order.orderNumber}</td>
                      <td className="p-2">{order.supplier?.name}</td>
                      <td className="p-2 text-center font-medium">{order.piecesReceived} قطعة</td>
                      <td className="p-2 text-center">{order.washingCostPerPiece?.toFixed(2)} ج.م</td>
                      <td className="p-2 text-center font-bold text-purple-700">{order.totalWashingCost?.toFixed(2)} ج.م</td>
                      <td className="p-2 text-center">{new Date(order.receivedDate).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* قسم فواتير المكتب/المخزن الرئيسي */}
      {officeInvoices && (officeInvoices.totalInvoices > 0 || officeInvoicesTotalSales > 0) && (
        <div className="card mt-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            فواتير المكتب (المخزن الرئيسي)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">إجمالي المبيعات</p>
              <p className="text-xl font-bold text-blue-700">{officeInvoicesTotalSales.toFixed(2)} ج.م</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">الأرباح</p>
              <p className="text-xl font-bold text-green-700">{officeInvoicesProfit.toFixed(2)} ج.م</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">المحصل</p>
              <p className="text-xl font-bold text-purple-700">{officeInvoicesCollected.toFixed(2)} ج.م</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">عدد الفواتير</p>
              <p className="text-xl font-bold text-orange-700">{officeInvoices.totalInvoices}</p>
            </div>
          </div>

          {/* تحليل حسب النوع */}
          {officeInvoices.byType && (
            <div className="mt-4">
              <h3 className="font-bold mb-3">تحليل حسب النوع</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* زبائن عاديين */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🛒</span>
                    <h4 className="font-bold text-blue-900">زبائن عاديين</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between pb-1 border-b">
                      <span className="text-gray-600">العدد:</span>
                      <span className="font-medium">{officeInvoices.byType.regular?.count || 0} فاتورة</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-600">التكلفة:</span>
                      <span className="font-medium text-gray-700">
                        {((officeInvoices.byType.regular?.sales || 0) - (officeInvoices.byType.regular?.profit || 0)).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between pb-1 border-b">
                      <span className="text-gray-600">المبيعات:</span>
                      <span className="font-bold text-blue-700">{(officeInvoices.byType.regular?.sales || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pb-1 bg-green-50 px-2 py-1 rounded">
                      <span className="text-gray-600">الربح:</span>
                      <span className="font-bold text-green-700">{(officeInvoices.byType.regular?.profit || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-gray-300 mb-2"></div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-600">المحصل:</span>
                      <span className="font-medium text-green-600">{(officeInvoices.byType.regular?.collected || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-600">المتبقي:</span>
                      <span className="font-medium text-orange-600">
                        {((officeInvoices.byType.regular?.sales || 0) - (officeInvoices.byType.regular?.collected || 0)).toFixed(2)} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* شحنات */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📦</span>
                    <h4 className="font-bold text-purple-900">شحنات</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between pb-1 border-b">
                      <span className="text-gray-600">العدد:</span>
                      <span className="font-medium">{officeInvoices.byType.shipment?.count || 0} شحنة</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-600">التكلفة:</span>
                      <span className="font-medium text-gray-700">
                        {((officeInvoices.byType.shipment?.sales || 0) - (officeInvoices.byType.shipment?.profit || 0)).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between pb-1 border-b">
                      <span className="text-gray-600">المبيعات:</span>
                      <span className="font-bold text-purple-700">{(officeInvoices.byType.shipment?.sales || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pb-1 bg-green-50 px-2 py-1 rounded">
                      <span className="text-gray-600">الربح:</span>
                      <span className="font-bold text-green-700">{(officeInvoices.byType.shipment?.profit || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-gray-300 mb-2"></div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-600">المحصل:</span>
                      <span className="font-medium text-green-600">{(officeInvoices.byType.shipment?.collected || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-600">المتبقي:</span>
                      <span className="font-medium text-orange-600">
                        {((officeInvoices.byType.shipment?.sales || 0) - (officeInvoices.byType.shipment?.collected || 0)).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-gray-600 text-xs">تم التسليم:</span>
                      <span className="font-medium text-blue-600 text-xs">{officeInvoices.byType.shipment?.delivered || 0} من {officeInvoices.byType.shipment?.count || 0}</span>
                    </div>
                  </div>
                </div>

                {/* عملاء */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-teal-50 to-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">👤</span>
                    <h4 className="font-bold text-teal-900">عملاء دائمين</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between pb-1 border-b">
                      <span className="text-gray-600">العدد:</span>
                      <span className="font-medium">{officeInvoices.byType.client?.count || 0} فاتورة</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-600">التكلفة:</span>
                      <span className="font-medium text-gray-700">
                        {((officeInvoices.byType.client?.sales || 0) - (officeInvoices.byType.client?.profit || 0)).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between pb-1 border-b">
                      <span className="text-gray-600">المبيعات:</span>
                      <span className="font-bold text-teal-700">{(officeInvoices.byType.client?.sales || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pb-1 bg-green-50 px-2 py-1 rounded">
                      <span className="text-gray-600">الربح:</span>
                      <span className="font-bold text-green-700">{(officeInvoices.byType.client?.profit || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pb-1 border-b border-gray-300 mb-2"></div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-600">المحصل:</span>
                      <span className="font-medium text-green-600">{(officeInvoices.byType.client?.collected || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-600">المتبقي:</span>
                      <span className="font-medium text-orange-600">
                        {((officeInvoices.byType.client?.sales || 0) - (officeInvoices.byType.client?.collected || 0)).toFixed(2)} ج.م
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* حصص الشركاء */}
      <div className="card mt-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users size={20} />
          توزيع {netProfit >= 0 ? 'الأرباح' : 'الخسائر'} على الشركاء
        </h2>
          
          {netProfit < 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm text-red-700">
              ⚠️ يوجد خسارة في هذه الفترة. سيتم توزيع الخسارة على الشركاء حسب النسب.
            </div>
          )}
          
          {partnersShare.length > 0 ? (
            <div className="space-y-3">
              {partnersShare.map((partner) => (
                <div key={partner.id} className={`border rounded-lg p-3 ${partner.isLoss ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{partner.name}</span>
                    <span className="text-sm text-gray-600">{partner.sharePercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{partner.isLoss ? 'الخسارة:' : 'الحصة:'}</span>
                    <span className={`font-bold ${partner.isLoss ? 'text-red-700' : 'text-blue-700'}`}>
                      {partner.calculatedShare >= 0 ? '+' : ''}{partner.calculatedShare.toFixed(2)} ج.م
                    </span>
                  </div>
                  {partner.capitalPaid && (
                    <div className="text-xs text-gray-500 mt-1">
                      رأس المال: {partner.capitalPaid.toFixed(2)} ج.م
                    </div>
                  )}
                </div>
              ))}
              
              <div className="border-t-2 pt-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">إجمالي حصص الشركاء:</span>
                  <span className={`font-bold ${totalPartnersShare >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {totalPartnersShare >= 0 ? '-' : '+'}{Math.abs(totalPartnersShare).toFixed(2)} ج.م
                  </span>
                </div>
                <div className={`flex justify-between items-center p-2 rounded ${remainingProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="font-bold">{remainingProfit >= 0 ? 'الربح المتبقي:' : 'الخسارة المتبقية:'}</span>
                  <span className={`font-bold ${remainingProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {remainingProfit.toFixed(2)} ج.م
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">لا يوجد شركاء مسجلين</p>
          )}
      </div>

      {/* المشتريات التفصيلية */}
      <div className="card mt-6">
        <h2 className="text-lg font-bold mb-4">تفاصيل المشتريات</h2>
        {purchasesData && purchasesData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-center p-3 text-sm">التاريخ</th>
                  <th className="text-right p-3 text-sm">المورد</th>
                  <th className="text-center p-3 text-sm">رقم الفاتورة</th>
                  <th className="text-center p-3 text-sm">الإجمالي</th>
                  <th className="text-center p-3 text-sm">المدفوع</th>
                  <th className="text-center p-3 text-sm">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {purchasesData.map((purchase) => (
                  <tr key={purchase.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-center">{new Date(purchase.purchaseDate).toLocaleDateString('ar-EG')}</td>
                    <td className="p-3 text-sm font-medium">{purchase.supplier?.name || '-'}</td>
                    <td className="p-3 text-sm font-mono text-center">{purchase.invoiceNumber}</td>
                    <td className="p-3 text-sm font-medium text-blue-700 text-center">{purchase.totalAmount.toFixed(2)}</td>
                    <td className="p-3 text-sm text-green-700 text-center">{purchase.paidAmount.toFixed(2)}</td>
                    <td className="p-3 text-sm text-red-700 text-center">{purchase.remainingAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">لا توجد مشتريات في هذه الفترة</p>
        )}
      </div>

      {/* مبيعات العملاء (فواتير الجملة) */}
      <div className="card mt-6">
        <h2 className="text-lg font-bold mb-4">مبيعات العملاء (فواتير الجملة من المخزن الرئيسي)</h2>
        {customerSales && customerSales.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-green-700">{totalCustomerSales.toFixed(2)} ج.م</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">المدفوع</p>
                <p className="text-2xl font-bold text-emerald-700">{totalCustomerSalesPaid.toFixed(2)} ج.م</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">المتبقي (ديون)</p>
                <p className="text-2xl font-bold text-orange-700">{totalCustomerSalesRemaining.toFixed(2)} ج.م</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">عدد الفواتير</p>
                <p className="text-2xl font-bold text-blue-700">{customerSalesCount}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">التكلفة</p>
                <p className="text-2xl font-bold text-red-700">{customerSalesCost.toFixed(2)} ج.م</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-center p-3 text-sm">التاريخ</th>
                    <th className="text-right p-3 text-sm">العميل</th>
                    <th className="text-center p-3 text-sm">رقم الفاتورة</th>
                    <th className="text-center p-3 text-sm">الإجمالي</th>
                    <th className="text-center p-3 text-sm">المدفوع</th>
                    <th className="text-center p-3 text-sm">المتبقي</th>
                    <th className="text-center p-3 text-sm">التكلفة</th>
                    <th className="text-center p-3 text-sm">الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {customerSales.map((sale) => {
                    const saleCost = sale.items?.reduce((sum, item) => {
                      return sum + ((item.product?.costPrice || 0) * item.quantity);
                    }, 0) || 0;
                    const saleProfit = sale.total - saleCost;
                    const amountPaid = sale.amountPaid || 0;
                    const remaining = sale.total - amountPaid;
                    
                    return (
                      <tr key={sale.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm text-center">{new Date(sale.createdAt).toLocaleDateString('ar-EG')}</td>
                        <td className="p-3 text-sm font-medium">{sale.customer?.name || sale.customerName || 'غير محدد'}</td>
                        <td className="p-3 text-sm font-mono text-center">{sale.invoiceNumber}</td>
                        <td className="p-3 text-sm font-medium text-gray-700 text-center">{sale.total.toFixed(2)}</td>
                        <td className="p-3 text-sm font-bold text-green-700 text-center">{amountPaid.toFixed(2)}</td>
                        <td className="p-3 text-sm font-bold text-orange-700 text-center">
                          {remaining > 0 ? remaining.toFixed(2) : '-'}
                        </td>
                        <td className="p-3 text-sm text-red-700 text-center">{saleCost.toFixed(2)}</td>
                        <td className="p-3 text-sm font-bold text-purple-700 text-center">{saleProfit.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td colSpan="3" className="p-3 text-sm">الإجمالي</td>
                    <td className="p-3 text-sm text-gray-700 text-center">{totalCustomerSales.toFixed(2)}</td>
                    <td className="p-3 text-sm text-green-700 text-center">{totalCustomerSalesPaid.toFixed(2)}</td>
                    <td className="p-3 text-sm text-orange-700 text-center">{totalCustomerSalesRemaining.toFixed(2)}</td>
                    <td className="p-3 text-sm text-red-700 text-center">{customerSalesCost.toFixed(2)}</td>
                    <td className="p-3 text-sm text-purple-700 text-center">{customerSalesProfit.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500 py-8">لا توجد مبيعات للعملاء في هذه الفترة</p>
        )}
      </div>

      {/* المصروفات التفصيلية */}
      <div className="card mt-6">
        <h2 className="text-lg font-bold mb-4">تفاصيل المصروفات</h2>
        {expensesData && expensesData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-center p-3 text-sm">التاريخ</th>
                  <th className="text-center p-3 text-sm">الفئة</th>
                  <th className="text-right p-3 text-sm">الوصف</th>
                  <th className="text-center p-3 text-sm">المبلغ</th>
                  <th className="text-right p-3 text-sm">الفرع</th>
                </tr>
              </thead>
              <tbody>
                {expensesData.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-center">{new Date(expense.expenseDate).toLocaleDateString('ar-EG')}</td>
                    <td className="p-3 text-sm text-center">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {expense.category}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{expense.description}</td>
                    <td className="p-3 text-sm font-medium text-red-700 text-center">{expense.amount.toFixed(2)}</td>
                    <td className="p-3 text-sm text-gray-600">{expense.branch?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">لا توجد مصروفات في هذه الفترة</p>
        )}
      </div>

      {/* تحليل الفروع */}
      <div className="card mt-6">
        <h2 className="text-lg font-bold mb-4">تحليل الفروع (التوريدات والمبيعات)</h2>
        {branchTransfers && branchTransfers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-3 text-sm">الفرع</th>
                  <th className="text-center p-3 text-sm">قيمة التوريدات</th>
                  <th className="text-center p-3 text-sm">عدد المبيعات</th>
                  <th className="text-center p-3 text-sm">الإيرادات</th>
                  <th className="text-center p-3 text-sm">تكلفة المرتجعات</th>
                  <th className="text-center p-3 text-sm">تكلفة المبيعات</th>
                  <th className="text-center p-3 text-sm">المكسب</th>
                  <th className="text-center p-3 text-sm">رصيد الخزنة</th>
                </tr>
              </thead>
              <tbody>
                {branchTransfers.map((item) => {
                  // حساب المرتجعات للفرع
                  const branchReturns = returnsData.filter(r => r.branchId === item.branch.id);
                  const branchReturnsCost = branchReturns.reduce((sum, r) => sum + (r.totalCostAmount || 0), 0);
                  
                  return (
                    <tr key={item.branch.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm font-medium">{item.branch.name}</td>
                      <td className="p-3 text-sm text-blue-700 text-center">{item.totalTransferred.toFixed(2)}</td>
                      <td className="p-3 text-sm text-center">{item.salesCount}</td>
                      <td className="p-3 text-sm font-medium text-green-700 text-center">{item.revenue.toFixed(2)}</td>
                      <td className="p-3 text-sm text-orange-700 text-center">
                        {branchReturnsCost > 0 ? branchReturnsCost.toFixed(2) : '-'}
                      </td>
                      <td className="p-3 text-sm text-red-700 text-center">{item.costOfSales.toFixed(2)}</td>
                      <td className={`p-3 text-sm font-bold text-center ${item.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(2)}
                      </td>
                      <td className="p-3 text-sm font-medium text-center">{item.vaultBalance.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td className="p-3 text-sm">الإجمالي</td>
                  <td className="p-3 text-sm text-blue-700 text-center">
                    {branchTransfers.reduce((sum, item) => sum + item.totalTransferred, 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-center">
                    {branchTransfers.reduce((sum, item) => sum + item.salesCount, 0)}
                  </td>
                  <td className="p-3 text-sm text-green-700 text-center">
                    {branchTransfers.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-orange-700 text-center">
                    {totalReturnsCost.toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-red-700 text-center">
                    {branchTransfers.reduce((sum, item) => sum + item.costOfSales, 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-green-700 text-center">
                    {branchTransfers.reduce((sum, item) => sum + item.profit, 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-center">
                    {branchTransfers.reduce((sum, item) => sum + item.vaultBalance, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <p>💡 <strong>التفسير:</strong></p>
              <p className="mt-1">• <strong>قيمة التوريدات:</strong> قيمة البضاعة المحولة للفرع (بسعر التكلفة)</p>
              <p>• <strong>الإيرادات:</strong> إجمالي مبيعات الفرع</p>
              <p>• <strong>المكسب:</strong> الإيرادات - تكلفة البضاعة المباعة</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">لا توجد بيانات للفروع</p>
        )}
      </div>

      {/* زر الطباعة */}
      <div className="flex justify-center mt-6 print:hidden">
        <button
          onClick={handlePrint}
          className="btn-primary px-8 py-3 flex items-center gap-2"
        >
          <FileText size={20} />
          طباعة التقرير
        </button>
      </div>
      </div>
    </div>
  );
}
