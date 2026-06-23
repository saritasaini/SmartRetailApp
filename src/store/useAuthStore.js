import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useCartStore } from './useCartStore';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  originalAdminUser: null,
  originalAdminProfile: null,
  loading: true,

  impersonateCustomer: (customerProfile) => {
    // Clear cart before switching to prevent leakage
    useCartStore.getState().clearCart();

    set((state) => {
      const originalUser = state.originalAdminUser || state.user;
      const originalProfile = state.originalAdminProfile || state.profile;
      
      // Save to localStorage so it survives refresh
      localStorage.setItem('impersonated_customer', JSON.stringify(customerProfile));
      localStorage.setItem('original_admin_user', JSON.stringify(originalUser));
      localStorage.setItem('original_admin_profile', JSON.stringify(originalProfile));

      return {
        originalAdminUser: originalUser,
        originalAdminProfile: originalProfile,
        user: { id: customerProfile.id, email: customerProfile.email || 'impersonated@example.com' },
        profile: customerProfile
      };
    });
    
    // Fetch cart for the newly impersonated user
    useCartStore.getState().fetchCart();
  },

  stopImpersonating: () => {
    // Clear cart on return to admin
    useCartStore.getState().clearCart();

    localStorage.removeItem('impersonated_customer');
    localStorage.removeItem('original_admin_user');
    localStorage.removeItem('original_admin_profile');
    
    set((state) => {
      if (state.originalAdminProfile) {
        return {
          user: state.originalAdminUser,
          profile: state.originalAdminProfile,
          originalAdminUser: null,
          originalAdminProfile: null
        };
      }
      return state;
    });
  },

  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // Check for persisted impersonation
      const impersonatedCustomerJson = localStorage.getItem('impersonated_customer');
      if (impersonatedCustomerJson && session?.user) {
        const impersonatedCustomer = JSON.parse(impersonatedCustomerJson);
        const originalUser = JSON.parse(localStorage.getItem('original_admin_user'));
        const originalProfile = JSON.parse(localStorage.getItem('original_admin_profile'));
        
        set({
          originalAdminUser: originalUser,
          originalAdminProfile: originalProfile,
          user: { id: impersonatedCustomer.id, email: impersonatedCustomer.email },
          profile: impersonatedCustomer,
          loading: false
        });
        useCartStore.getState().fetchCart();
      } else if (session?.user && !error) {
        await get().fetchProfile(session.user);
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.warn("Supabase initialization failed (likely missing credentials). Using mock mode.", err);
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().fetchProfile(session.user);
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
  },

  fetchProfile: async (authUser) => {
    const userId = typeof authUser === 'string' ? authUser : authUser.id;
    // If we are currently impersonating, DON'T fetch the real profile and overwrite it!
    if (get().originalAdminProfile) {
      set({ loading: false });
      return;
    }

    const isNewUser = get().user?.id !== userId;
    if (isNewUser) set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) throw error;
      
      const fullUser = typeof authUser === 'object' ? authUser : { id: userId };
      set({ user: fullUser, profile: data, loading: false });
      
      // Fetch cart for logged in user
      useCartStore.getState().fetchCart();
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ user: null, profile: null, loading: false });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signUp: async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata // Contains shop_name, owner_name, phone
      }
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    useCartStore.getState().clearCart();
    await supabase.auth.signOut();
  }
}));
