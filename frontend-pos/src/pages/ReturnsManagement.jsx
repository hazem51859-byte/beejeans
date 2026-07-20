import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { RotateCcw, Package, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function ReturnsManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedSerial, setSelectedSerial] = useState(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  // Get returned serials in this branch with sale info
  const { data: returnedSerials, isLoading } = useQuery({
    queryKey: ['returned-serials', user?.branchId],
    queryFn: async () => {
      // Get returned sale items with sale info
      const response = await api.get(`/sales?branchId=${user?.branchId}&all=true`);
      const sales = response.data?.data || response.data || [];
      
      // Extract returned items with return reason
      const returnedItems = [];
      sales.forEach(sale => {
        if (sale.items) {
          sale.items.forEach(item => {
            if (item.isReturned && item.serialNumber) {
              returnedItems.push({
                ...item,
                returnReason: sale.returnReason || 'غير محدد',
                invoiceNumber: sale.invoiceNumber,
                returnDate: sale.updatedAt
              });
            }
          });
        }
      });
      
      return returnedItems;
    },
    enabled: !!user?.branchId
  });

  const serials = returnedSerials || [];

  // Group by product
  const productGroups = serials.reduce((acc, item) => {
    const productId = item.productId;
    if (!acc[productId]) {
      acc[productId] = {
        product: item.product,
        items: []
      };
    }
    acc[productId].items.push(item);
    return acc;
  }, {});

  const groupedProducts = Object.values(productGroups);

  // Handle return decision
  const decisionMutation = useMutation({
    mutationFn: async ({ serialNumber, decision }) => {
      const response = await api.post('/serials/return-decision', {
        serialNumber,
        decision // 'RETURN_TO_MAIN' or 'RETURN_TO_STOCK'
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['returned-serials']);
      setShowDecisionModal(false);
      setSelectedSerial(null);
      
      if (variables.decision === 'RETURN_TO_MAIN') {
        toast.success('تم إرسال المنتج للمخزن الرئيسي - بانتظار استلام الأدمن');
      } else {
        toast.success('تم إرجاع المنتج للمخزون وهو متاح للبيع الآن');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  });

  const handleDecision = (decision) => {
    decisionMutation.mutate({
      serialNumber: selectedSerial.serialNumber,
      decision
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw size={28} />
            إدارة المرتجعات
          </h1>
          <p className="text-gray-600 mt-1">
            مراجعة المنتجات المرتجعة واتخاذ القرار بشأنها
          </p>
        </div>
        
        <div className="text-sm text-gray-600">
          <div>إجمالي المرتجعات: <span className="font-bold text-red-600">{serials.length}</span></div>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">خيارات المرتجعات:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>إرجاع للمخزن الرئيسي:</strong> المنتج يُرسل للأدمن في المخزن الرئيسي</li>
              <li><strong>إعادة للمخزون:</strong> المنتج يرجع متاح للبيع في الفرع</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">جاري التحميل...</p>
          </div>
        ) : groupedProducts.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد مرتجعات بانتظار القرار</p>
          </div>
        ) : (
          groupedProducts.map((group) => (
            <div key={group.product.id} className="card border-2 border-red-200 hover:shadow-lg transition-shadow">
              {/* Product Header */}
              <div className="flex items-start justify-between mb-3 pb-3 border-b">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{group.product.name}</h3>
                  {group.product.color && (
                    <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs mt-1">
                      🎨 {group.product.color}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary-600">
                    {group.product.sellingPrice} ج.م
                  </div>
                </div>
              </div>

              {/* Returned Serials */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-red-700 mb-2">
                  المرتجعات ({group.items.length})
                </div>
                {group.items.map(item => (
                  <div key={item.id} className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-mono text-sm font-bold text-red-900">
                        🔄 {item.serialNumber}
                      </div>
                      <div className="text-sm font-bold text-red-700">
                        {item.unitPrice?.toFixed(2)} ج.م
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {item.invoiceNumber}
                    </div>
                    
                    {/* Return Reason */}
                    <div className="bg-white p-2 rounded border border-red-300 mb-2">
                      <div className="text-xs text-red-600 font-medium mb-1">سبب الإرجاع:</div>
                      <div className="text-sm text-red-900">{item.returnReason}</div>
                    </div>
                    
                    {item.size && (
                      <div className="text-xs mb-2">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                          📏 {item.size}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSerial(item);
                        setShowDecisionModal(true);
                      }}
                      className="w-full btn-primary text-sm py-2"
                    >
                      اتخاذ قرار
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Decision Modal */}
      {showDecisionModal && selectedSerial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <RotateCcw size={24} />
              قرار المرتجع
            </h3>

            <div className="mb-6">
              <div className="bg-gray-50 p-3 rounded mb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">المنتج</div>
                    <div className="font-bold text-lg">{selectedSerial.product?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">السعر</div>
                    <div className="text-xl font-bold text-primary-600">
                      {selectedSerial.unitPrice?.toFixed(2)} ج.م
                    </div>
                  </div>
                </div>
                
                <div className="font-mono text-sm text-gray-600 mt-1">
                  السيريال: {selectedSerial.serialNumber}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  الفاتورة: {selectedSerial.invoiceNumber}
                </div>
                
                {/* Return Reason */}
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="text-xs text-red-600 font-medium mb-1">سبب الإرجاع:</div>
                  <div className="text-sm text-red-900 font-medium">{selectedSerial.returnReason}</div>
                </div>
                
                {selectedSerial.product?.color && (
                  <div className="mt-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      🎨 {selectedSerial.product.color}
                    </span>
                  </div>
                )}
                {selectedSerial.size && (
                  <div className="mt-2">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                      📏 {selectedSerial.size}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4">
                اختر ماذا تريد أن تفعل بهذا المنتج المرتجع:
              </p>

              <div className="space-y-3">
                {/* Return to Main */}
                <button
                  onClick={() => handleDecision('RETURN_TO_MAIN')}
                  disabled={decisionMutation.isPending}
                  className="w-full flex items-center gap-3 p-4 border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <Package className="text-blue-600 flex-shrink-0" size={24} />
                  <div className="text-right flex-1">
                    <div className="font-bold text-blue-900">إرجاع للمخزن الرئيسي</div>
                    <div className="text-xs text-blue-700">
                      يُرسل للأدمن - ينتظر الاستلام والموافقة
                    </div>
                  </div>
                </button>

                {/* Return to Stock */}
                <button
                  onClick={() => handleDecision('RETURN_TO_STOCK')}
                  disabled={decisionMutation.isPending}
                  className="w-full flex items-center gap-3 p-4 border-2 border-green-300 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                  <div className="text-right flex-1">
                    <div className="font-bold text-green-900">إعادة للمخزون</div>
                    <div className="text-xs text-green-700">
                      يرجع متاح للبيع في الفرع فوراً
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDecisionModal(false);
                  setSelectedSerial(null);
                }}
                disabled={decisionMutation.isPending}
                className="flex-1 btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
