import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  subscription: null,

  fetchNotifications: async (recipientId, recipientType) => {
    set({ loading: true });
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', recipientType)
        .order('created_at', { ascending: false });

      if (recipientId) {
        query = query.eq('recipient_id', recipientId);
      } else if (recipientType === 'super_admin') {
        query = query.is('recipient_id', null);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      set({
        notifications: data || [],
        unreadCount: (data || []).filter(n => !n.is_read).length,
        loading: false
      });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      set({ loading: false });
    }
  },

  markAsRead: async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      set((state) => {
        const newNotifications = state.notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        return {
          notifications: newNotifications,
          unreadCount: newNotifications.filter(n => !n.is_read).length
        };
      });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  },

  markAllAsRead: async (recipientId, recipientType) => {
    try {
      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_type', recipientType)
        .eq('is_read', false);
        
      if (recipientId) {
        query = query.eq('recipient_id', recipientId);
      } else if (recipientType === 'super_admin') {
        query = query.is('recipient_id', null);
      }

      const { error } = await query;

      if (error) throw error;

      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  },

  setupSubscription: (recipientId, recipientType) => {
    const currentSub = get().subscription;
    if (currentSub) {
      supabase.removeChannel(currentSub);
    }

    // Supabase real-time filters only support a single column.
    // If we have a specific recipientId, that's the most precise filter.
    let filter;
    if (recipientId) {
      filter = `recipient_id=eq.${recipientId}`;
    } else if (recipientType === 'super_admin') {
      filter = `recipient_id=is.null`;
    } else {
      filter = `recipient_type=eq.${recipientType}`;
    }

    const channel = supabase.channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: filter
      }, payload => {
        const newNotification = payload.new;
        set(state => {
          // Check if it already exists to avoid duplicates
          if (state.notifications.some(n => n.id === newNotification.id)) return state;
          
          // Show toast alert for new notification
          toast(newNotification.title + '\n' + newNotification.message.replace(/\\n/g, '\n'), {
            icon: '🔔',
            duration: 5000,
            position: 'top-right',
            style: {
              background: '#fff',
              color: '#333',
              border: '1px solid #f3f4f6',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              whiteSpace: 'pre-line',
            },
          });
          
          return {
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1
          };
        });
      })
      .subscribe();

    set({ subscription: channel });
  },

  cleanupSubscription: () => {
    const currentSub = get().subscription;
    if (currentSub) {
      supabase.removeChannel(currentSub);
      set({ subscription: null });
    }
  }
}));
