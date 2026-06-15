import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  
  addItem: (product, quantity) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) => 
            i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
          )
        };
      }
      return { items: [...state.items, { product, quantity }] };
    });
  },
  
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId)
    }));
  },
  
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) => 
        i.product.id === productId ? { ...i, quantity } : i
      )
    }));
  },
  
  clearCart: () => set({ items: [] }),
  
  getTotal: () => {
    const items = get().items;
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }
}));
