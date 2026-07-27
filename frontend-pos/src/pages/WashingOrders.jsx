import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle, XCircle, Clock, DollarSign, Package } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function WashingOrders() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    supplierId: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Fetch washing orders
  const { data: washingOrders } = useQuery({
    queryKey: ['washing-orders', filters],
    queryFn: async () => {
      const params = {};
      if (filters.supplierId) params.supplierId = filters.supplierId;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await api.get('/production/washing', { params });
      return response.data;
    }
  });

  // Fetch suppliers (washing type)
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-washing'],
    queryFn: async () => {
      const response = await api.get('/suppliers', { params: { type: 'WASHING' } });
      return response.data;
    }
  });

  // Fetch completed manufacturing orders
  const { data: manufacturingOrders } = useQuery({
    queryKey: ['manufacturing-orders-completed'],
    queryFn: async () => {
      const response = await api.get('/production/manufacturing', { params: { status: 'COMPLETED' } });
      return response.data;
    }
  });

  // Fetch products from master
  const { data: productsData } = useQuery({
    queryKey: ['products-master'],
    queryFn: async () => {
      const response = await api.get('/products', { params: { status: 'ACTIVE' } });
      return response.data;
    }
  });

  // Create washing order mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/production/washing', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('تم إرسال القطع للغسيل بنجاح');
      queryClient.invalidateQueries(['washing-orders']);
      setShowCreateModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في إرسال القطع للغسيل');
    }
  });

  // Complete washing order mutation
  const completeMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/production/washing/${id}/complete`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('تم استلام القطع وإنشاء المنتج النهائي بنجاح');
      queryClient.invalidateQueries(['washing-orders']);
      queryClient.invalidateQueries(['products']);
      setShowCompleteModal(false);
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في استلام القطع');
    }
  });

  const orders = washingOrders?.data || [];
  const suppliersData = suppliers?.data || [];
  const mfgOrders = manufacturingOrders?.data || [];
  const masterProducts = productsData?.data || [];

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [washingCost, setWashingCost] = useState(0);
  const [piecesCount, setPiecesCount] = useState(0);

  // Calculate total washing cost
  const totalWashingCost = washingCost * piecesCount;
  
  // Calculate fabric cost per piece
  const fabricCostPerPiece = piecesCount > 0 && selectedOrder 
    ? ((selectedOrder.manufacturingOrder?.metersUsed || 0) * (selectedOrder.manufacturingOrder?.fabricCostPerMeter || 0)) / piecesCount 
    : 0;
    
  const mfgCostPerPiece = selectedOrder?.manufacturingOrder?.manufacturingCostPerPiece || 0;
  const totalCostPerPiece = fabricCostPerPiece + mfgCostPerPiece + washingCost;

  const handleCreateOrder = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    createMutation.mutate({
      orderNumber: formData.get('orderNumber'),
      supplierId: formData.get('supplierId'),
      manufacturingOrderId: formData.get('manufacturingOrderId'),
      piecesSent: parseInt(formData.get('piecesSent')),
      sentDate: formData.get('sentDate') || undefined,
      notes: formData.get('notes') || undefined
    });
  };

  const handleCompleteOrder = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Get selected manufacturing order for cost breakdown
    const mfgOrderId = selectedOrder.manufacturingOrderId;
    const mfgOrder = mfgOrders.find(o => o.id === mfgOrderId);
    
    completeMutation.mutate({
      id: selectedOrder.id,
      data: {
        piecesReceived: parseInt(formData.get('piecesReceived')),
        washingCostPerPiece: parseFloat(formData.get('washingCostPerPiece')),
        paidAmount: parseFloat(formData.get('paidAmount') || 0),
        receivedDate: formData.get('receivedDate') || undefined,
        productData: {
          id: selectedProduct?.id,
          sellingPrice: parseFloat(formData.get('sellingPrice')),
          color: formData.get('color') || undefined
        },
        notes: formData.get('notes') || undefined
      }
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      SENT: { label: 'قيد الغسيل', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      COMPLETED: { label: 'مكتمل', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: XCircle };
    const Icon = badge.icon;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.color}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">أوامر الغسيل</h1>
          <p className="text-gray-600">إدارة إرسال واستلام القطع من الغسيل</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          إرسال للغسيل
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">المغسلة</label>
            <select
              value={filters.supplierId}
              onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
              className="input-field"
            >
              <option value="">الكل</option>
              {suppliersData.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">الحالة</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-field"
            >
              <option value="">الكل</option>
              <option value="SENT">قيد الغسيل</option>
              <option value="COMPLETED">مكتمل</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">من تاريخ</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 gap-4">
        {orders.length > 0 ? (
          orders.map(order => (
            <div key={order.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">أمر #{order.orderNumber}</h3>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-gray-600">المغسلة:</span>
                      <p className="font-medium">{order.supplier?.name}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">أمر التصنيع:</span>
                      <p className="font-medium">#{order.manufacturingOrder?.orderNumber}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">عدد القطع المرسلة:</span>
                      <p className="font-medium">{order.piecesSent} قطعة</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">تاريخ الإرسال:</span>
                      <p className="font-medium">{new Date(order.sentDate).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>

                  {order.status === 'COMPLETED' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t">
                      <div>
                        <span className="text-gray-600">القطع المستلمة:</span>
                        <p className="font-medium text-green-700">{order.piecesReceived} قطعة</p>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">تكلفة الغسيل/قطعة:</span>
                        <p className="font-medium">{order.washingCostPerPiece?.toFixed(2)} ج.م</p>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">إجمالي التكلفة:</span>
                        <p className="font-medium text-blue-700">{order.totalWashingCost?.toFixed(2)} ج.م</p>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">المتبقي:</span>
                        <p className="font-medium text-red-700">{order.remainingAmount?.toFixed(2)} ج.م</p>
                      </div>
                    </div>
                  )}
                </div>

                {order.status === 'SENT' && (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setPiecesCount(order.piecesSent); // Initialize with sent pieces
                      setWashingCost(0);
                      setSelectedProduct(null);
                      setShowCompleteModal(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    استلام
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">لا توجد أوامر غسيل</p>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">إرسال قطع للغسيل</h2>
              
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">رقم الأمر *</label>
                    <input
                      name="orderNumber"
                      required
                      className="input-field"
                      placeholder="مثال: WASH-001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">المغسلة *</label>
                    <select name="supplierId" required className="input-field">
                      <option value="">اختر المغسلة</option>
                      {suppliersData.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">أمر التصنيع *</label>
                    <select name="manufacturingOrderId" required className="input-field">
                      <option value="">اختر أمر التصنيع</option>
                      {mfgOrders.map(order => (
                        <option key={order.id} value={order.id}>
                          #{order.orderNumber} - {order.piecesReceived} قطعة
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">عدد القطع المرسلة *</label>
                    <input
                      type="number"
                      name="piecesSent"
                      required
                      min="1"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">تاريخ الإرسال</label>
                    <input
                      type="date"
                      name="sentDate"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="input-field"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">ملاحظات</label>
                  <textarea
                    name="notes"
                    rows="3"
                    className="input-field"
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    إلغاء
                  </button>
                  <button type="submit" className="btn-primary">
                    إرسال للغسيل
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Complete Order Modal */}
      {showCompleteModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">استلام القطع من الغسيل</h2>
              
              <form onSubmit={handleCompleteOrder} className="space-y-6">
                {/* Manufacturing Order Details */}
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <h3 className="font-bold mb-3 text-blue-900">📋 معلومات أمر التصنيع</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">رقم الأمر:</span>
                      <p className="font-medium">#{selectedOrder.manufacturingOrder?.orderNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">القماش المستخدم:</span>
                      <p className="font-medium">{selectedOrder.manufacturingOrder?.metersUsed?.toFixed(2)} متر</p>
                    </div>
                    <div>
                      <span className="text-gray-600">عدد القطع المرسلة:</span>
                      <p className="font-medium">{selectedOrder.piecesSent} قطعة</p>
                    </div>
                    <div>
                      <span className="text-gray-600">نوع القماش:</span>
                      <p className="font-medium">{selectedOrder.manufacturingOrder?.fabricType?.name}</p>
                    </div>
                  </div>
                </div>
                
                {/* Washing Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">القطع المستلمة *</label>
                    <input
                      type="number"
                      name="piecesReceived"
                      required
                      min="1"
                      defaultValue={selectedOrder.piecesSent}
                      onChange={(e) => setPiecesCount(parseInt(e.target.value) || 0)}
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">تكلفة الغسيل/قطعة *</label>
                    <input
                      type="number"
                      name="washingCostPerPiece"
                      required
                      min="0"
                      step="0.01"
                      onChange={(e) => setWashingCost(parseFloat(e.target.value) || 0)}
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">إجمالي تكلفة الغسيل</label>
                    <input
                      type="text"
                      value={totalWashingCost.toFixed(2) + ' ج.م'}
                      disabled
                      className="input-field bg-gray-100 font-bold text-purple-700"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">المدفوع</label>
                    <input
                      type="number"
                      name="paidAmount"
                      min="0"
                      step="0.01"
                      defaultValue="0"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">تاريخ الاستلام</label>
                    <input
                      type="date"
                      name="receivedDate"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="input-field"
                    />
                  </div>
                </div>
                
                {/* Product Selection from Master */}
                <div className="border-t pt-4">
                  <h3 className="font-bold mb-3 text-green-900">🎯 اختيار المنتج من الأصناف (Master)</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">اختر المنتج *</label>
                    <select
                      required
                      onChange={(e) => {
                        const product = masterProducts.find(p => p.id === e.target.value);
                        setSelectedProduct(product);
                      }}
                      className="input-field"
                    >
                      <option value="">-- اختر من الأصناف --</option>
                      {masterProducts.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.barcode} - {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedProduct && (
                    <>
                      {/* Production Cost Breakdown */}
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-2 border-green-300 mb-4">
                        <h4 className="font-bold text-green-900 mb-3">💰 دورة الإنتاج الكاملة</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-white p-3 rounded">
                            <span className="text-gray-600 block mb-1">📦 تكلفة القماش</span>
                            <p className="font-bold text-blue-700">
                              {fabricCostPerPiece.toFixed(2)} ج.م/قطعة
                            </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded">
                            <span className="text-gray-600 block mb-1">⚙️ تكلفة التصنيع</span>
                            <p className="font-bold text-green-700">
                              {mfgCostPerPiece.toFixed(2)} ج.م/قطعة
                            </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded">
                            <span className="text-gray-600 block mb-1">🧼 تكلفة الغسيل</span>
                            <p className="font-bold text-purple-700">
                              {washingCost.toFixed(2)} ج.م/قطعة
                            </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border-2 border-orange-400">
                            <span className="text-gray-600 block mb-1">💵 سعر التكلفة النهائي</span>
                            <p className="font-bold text-orange-700 text-lg">
                              {totalCostPerPiece.toFixed(2)} ج.م
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Product Details (Read-only except selling price and color) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                        <div>
                          <label className="block text-sm font-medium mb-2">السيريال (Barcode)</label>
                          <input
                            type="text"
                            value={selectedProduct.barcode}
                            disabled
                            className="input-field bg-gray-200 font-mono font-bold"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">اسم المنتج</label>
                          <input
                            type="text"
                            value={selectedProduct.name}
                            disabled
                            className="input-field bg-gray-200"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">اللون *</label>
                          <input
                            type="text"
                            name="color"
                            defaultValue={selectedProduct.color || ''}
                            className="input-field"
                            placeholder="أدخل اللون"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">سعر التكلفة</label>
                          <input
                            type="text"
                            value={totalCostPerPiece.toFixed(2) + ' ج.م'}
                            disabled
                            className="input-field bg-gray-200 font-bold text-orange-700"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">سعر البيع *</label>
                          <input
                            type="number"
                            name="sellingPrice"
                            required
                            min="0"
                            step="0.01"
                            defaultValue={selectedProduct.sellingPrice || ''}
                            className="input-field font-bold text-green-700"
                            placeholder="أدخل سعر البيع"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">ملاحظات</label>
                  <textarea
                    name="notes"
                    rows="3"
                    className="input-field"
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompleteModal(false);
                      setSelectedOrder(null);
                      setSelectedProduct(null);
                      setWashingCost(0);
                      setPiecesCount(0);
                    }}
                    className="btn-secondary"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={!selectedProduct}
                  >
                    استلام وإنهاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
