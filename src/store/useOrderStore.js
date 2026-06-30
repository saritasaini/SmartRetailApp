import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useOrderStore = create((set, get) => ({
  orders: [],
  loading: false,
  hasFetched: false,
  
  fetchOrders: async (userId, force = false) => {
    // If already fetched and not forcing a refresh, just trigger a background fetch without loading state
    if (get().hasFetched && !force) {
      // Background fetch to keep data fresh without blocking UI
      supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity, price_at_order, product_id,
            products (id, name, image_url, unit)
          )
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) set({ orders: data });
        });
      return;
    }
    
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity, price_at_order, product_id,
            products (id, name, image_url, unit)
          )
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ orders: data || [], loading: false, hasFetched: true });
    } catch (err) {
      console.error('Error fetching orders:', err);
      set({ loading: false });
    }
  },

  cancelOrderLocally: (orderId) => {
    set(state => ({
      orders: state.orders.map(order => 
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      )
    }));
  },

  clearOrders: () => set({ orders: [], hasFetched: false, loading: false })
}));
