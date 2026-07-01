import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Package, CreditCard, Gift, Building } from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell({ recipientType = 'customer', buttonClassName, iconSize = 18 }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  
  const profile = useAuthStore(state => state.profile);
  
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    setIsOpen(false);
    
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

  const getIcon = (type) => {
    switch(type) {
      case 'new_order':
      case 'order_update':
        return <Package size={18} className="text-blue-500" />;
      case 'payment_received':
      case 'payment_verified':
        return <CreditCard size={18} className="text-green-500" />;
      case 'offer':
        return <Gift size={18} className="text-purple-500" />;
      case 'new_company':
        return <Building size={18} className="text-amber-500" />;
      default:
        return <Bell size={18} className="text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || "relative w-10 h-10 rounded-full border border-[#f0e6d8] flex items-center justify-center text-gray-500 hover:border-red-600 hover:text-red-600 transition-colors bg-white shadow-sm"}
      >
        <Bell size={iconSize} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 text-[10px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm bg-[#dc2626] text-white border border-red-100">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 flex flex-col"
            style={{ maxHeight: '80vh' }}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <h3 className="font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={() => {
                    const effectiveId = recipientType === 'super_admin' ? null : profile.id;
                    markAllAsRead(effectiveId, recipientType);
                  }}
                  className="text-xs font-semibold text-brand-caramel hover:text-brand-caramel/80 flex items-center gap-1"
                >
                  <Check size={14} /> Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[260px] custom-scrollbar flex flex-col">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                    <Bell size={24} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">No notifications yet</p>
                  <p className="text-xs text-gray-500 mt-1">When you get updates, they'll appear here.</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-50 flex gap-3 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        !notification.is_read ? 'bg-white shadow-sm' : 'bg-gray-100'
                      }`}>
                        {getIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs mt-0.5 line-clamp-2 ${!notification.is_read ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="flex-shrink-0 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-brand-caramel shadow-sm shadow-brand-caramel/50"></div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {recipientType !== 'customer' && (
              <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    navigate(recipientType === 'company' ? '/company/notifications' : '/admin/notifications');
                  }}
                  className="text-sm font-semibold text-brand-navy hover:text-brand-caramel transition-colors"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
