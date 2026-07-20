import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  
  addItem: (product) => {
    const items = get().items;
    // Use serialNumber as unique identifier instead of product.id
    const uniqueKey = product.serialNumber || product.id;
    const existingItem = items.find(item => (item.serialNumber || item.id) === uniqueKey);
    
    // استخدام سعر البيع من الصنف لو موجود، وإلا استخدام سعر المنتج
    const sellingPrice = product.category?.defaultSellingPrice || product.sellingPrice;
    
    if (existingItem) {
      // For serial-tracked items, don't increase quantity - each serial is unique
      if (product.serialNumber) {
        console.warn('Serial already in cart:', product.serialNumber);
        return;
      }
      
      set({
        items: items.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      set({
        items: [...items, { ...product, sellingPrice, quantity: 1 }],
      });
    }
  },
  
  removeItem: (uniqueKey) => {
    set({
      items: get().items.filter(item => {
        const itemKey = item.serialNumber || item.id;
        return itemKey !== uniqueKey;
      }),
    });
  },
  
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    
    set({
      items: get().items.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ),
    });
  },
  
  updateDiscount: (productId, discount) => {
    set({
      items: get().items.map(item =>
        item.id === productId ? { ...item, discount: discount || 0 } : item
      ),
    });
  },
  
  clearCart: () => set({ items: [] }),
  
  getTotal: () => {
    const items = get().items;
    return items.reduce((total, item) => {
      const itemPrice = item.customPrice !== undefined ? item.customPrice : parseFloat(item.sellingPrice);
      const itemTotal = itemPrice * item.quantity;
      return total + itemTotal; // لا توجد خصومات
    }, 0);
  },
  
  getSubtotal: () => {
    const items = get().items;
    return items.reduce((total, item) => {
      const itemPrice = item.customPrice !== undefined ? item.customPrice : parseFloat(item.sellingPrice);
      return total + itemPrice * item.quantity;
    }, 0);
  },
  
  getTotalTax: () => {
    return 0; // لا توجد ضرائب
  },
  
  getTotalDiscount: () => {
    return 0; // لا توجد خصومات
  },
}));
