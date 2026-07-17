import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  
  addItem: (product) => {
    const items = get().items;
    const existingItem = items.find(item => item.id === product.id);
    
    if (existingItem) {
      set({
        items: items.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      set({
        items: [...items, { ...product, quantity: 1 }],
      });
    }
  },
  
  removeItem: (productId) => {
    set({
      items: get().items.filter(item => item.id !== productId),
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
      const itemPrice = parseFloat(item.sellingPrice) * item.quantity;
      const itemDiscount = parseFloat(item.discount || 0);
      const itemTax = (itemPrice - itemDiscount) * (parseFloat(item.taxRate || 0) / 100);
      return total + itemPrice - itemDiscount + itemTax;
    }, 0);
  },
  
  getSubtotal: () => {
    const items = get().items;
    return items.reduce((total, item) => {
      return total + parseFloat(item.sellingPrice) * item.quantity;
    }, 0);
  },
  
  getTotalTax: () => {
    const items = get().items;
    return items.reduce((total, item) => {
      const itemPrice = parseFloat(item.sellingPrice) * item.quantity;
      const itemDiscount = parseFloat(item.discount || 0);
      const itemTax = (itemPrice - itemDiscount) * (parseFloat(item.taxRate || 0) / 100);
      return total + itemTax;
    }, 0);
  },
  
  getTotalDiscount: () => {
    const items = get().items;
    return items.reduce((total, item) => {
      return total + parseFloat(item.discount || 0);
    }, 0);
  },
}));
