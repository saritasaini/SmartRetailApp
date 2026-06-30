import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useLedgerStore = create((set, get) => ({
  payments: [],
  balance: { billed: 0, paid: 0, outstanding: 0 },
  loading: false,
  hasFetched: false,

  fetchLedger: async (userId, force = false) => {
    if (get().hasFetched && !force) {
      // Background fetch
      get().performFetch(userId).then(result => {
        if (result) set(result);
      });
      return;
    }

    set({ loading: true });
    const result = await get().performFetch(userId);
    if (result) {
      set({ ...result, loading: false, hasFetched: true });
    } else {
      set({ loading: false });
    }
  },

  performFetch: async (userId) => {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('customer_id', userId)
        .neq('status', 'cancelled');

      if (ordersError) throw ordersError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const totalBilled = orders?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
      const totalPaid = paymentsData
        ?.filter(p => p.status === 'verified')
        .reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      return {
        balance: {
          billed: totalBilled,
          paid: totalPaid,
          outstanding: totalBilled - totalPaid
        },
        payments: paymentsData || []
      };
    } catch (err) {
      console.error('Error fetching ledger:', err);
      return null;
    }
  },

  clearLedger: () => set({ payments: [], balance: { billed: 0, paid: 0, outstanding: 0 }, hasFetched: false, loading: false })
}));
