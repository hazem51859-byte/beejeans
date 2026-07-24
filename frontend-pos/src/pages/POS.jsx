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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Right (RTL): Cart Items & Product Search Display (Takes 67% width) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5">
        {/* Modern Barcode & Product Search */}
        <div className="card border-slate-200/90 shadow-md">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={21} />
            <input
              type="text"
              placeholder="🔍 ابحث عن منتج بالاسم أو الباركود أو الكود الخاص (SKU)..."
              className="w-full px-4 py-3 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 outline-none transition-all pr-12 text-sm font-semibold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {products.length > 0 && (
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                {products.length} صنف متاح
              </span>
            )}
          </div>
          
          {/* Products Search Results Overlay */}
          {searchQuery.length >= 2 && (
            <div className="mt-4 max-h-72 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-200/70">
              {loadingProducts ? (
                <div className="text-center py-6 text-slate-400 font-medium text-sm flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                  <span>جاري البحث عن المنتجات...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 font-medium text-sm">
                  ⚠️ لا توجد نتائج مطابقة لـ "{searchQuery}"
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="text-right p-3.5 bg-white border border-slate-200/80 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">{product.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-1">
                        {product.sku} {product.color && `• ${product.color}`}
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
                        <span className="text-sm font-black text-emerald-700">
                          {product.sellingPrice?.toFixed(2) || 0} <span className="text-xs font-bold">ج.م</span>
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          product.availableQty > 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                          product.availableQty > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                          'bg-rose-50 text-rose-700 border border-rose-200/60'
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

        {/* Cart Items - Main Grid Area */}
        <div className="card flex-1 overflow-auto flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShoppingCart size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900">سلة المبيعات</h2>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-full border border-emerald-200/60">
              {items.length} قطع
            </span>
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center text-slate-400 max-w-sm">
                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <ShoppingCart size={40} />
                </div>
                <p className="text-base font-bold text-slate-600">السلة فارغة حالياً</p>
                <p className="text-xs text-slate-400 mt-1">ابحث بالاسم أو امسح الباركود لإضافة المنتجات إلى السلة</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {items.map((item) => {
                const itemPrice = item.customPrice !== undefined ? item.customPrice : (item.category?.defaultSellingPrice || item.sellingPrice);
                const uniqueKey = item.cartItemId || item.id;
                
                const inventoryItem = inventory.find(inv => inv.productId === item.id);
                const availableQty = inventoryItem?.quantity || 0;
                
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
                  <div key={uniqueKey} className="border border-slate-200/90 rounded-2xl p-4 bg-white hover:border-emerald-300 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-80"></div>
                    <div>
                      <div className="flex justify-between items-start mb-2.5 pt-1">
                        <div className="flex-1 pr-1">
                          <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {item.sku && (
                              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                                {item.sku}
                              </span>
                            )}
                            {item.color && (
                              <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md font-bold">
                                🎨 {item.color}
                              </span>
                            )}
                          </div>

                          {/* Size Selector */}
                          <div className="mt-2.5">
                            <select
                              ref={(el) => {
                                if (el && !item.selectedSize && el !== document.activeElement) {
                                  setTimeout(() => {
                                    el.focus();
                                  }, 100);
                                }
                              }}
                              value={item.selectedSize || ''}
                              onChange={(e) => {
                                const selectedSize = e.target.value;
                                const existingWithSameSize = items.find(i => 
                                  i.id === item.id && 
                                  i.selectedSize === selectedSize && 
                                  (i.cartItemId || i.id) !== uniqueKey
                                );
                                
                                if (existingWithSameSize && selectedSize) {
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
                                  const updatedItems = items.map(i => {
                                    const iKey = i.cartItemId || i.id;
                                    return iKey === uniqueKey ? { ...i, selectedSize } : i;
                                  });
                                  useCartStore.setState({ items: updatedItems });
                                }
                              }}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer w-full transition-all outline-none ${
                                item.selectedSize 
                                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                  : 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse ring-2 ring-rose-200'
                              }`}
                            >
                              <option value="" className="bg-white">⚠️ اختر المقاس 📏</option>
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
                              <span key={key} className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded mt-1 inline-block">
                                {key}: {value}
                              </span>
                            ))
                          }
                        </div>

                        <button
                          onClick={() => removeItem(uniqueKey)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-xl transition-colors"
                          title="حذف المنتج"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-100 mt-2">
                      {/* Quantity Control */}
                      <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-xl border border-slate-200/60">
                        <span className="text-xs text-slate-500 font-bold">الكمية:</span>
                        <div className="flex items-center gap-1.5">
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
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shadow-sm active:scale-95 transition-all"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
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
                            className="w-12 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg py-1 text-slate-900 outline-none"
                            min="1"
                            max={availableQty}
                          />
                          <button
                            onClick={() => {
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
                            className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shadow-sm shadow-emerald-500/20 active:scale-95 transition-all"
                          >
                            +
                          </button>
                          
                          {item.quantity > 1 && (
                            <button
                              onClick={() => openSizeDetails(item)}
                              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold px-2 py-1 rounded-lg border border-emerald-200/60 transition-colors mr-1"
                              title="تفاصيل المقاسات"
                            >
                              📏
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Price Display */}
                      {user?.role === 'ADMIN' ? (
                        <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-200/60">
                          <label className="text-[11px] font-bold text-slate-500">سعر البيع المخصص:</label>
                          <div className="flex items-center gap-1.5 mt-1">
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
                              className="w-full text-sm font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900"
                              min="0"
                              step="0.01"
                            />
                            <span className="text-xs font-bold text-slate-500">ج.م</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-2.5 text-center border border-emerald-100">
                          <span className="text-[11px] font-bold text-emerald-600 block">الإجمالي المالي</span>
                          <span className="text-xl font-black text-emerald-900">
                            {(itemPrice * item.quantity).toFixed(2)} <span className="text-xs font-bold">ج.م</span>
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

      {/* Left (RTL): Payment Summary Panel (Takes 33% width) */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
        {/* Current Shift Info Badge */}
        {currentShift ? (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <p className="text-xs font-bold text-emerald-900">الشيفت نشط ومعتمد</p>
                <p className="text-[11px] text-emerald-700 font-medium">رقم: {currentShift.shiftNumber}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center gap-2.5 shadow-sm">
            <span className="text-rose-600 text-lg">⚠️</span>
            <div>
              <p className="text-xs font-bold text-rose-900">لا يوجد شيفت مفتوح حالياً</p>
              <p className="text-[11px] text-rose-700 font-medium">يجب فتح شيفت من الإعدادات للبدء</p>
            </div>
          </div>
        )}

        {/* Payment & Invoice Summary Box */}
        <div className="card flex-1 flex flex-col justify-between border-slate-200/90 shadow-lg">
          <div>
            <h3 className="font-black text-slate-900 text-base mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>ملخص الفاتورة</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">POS v2</span>
            </h3>
            
            <div className="space-y-4 mb-4">
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 space-y-2.5">
                <div className="flex justify-between text-xs text-slate-600 font-semibold">
                  <span>عدد الأغراض:</span>
                  <span className="font-bold text-slate-900">{items.length} عناصر</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 font-semibold">
                  <span>المجموع الفرعي:</span>
                  <span className="font-bold text-slate-900">{subtotal.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200/70 pt-2.5 mt-2">
                  <span>المبلغ الإجمالي:</span>
                  <span className="text-emerald-700 text-xl tracking-tight">{total.toFixed(2)} <span className="text-xs font-bold">ج.م</span></span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setCardConfirmed(false);
                    if (e.target.value === 'CARD') {
                      setAmountPaid(total.toString());
                    }
                  }}
                  className="input-field font-bold text-slate-900 cursor-pointer"
                >
                  <option value="CASH">💵 كاش (نقدي)</option>
                  <option value="CARD">💳 بطاقة (فيزا / شبكة)</option>
                  <option value="CREDIT">📋 آجل (حساب عميل)</option>
                </select>
              </div>

              {paymentMethod === 'CASH' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">المبلغ المدفوع كاش</label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="input-field text-lg font-black text-slate-900"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  {change >= 0 && amountPaid && (
                    <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-800">المبلغ المتبقي للعميل:</span>
                      <span className="text-lg font-black text-emerald-700">{change.toFixed(2)} <span className="text-xs font-bold">ج.م</span></span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-center">
                  <p className="text-xs font-bold text-emerald-900">💳 سيتم معالجة الدفع عبر الفيزا</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">المبلغ الإجمالي المطلوب: {total.toFixed(2)} ج.م</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم العميل (اختياري)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input-field text-xs font-medium"
                  placeholder="ادخل اسم العميل"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="input-field text-xs font-medium"
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleCompleteSale}
              disabled={items.length === 0 || !currentShift || createSaleMutation.isPending}
              className="btn-primary shimmer-btn w-full text-base py-3.5 font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 rounded-xl"
            >
              {createSaleMutation.isPending ? 'جاري حفظ عملية البيع...' : 
               paymentMethod === 'CARD' ? 'تأكيد دفع الفيزا ✓' : 'إتمام عملية البيع ✓'}
            </button>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="btn-secondary w-full py-2.5 text-xs text-slate-600 hover:text-rose-600 font-bold rounded-xl"
              >
                مسح السلة بالكامل 🗑️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card Payment Confirmation Modal */}
      {showCardConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 relative overflow-hidden">
            <h2 className="text-lg font-black text-slate-900 mb-4 text-center">تأكيد عملية الدفع بالفيزا 💳</h2>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4 text-center">
              <p className="text-2xl font-black text-indigo-900">
                {total.toFixed(2)} <span className="text-sm font-bold">جنيه</span>
              </p>
              <p className="text-xs text-indigo-700 font-medium mt-1">
                هل تم تسديد المبلغ بنجاح عبر ماكينة الفيزا؟
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                توجيه الأموال الحسابي
              </label>
              <select
                value={cardDestination}
                onChange={(e) => setCardDestination(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none"
              >
                <option value="BRANCH">خزينة فيزا الفرع 🏪</option>
                <option value="MAIN">خزينة فيزا المخزن الرئيسي 🏭</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                {cardDestination === 'BRANCH' 
                  ? 'الأموال ستضاف إلى رصيد فيزا الفرع الحالي' 
                  : 'الأموال ستضاف مباشرة إلى رصيد المخزن الرئيسي'}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setCardConfirmed(true);
                  setShowCardConfirm(false);
                  setTimeout(() => handleCompleteSale(), 100);
                }}
                className="btn-primary w-full py-3 text-sm font-bold"
              >
                نعم، تم الدفع واستلام الإيصال
              </button>
              <button
                onClick={() => {
                  setShowCardConfirm(false);
                  setCardConfirmed(false);
                }}
                className="btn-secondary w-full py-2.5 text-sm font-bold"
              >
                إلغاء العملية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Size Details Modal */}
      {showSizeDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative overflow-hidden">
            <h2 className="text-lg font-black text-slate-900 mb-2 text-center">تحديد مقاسات القطع 📏</h2>
            <p className="text-xs text-slate-500 text-center mb-5">حدد المقاس المطلوب لكل قطعة من الـ {itemSizes.length} قطع المضافة</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {itemSizes.map((item, index) => (
                <div key={index} className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    القطعة رقم #{index + 1}
                  </label>
                  <select
                    value={item.size}
                    onChange={(e) => {
                      const newSizes = [...itemSizes];
                      newSizes[index].size = e.target.value;
                      setItemSizes(newSizes);
                    }}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none ${
                      !item.size ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-300 bg-white text-slate-900'
                    }`}
                  >
                    <option value="">اختر المقاس</option>
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
                className="btn-success flex-1 py-3 text-sm font-bold"
              >
                ✓ حفظ المقاسات المحددة
              </button>
              <button
                onClick={() => {
                  setShowSizeDetails(false);
                  setSelectedItemForDetails(null);
                  setItemSizes([]);
                }}
                className="btn-secondary flex-1 py-3 text-sm font-bold"
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
