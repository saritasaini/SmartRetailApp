import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { calculateOfferDetails } from '../utils/offerUtils';

export const useCartStore = create((set, get) => ({
  items: [],
  loading: false,
  
  fetchCart: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          products (
            *,
            categories (name)
          )
        `)
        .eq('customer_id', user.id);
        
      if (!error && data) {
        // Map to existing format: { product, quantity, cartItemId }
        const items = data
          .filter(item => item.products) // Fix: filter out null products
          .map(item => ({
          cartItemId: item.id,
          product: item.products,
          quantity: item.quantity
        }));
        set({ items, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
      set({ loading: false });
    }
  },

  addItem: async (product, quantity) => {
    const user = useAuthStore.getState().user;
    const items = get().items;
    const existing = items.find((i) => i.product?.id === product.id);

    // Stock & Offer check
    const currentQtyInCart = existing ? existing.quantity : 0;
    const newQty = currentQtyInCart + quantity;
    const { totalRequiredStock } = calculateOfferDetails(product, newQty);
    
    if (totalRequiredStock > product.stock_quantity) {
      throw new Error(`Insufficient stock. Only ${product.stock_quantity} left in stock (including any free items).`);
    }

    // Optimistic update
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      set({
        items: items.map((i) => 
          i.product.id === product.id ? { ...i, quantity: newQuantity } : i
        )
      });
      
      if (user && existing.cartItemId) {
        await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existing.cartItemId);
      }
    } else {
      const tempId = 'temp-' + Date.now();
      set({ items: [...items, { cartItemId: tempId, product, quantity }] });
      
      if (user) {
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            customer_id: user.id,
            product_id: product.id,
            quantity: quantity
          })
          .select('id')
          .single();
          
        if (!error && data) {
          // Update tempId with real id
          set((state) => ({
            items: state.items.map((i) => 
              i.cartItemId === tempId ? { ...i, cartItemId: data.id } : i
            )
          }));
        }
      }
    }
  },
  
  removeItem: async (productId) => {
    const user = useAuthStore.getState().user;
    const items = get().items;
    const existing = items.find((i) => i.product?.id === productId);
    
    set({
      items: items.filter((i) => i.product?.id !== productId)
    });
    
    if (user && existing && existing.cartItemId && !String(existing.cartItemId).startsWith('temp-')) {
      await supabase.from('cart_items').delete().eq('id', existing.cartItemId);
    }
  },
  
  updateQuantity: async (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    
    const user = useAuthStore.getState().user;
    const items = get().items;
    const existing = items.find((i) => i.product?.id === productId);
    
    if (existing && existing.product) {
      const { totalRequiredStock } = calculateOfferDetails(existing.product, quantity);
      if (totalRequiredStock > existing.product.stock_quantity) {
        throw new Error(`Insufficient stock. Only ${existing.product.stock_quantity} left in stock (including any free items).`);
      }
    }

    set({
      items: items.map((i) => 
        i.product?.id === productId ? { ...i, quantity } : i
      )
    });
    
    if (user && existing && existing.cartItemId && !String(existing.cartItemId).startsWith('temp-')) {
      await supabase.from('cart_items').update({ quantity }).eq('id', existing.cartItemId);
    }
  },
  
  clearCart: () => {
    // We only clear the local state, not the DB. This is used on logout.
    set({ items: [] });
  },

  emptyCartDB: async () => {
    // Clear both local state and DB (e.g. after order placement)
    const user = useAuthStore.getState().user;
    set({ items: [] });
    if (user) {
      await supabase.from('cart_items').delete().eq('customer_id', user.id);
    }
  },
  
  getTotal: () => {
    const items = get().items;
    return items.reduce((total, item) => {
      if (!item.product) return total;
      const { finalPrice } = calculateOfferDetails(item.product, item.quantity);
      return total + (finalPrice * item.quantity);
    }, 0);
  }
}));
