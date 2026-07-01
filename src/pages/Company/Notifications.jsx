import { useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Notifications({ recipientType = 'company' }) {
  const profile = useAuthStore(state => state.profile);
  const navigate = useNavigate();
  
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    setupSubscription, 
    cleanupSubscription,
    markAsRead,
    markAllAsRead
  } = useNotificationStore();

  useEffect(() => {
    if (profile?.id) {
      const effectiveId = recipientType === 'super_admin' ? null : profile.id;
      fetchNotifications(effectiveId, recipientType);
      setupSubscription(effectiveId, recipientType);
      return () => cleanupSubscription();
    }
  }, [profile?.id, recipientType]);

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.reference_type === 'order') {
      const match = notification.message.match(/#([a-zA-Z0-9]+)/);
      const orderId = match ? match[1] : '';
      const qs = orderId ? `?search=${encodeURIComponent(orderId)}` : '';
      if (recipientType === 'company') navigate(`/company/orders${qs}`);
      else navigate(`/customer/orders${qs}`);
    } else if (notification.reference_type === 'payment') {
      if (recipientType === 'company') navigate(`/company/payments`);
      else navigate(`/customer/payments`);
    } else if (notification.type === 'new_company') {
      navigate(`/admin/companies`);
    } else if (notification.type === 'offer') {
      if (recipientType === 'customer') {
        const match = notification.message.match(/on (.+?)\.$/);
        const productName = match ? match[1] : '';
        const qs = productName ? `?search=${encodeURIComponent(productName)}` : '';
        navigate(`/customer/catalog${qs}`);
      }
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={24} className="text-red-500" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated with your latest alerts and events
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button 
            onClick={() => {
              const effectiveId = recipientType === 'super_admin' ? null : profile.id;
              markAllAsRead(effectiveId, recipientType);
            }}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <Check size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Bell size={32} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">No notifications yet</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                When you get new orders, payments, or other alerts, they will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 rounded-xl transition-all cursor-pointer flex gap-4 ${
                    !notification.is_read 
                      ? 'bg-red-50/50 hover:bg-red-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      !notification.is_read ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Bell size={20} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-base ${!notification.is_read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-400 font-medium whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <p className={`text-sm ${!notification.is_read ? 'text-gray-700' : 'text-gray-500'}`}>
                      {notification.message}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="flex flex-col items-center justify-center px-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
