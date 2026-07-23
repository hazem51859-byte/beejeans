import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Search, ShoppingCart, Trash2 } from 'lucide-react';
import { productAPI, saleAPI, shiftAPI } from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export default function POS() {
  const { user } = useAuthStore();
  const { items, addItem, removeItem, clearCart, getTotal, getSubtotal, getTotalTax } = useCartStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [cardConfirmed, setCardConfirmed] = useState(false);
  const [cardDestination, setCardDestination] = useState('BRANCH'); // 'BRANCH' or 'MAIN'
  const [showCardConfirm, setShowCardConfirm] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showSizeDetails, setShowSizeDetails] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);
  const [itemSizes, setItemSizes] = useState([]);

  // Get current shift (only for non-admin users)
  const { data: shiftData } = useQuery({
    queryKey: ['current-shift'],
    queryFn: shiftAPI.getCurrent,
    enabled: user?.role !== 'ADMIN', // Don't fetch for admin users
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (shiftData?.data?.data) {
      setCurrentShift(shiftData.data.data);
    }
  }, [shiftData]);

  // Get all available products for the branch
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['branch-products', user?.branchId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/inventory/branch/${user?.branchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      // Transform inventory to product format
      return { 
        data: { 
          data: (data.data || []).map(inv => ({
            ...inv.product,
            availableQty: inv.quantity
          }))
        } 
      };
    },
    enabled: !!user?.branchId,
  });

  // Get branch inventory to show available quantities
  const { data: inventoryData } = useQuery({
    queryKey: ['branch-inventory', user?.branchId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/inventory/branch/${user?.branchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.json();
    },
    enabled: !!user?.branchId,
  });

  const inventory = inventoryData?.data || [];
  const products = productsData?.data?.data || [];
  
  // Auto-add product when exact barcode/SKU match is found
  useEffect(() => {
    if (searchQuery.length > 0 && products.length > 0 && !loadingProducts) {
      // Check for exact barcode or SKU match
      const exactMatch = products.find(p => 
        p.barcode === searchQuery || 
        p.sku === searchQuery ||
        p.sku?.toLowerCase() === searchQuery.toLowerCase()
      );
      
      if (exactMatch) {
        // Auto-add the product
        handleAddProduct(exactMatch);
        // Note: handleAddProduct already clears searchQuery
      }
    }
  }, [searchQuery]); // Only depend on searchQuery to avoid loops
  
  // Filter products based on search
  const filteredProducts = searchQuery.length >= 2
    ? products.filter(p => 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.includes(searchQuery)
      )
    : [];

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: saleAPI.create,
    onSuccess: (response) => {
      toast.success('تم إتمام البيع بنجاح!');
      clearCart();
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      
      // Print invoice (optional)
      if (window.confirm('هل تريد طباعة الفاتورة؟')) {
        printInvoice(response.data.data);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل في إتمام البيع');
    },
  });

  const handleAddProduct = (product) => {
    // Check available quantity in inventory
    const availableQty = product.availableQty || 0;
    
    if (availableQty <= 0) {
      toast.error('هذا المنتج غير متوفر في المخزون');
      return;
    }
    
    // Check total quantity in cart (all sizes)
    const totalQtyInCart = items
      .filter(item => item.id === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQtyInCart >= availableQty) {
      toast.error(`الكمية المتاحة: ${availableQty} فقط`);
      return;
    }
    
    // Always add as new item - let user choose size independently
    const uniqueId = `${product.id}_${Date.now()}_${Math.random()}`;
    addItem({
      ...product,
      cartItemId: uniqueId,
      quantity: 1,
      selectedSize: '' // Will be selected after adding
    });
    
    setSearchQuery('');
    toast.success(`تم إضافة ${product.name}`);
  };

  const openSizeDetails = (item) => {
    const uniqueKey = item.cartItemId || item.id;
    setSelectedItemForDetails(uniqueKey);
    
    // Initialize sizes array with current quantity
    const sizes = Array(item.quantity).fill('').map((_, index) => ({
      index,
      size: item.selectedSize || ''
    }));
    setItemSizes(sizes);
    setShowSizeDetails(true);
  };

  const saveSizeDetails = () => {
    if (!selectedItemForDetails) return;
    
    // Check all sizes are selected
    const allSelected = itemSizes.every(s => s.size);
    if (!allSelected) {
      toast.error('اختر المقاس لجميع القطع');
      return;
    }
    
    // Group by size
    const sizeGroups = {};
    itemSizes.forEach(item => {
      if (!sizeGroups[item.size]) {
        sizeGroups[item.size] = 0;
      }
      sizeGroups[item.size]++;
    });
    
    // Remove current item and add new items by size
    const currentItem = items.find(i => (i.cartItemId || i.id) === selectedItemForDetails);
    const otherItems = items.filter(i => (i.cartItemId || i.id) !== selectedItemForDetails);
    
    const newItems = Object.entries(sizeGroups).map(([size, quantity]) => {
      // Check if this size already exists in other items
      const existingItem = otherItems.find(i => 
        i.id === currentItem.id && i.selectedSize === size
      );
      
      if (existingItem) {
        // Merge with existing
        return {
          ...existingItem,
          quantity: existingItem.quantity + quantity
        };
      } else {
        // Create new item
        return {
          ...currentItem,
          cartItemId: `${currentItem.id}_${Date.now()}_${Math.random()}`,
          selectedSize: size,
          quantity: quantity
        };
      }
    });
    
    // Merge new items with other items, avoiding duplicates
    const finalItems = [...otherItems];
    newItems.forEach(newItem => {
      const existing = finalItems.find(i => 
        i.id === newItem.id && 
        i.selectedSize === newItem.selectedSize &&
        (i.cartItemId || i.id) !== newItem.cartItemId
      );
      
      if (existing) {
        existing.quantity += newItem.quantity;
      } else {
        finalItems.push(newItem);
      }
    });
    
    useCartStore.setState({ items: finalItems });
    setShowSizeDetails(false);
    setSelectedItemForDetails(null);
    setItemSizes([]);
    toast.success('تم تحديث المقاسات');
  };

  const handleCompleteSale = () => {
    if (!currentShift) {
      toast.error('يجب فتح شيفت أولاً');
      return;
    }

    if (items.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    const total = getTotal();

    // Card payment requires confirmation
    if (paymentMethod === 'CARD' && !cardConfirmed) {
      setShowCardConfirm(true);
      return;
    }

    // Cash payment requires sufficient amount
    if (paymentMethod === 'CASH') {
      const paid = parseFloat(amountPaid) || 0;
      if (paid < total) {
        toast.error('المبلغ المدفوع أقل من الإجمالي');
        return;
      }
    }

    const paid = paymentMethod === 'CARD' ? total : (parseFloat(amountPaid) || 0);

    const saleData = {
      branchId: user.branchId,
      shiftId: currentShift.id,
      items: items.map(item => {
        const itemPrice = item.customPrice !== undefined ? item.customPrice : (item.category?.defaultSellingPrice || item.sellingPrice);
        return {
          productId: item.id,
          quantity: item.quantity,
          unitPrice: itemPrice,
          ...(item.selectedSize && { size: item.selectedSize }),
          ...(item.color && { color: item.color })
        };
      }),
      paymentMethod,
      amountPaid: paid,
      ...(paymentMethod === 'CARD' && { 
        cardConfirmed: true,
        cardDestination: cardDestination 
      }),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      discountAmount: 0,
    };

    createSaleMutation.mutate(saleData);
  };

  const printInvoice = (sale) => {
    // Simple print implementation
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة ${sale.invoiceNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              max-width: 80mm;
              margin: 0 auto;
            }
            .logo {
              text-align: center;
              margin-bottom: 20px;
            }
            .logo img {
              max-width: 150px;
              height: auto;
            }
            h2 { 
              text-align: center; 
              margin: 10px 0;
              font-size: 18px;
            }
            .info {
              margin: 10px 0;
              font-size: 12px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0;
              font-size: 12px;
            }
            th, td { 
              border-bottom: 1px solid #ddd; 
              padding: 6px 4px; 
              text-align: right; 
            }
            th { 
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .totals {
              margin-top: 15px;
              font-size: 13px;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
            }
            .grand-total {
              font-weight: bold;
              font-size: 16px;
              border-top: 2px solid #000;
              padding-top: 8px;
              margin-top: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 11px;
              border-top: 1px dashed #999;
              padding-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="logo">
            <img src="/bee.jpg" alt="Bee Jeans Logo" />
          </div>
          
          <h2>Bee 🐝 JEANS</h2>
          <h2>فاتورة بيع</h2>
          
          <div class="info">
            <div><strong>رقم الفاتورة:</strong> ${sale.invoiceNumber}</div>
            <div><strong>التاريخ:</strong> ${new Date(sale.createdAt).toLocaleString('ar-EG')}</div>
            <div><strong>الكاشير:</strong> ${sale.cashier.fullName}</div>
            <div><strong>الفرع:</strong> ${sale.branch.name}</div>
            ${customerName ? `<div><strong>العميل:</strong> ${customerName}</div>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: left;">السعر</th>
                <th style="text-align: left;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>
                    ${item.product.name}
                    ${item.size ? `<br/><small style="color: #666;">📏 المقاس: ${item.size}</small>` : ''}
                    ${item.color ? `<br/><small style="color: #666;">🎨 اللون: ${item.color}</small>` : (item.product.color ? `<br/><small style="color: #666;">🎨 اللون: ${item.product.color}</small>` : '')}
                    ${item.serialNumber ? `<br/><small style="color: #999;">S/N: ${item.serialNumber}</small>` : ''}
                  </td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: left;">${item.unitPrice.toFixed(2)}</td>
                  <td style="text-align: left;">${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-line">
              <span>المجموع الفرعي:</span>
              <span>${sale.subtotal.toFixed(2)} ج.م</span>
            </div>
            <div class="total-line grand-total">
              <span>الإجمالي:</span>
              <span>${sale.total.toFixed(2)} ج.م</span>
            </div>
            <div class="total-line">
              <span>المدفوع (${sale.paymentMethod === 'CASH' ? 'كاش' : 'فيزا'}):</span>
              <span>${sale.amountPaid.toFixed(2)} ج.م</span>
            </div>
            ${sale.changeAmount > 0 ? `
              <div class="total-line">
                <span>الباقي:</span>
                <span>${sale.changeAmount.toFixed(2)} ج.م</span>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border: 1px dashed #856404; border-radius: 5px;">
              <p style="margin: 0; font-weight: bold; color: #856404; font-size: 12px; text-align: center;">
                ⚠️ شروط المرتجعات
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #856404; text-align: center; line-height: 1.6;">
                • المرتجعات خلال 14 يوم فقط من تاريخ الشراء<br/>
                • يجب إحضار الفاتورة الأصلية<br/>
                • المنتج بحالته الأصلية ولم يستخدم
              </p>
            </div>
            
            <p style="margin-top: 15px;">شكراً لتعاملكم معنا</p>
            <p style="margin-top: 10px; font-size: 10px;">تصميم وتطوير: ZoTech | 01159593961</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const total = getTotal();
  const subtotal = getSubtotal();
  const tax = getTotalTax();
  const change = parseFloat(amountPaid || 0) - total;

  return (
    <div className="h-full flex gap-4">
      {/* Left: Cart Items Display - Large Area */}
      <div className="flex-1 flex flex-col">
        <div className="card mb-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن منتج بالاسم أو الكود..."
              className="input-field pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          
          {/* Products Search Results */}
          {searchQuery.length >= 2 && (
            <div className="mt-4 max-h-60 overflow-y-auto">
              {loadingProducts ? (
                <div className="text-center py-4 text-gray-500">جاري البحث...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-4 text-gray-500">لا توجد نتائج</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="text-right p-3 border rounded-lg hover:bg-primary-50 hover:border-primary-500 transition-colors"
                    >
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {product.sku} {product.color && `• ${product.color}`}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-bold text-green-600">
                          {product.sellingPrice?.toFixed(2) || 0} ج.م
                        </span>
                        <span className={`text-xs font-medium ${
                          product.availableQty > 10 ? 'text-green-600' :
                          product.availableQty > 0 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          متاح: {product.availableQty || 0}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items - Main Display Area */}
        <div className="card flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={24} className="text-primary-600" />
              <h2 className="text-xl font-bold">المنتجات في السلة</h2>
            </div>
            <span className="text-lg font-bold text-primary-600">({items.length})</span>
          </div>

          {items.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <ShoppingCart size={80} className="mx-auto mb-4 opacity-30" />
                <p className="text-xl">السلة فارغة</p>
                <p className="text-sm mt-2">امسح السيريال لإضافة المنتجات</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const itemPrice = item.customPrice !== undefined ? item.customPrice : (item.category?.defaultSellingPrice || item.sellingPrice);
                const uniqueKey = item.cartItemId || item.id; // Use cartItemId for unique identification
                
                // Get available quantity from inventory
                const inventoryItem = inventory.find(inv => inv.productId === item.id);
                const availableQty = inventoryItem?.quantity || 0;
                
                // Parse attributes if they exist
                let attributes = {};
                try {
                  if (item.attributes && typeof item.attributes === 'string') {
                    attributes = JSON.parse(item.attributes);
                  } else if (item.attributes && typeof item.attributes === 'object') {
                    attributes = item.attributes;
                  }
                } catch (e) {
                  console.error('Failed to parse attributes:', e);
                }
                
                return (
                  <div key={uniqueKey} className="border-2 border-primary-200 rounded-lg p-4 bg-primary-50 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        {/* Display color and size */}
                        <div className="flex flex-wrap gap-2 mt-1">
                          {item.sku && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                              {item.sku}
                            </span>
                          )}
                          {item.color && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                              🎨 {item.color}
                            </span>
                          )}
                          {/* Size selector dropdown */}
                          <div className="relative">
                            <select
                              ref={(el) => {
                                // Auto-focus and open the dropdown when item is added without size
                                if (el && !item.selectedSize && el !== document.activeElement) {
                                  setTimeout(() => {
                                    el.focus();
                                    // Trigger click to open dropdown on some browsers
                                    el.click();
                                  }, 100);
                                }
                              }}
                              value={item.selectedSize || ''}
                              onChange={(e) => {
                                const selectedSize = e.target.value;
                                
                                // Check if same product with same size already exists
                                const existingWithSameSize = items.find(i => 
                                  i.id === item.id && 
                                  i.selectedSize === selectedSize && 
                                  (i.cartItemId || i.id) !== uniqueKey
                                );
                                
                                if (existingWithSameSize && selectedSize) {
                                  // Merge: combine quantities and remove current item
                                  const newQuantity = existingWithSameSize.quantity + item.quantity;
                                  const updatedItems = items
                                    .filter(i => (i.cartItemId || i.id) !== uniqueKey)
                                    .map(i => {
                                      const iKey = i.cartItemId || i.id;
                                      const existingKey = existingWithSameSize.cartItemId || existingWithSameSize.id;
                                      return iKey === existingKey ? { ...i, quantity: newQuantity } : i;
                                    });
                                  useCartStore.setState({ items: updatedItems });
                                  toast.success('تم دمج الكميات');
                                } else {
                                  // Just update size
                                  const updatedItems = items.map(i => {
                                    const iKey = i.cartItemId || i.id;
                                    return iKey === uniqueKey ? { ...i, selectedSize } : i;
                                  });
                                  useCartStore.setState({ items: updatedItems });
                                }
                              }}
                              className={`text-sm font-bold px-3 py-2 rounded border cursor-pointer min-w-[150px] ${
                                item.selectedSize 
                                  ? 'bg-orange-100 text-orange-700 border-orange-300' 
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-400 animate-pulse ring-2 ring-yellow-300'
                              }`}
                            >
                              <option value="" className="bg-white">⚠️ اختار المقاس أولاً 📏</option>
                              <option value="XS" className="bg-white">XS - Extra Small</option>
                              <option value="S" className="bg-white">S - Small</option>
                              <option value="M" className="bg-white">M - Medium</option>
                              <option value="L" className="bg-white">L - Large</option>
                              <option value="XL" className="bg-white">XL - Extra Large</option>
                              <option value="XXL" className="bg-white">XXL - 2X Large</option>
                              <option value="XXXL" className="bg-white">XXXL - 3X Large</option>
                              <option value="28" className="bg-white">28</option>
                              <option value="30" className="bg-white">30</option>
                              <option value="32" className="bg-white">32</option>
                              <option value="34" className="bg-white">34</option>
                              <option value="36" className="bg-white">36</option>
                              <option value="38" className="bg-white">38</option>
                              <option value="40" className="bg-white">40</option>
                              <option value="42" className="bg-white">42</option>
                              <option value="44" className="bg-white">44</option>
                              <option value="46" className="bg-white">46</option>
                            </select>
                          </div>
                          {Object.keys(attributes).length > 0 && 
                            Object.entries(attributes).map(([key, value]) => (
                              <span key={key} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {key}: {value}
                              </span>
                            ))
                          }
                        </div>
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">متاح: </span>
                          <span className="font-bold text-green-600">{availableQty} قطعة</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(uniqueKey)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-full"
                        title="حذف"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {/* Quantity Control */}
                      <div className="bg-white rounded p-2">
                        <label className="text-xs text-gray-500">الكمية:</label>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                const updatedItems = items.map(i => {
                                  const iKey = i.cartItemId || i.id;
                                  return iKey === uniqueKey ? { ...i, quantity: i.quantity - 1 } : i;
                                });
                                useCartStore.setState({ items: updatedItems });
                              }
                            }}
                            className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              // Check total quantity for this product across all sizes
                              const totalQtyOtherItems = items
                                .filter(i => i.id === item.id && (i.cartItemId || i.id) !== uniqueKey)
                                .reduce((sum, i) => sum + i.quantity, 0);
                              
                              if (newQty > 0 && (newQty + totalQtyOtherItems) <= availableQty) {
                                const updatedItems = items.map(i => {
                                  const iKey = i.cartItemId || i.id;
                                  return iKey === uniqueKey ? { ...i, quantity: newQty } : i;
                                });
                                useCartStore.setState({ items: updatedItems });
                              } else if ((newQty + totalQtyOtherItems) > availableQty) {
                                toast.error(`الكمية المتاحة: ${availableQty} فقط`);
                              }
                            }}
                            className="w-16 text-center text-lg font-bold border rounded px-2 py-1"
                            min="1"
                            max={availableQty}
                          />
                          <button
                            onClick={() => {
                              // Check total quantity for this product across all sizes
                              const totalQtyAllItems = items
                                .filter(i => i.id === item.id)
                                .reduce((sum, i) => sum + i.quantity, 0);
                              
                              if (totalQtyAllItems < availableQty) {
                                const updatedItems = items.map(i => {
                                  const iKey = i.cartItemId || i.id;
                                  return iKey === uniqueKey ? { ...i, quantity: i.quantity + 1 } : i;
                                });
                                useCartStore.setState({ items: updatedItems });
                              } else {
                                toast.error(`الكمية المتاحة: ${availableQty} فقط`);
                              }
                            }}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1 rounded font-bold"
                          >
                            +
                          </button>
                          
                          {/* Details Button - Show if quantity > 1 */}
                          {item.quantity > 1 && (
                            <button
                              onClick={() => openSizeDetails(item)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold"
                              title="تفاصيل المقاسات"
                            >
                              📏 تفاصيل
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Price */}
                      {user?.role === 'ADMIN' ? (
                        <div className="bg-white rounded p-2">
                          <label className="text-xs text-gray-500">السعر:</label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              value={itemPrice}
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                const updatedItems = items.map(i => {
                                  const iKey = i.cartItemId || i.id;
                                  return iKey === uniqueKey ? { ...i, customPrice: newPrice } : i;
                                });
                                useCartStore.setState({ items: updatedItems });
                              }}
                              className="w-full text-lg font-bold border rounded px-3 py-2"
                              min="0"
                              step="0.01"
                            />
                            <span className="text-sm text-gray-500">ج.م</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-100 rounded p-2 text-center">
                          <div className="text-xs text-gray-600">السعر × الكمية</div>
                          <span className="text-2xl font-bold text-green-700">
                            {(itemPrice * item.quantity).toFixed(2)} ج.م
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Payment Summary - Compact */}
      <div className="w-80 flex flex-col">
        {/* Current Shift Info */}
        {currentShift ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium">✅ الشيفت مفتوح</p>
            <p className="text-xs text-gray-600">رقم: {currentShift.shiftNumber}</p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-red-700">⚠️ لا يوجد شيفت مفتوح</p>
          </div>
        )}

        {/* Payment Section */}
        <div className="card flex-1 overflow-auto">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">ملخص الفاتورة</h3>
          
          <div className="space-y-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">عدد المنتجات:</span>
                <span className="font-bold">{items.length}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">المجموع الفرعي:</span>
                <span className="font-medium">{subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                <span>الإجمالي:</span>
                <span className="text-primary-600">{total.toFixed(2)} ج.م</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">طريقة الدفع</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setCardConfirmed(false);
                  if (e.target.value === 'CARD') {
                    setAmountPaid(total.toString());
                  }
                }}
                className="input-field"
              >
                <option value="CASH">نقدي 💵</option>
                <option value="CARD">بطاقة (فيزا) 💳</option>
                <option value="CREDIT">آجل 📋</option>
              </select>
            </div>

            {paymentMethod === 'CASH' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">المبلغ المدفوع</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="input-field text-lg font-bold"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                {change >= 0 && amountPaid && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">الباقي:</span>
                      <span className="text-xl font-bold text-green-700">{change.toFixed(2)} ج.م</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {paymentMethod === 'CARD' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-medium">💳 الدفع بالفيزا</p>
                <p className="text-xs text-blue-600 mt-1">المبلغ: {total.toFixed(2)} ج.م</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">اسم العميل (اختياري)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-field"
                placeholder="اسم العميل"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">رقم الهاتف (اختياري)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="input-field"
                placeholder="01XXXXXXXXX"
              />
            </div>

            <button
              onClick={handleCompleteSale}
              disabled={items.length === 0 || !currentShift || createSaleMutation.isPending}
              className="w-full btn-primary text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createSaleMutation.isPending ? 'جاري الحفظ...' : 
               paymentMethod === 'CARD' ? 'تأكيد دفع الفيزا' : 'إتمام البيع ✓'}
            </button>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="w-full btn-secondary"
              >
                مسح السلة 🗑️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card Payment Confirmation Modal */}
      {showCardConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-center">تأكيد دفع الفيزا</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-center text-lg font-bold text-blue-800">
                {total.toFixed(2)} جنيه
              </p>
              <p className="text-center text-sm text-blue-600 mt-2">
                هل تم دفع المبلغ بالفعل بالفيزا؟
              </p>
            </div>
            
            {/* Card Destination Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وجهة الفيزا
              </label>
              <select
                value={cardDestination}
                onChange={(e) => setCardDestination(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="BRANCH">فيزا الفرع 🏪</option>
                <option value="MAIN">فيزا المخزن الرئيسي 🏭</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {cardDestination === 'BRANCH' 
                  ? 'الأموال ستذهب لخزنة الفرع (رصيد الفيزا)' 
                  : 'الأموال ستذهب مباشرة للمخزن الرئيسي'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setCardConfirmed(true);
                  setShowCardConfirm(false);
                  // Re-trigger sale with confirmation
                  setTimeout(() => handleCompleteSale(), 100);
                }}
                className="w-full btn-primary"
              >
                نعم، تم الدفع
              </button>
              <button
                onClick={() => {
                  setShowCardConfirm(false);
                  setCardConfirmed(false);
                }}
                className="w-full btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Size Details Modal */}
      {showSizeDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-center">تفاصيل المقاسات 📏</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-center text-sm text-blue-600">
                اختر المقاس لكل قطعة من الـ {itemSizes.length} قطع
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {itemSizes.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    قطعة {index + 1}
                  </label>
                  <select
                    value={item.size}
                    onChange={(e) => {
                      const newSizes = [...itemSizes];
                      newSizes[index].size = e.target.value;
                      setItemSizes(newSizes);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${
                      !item.size ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">اختر</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="XXXL">XXXL</option>
                    <option value="28">28</option>
                    <option value="30">30</option>
                    <option value="32">32</option>
                    <option value="34">34</option>
                    <option value="36">36</option>
                    <option value="38">38</option>
                    <option value="40">40</option>
                    <option value="42">42</option>
                    <option value="44">44</option>
                    <option value="46">46</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveSizeDetails}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg"
              >
                ✓ حفظ المقاسات
              </button>
              <button
                onClick={() => {
                  setShowSizeDetails(false);
                  setSelectedItemForDetails(null);
                  setItemSizes([]);
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
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
