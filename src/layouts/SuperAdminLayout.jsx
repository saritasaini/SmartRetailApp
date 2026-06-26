import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

export default function SuperAdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { signOut, profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showEmails, setShowEmails] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  
  const notificationCount = notifications.filter(n => !n.is_read).length;
  const emailCount = messages.filter(m => !m.is_read).length;
  
  const notificationRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (emailRef.current && !emailRef.current.contains(event.target)) {
        setShowEmails(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchMessages();

    // Realtime subscriptions removed for non-existent tables
    return () => {
      // Cleanup if any future subscriptions are added
    };
  }, []);

  const fetchNotifications = async () => {
    // Stubbed until backend supports notifications
    setNotifications([]);
  };

  const fetchMessages = async () => {
    // Stubbed until backend supports messages
    setMessages([]);
  };

  const markAllNotificationsRead = async () => {
    setNotifications([]);
  };

  const markAllMessagesRead = async () => {
    setMessages([]);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const [counts, setCounts] = useState({
    companies: '3',
    customers: '3',
    orders: '20'
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [companiesRes, customersRes, ordersRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'company'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
          supabase.from('orders').select('*', { count: 'exact', head: true })
        ]);

        setCounts({
          companies: companiesRes.count !== null ? companiesRes.count.toString() : '3',
          customers: customersRes.count !== null ? customersRes.count.toString() : '3',
          orders: ordersRes.count !== null ? ordersRes.count.toString() : '20'
        });
      } catch (err) {
        console.error('Error fetching badge counts:', err);
      }
    };

    fetchCounts();
  }, []);

  const navItems = [
    { name: 'Dashboard', icon: 'fas fa-th-large', path: '/admin', desc: 'Monitor your B2B wholesale platform globally.' },
    { name: 'Companies', icon: 'fas fa-building', path: '/admin/companies', badge: counts.companies, desc: 'Manage your retail network and company partners.' },
    { name: 'Customers', icon: 'fas fa-users', path: '/admin/customers', badge: counts.customers, desc: 'View and manage all registered customers.' },
    { name: 'Orders', icon: 'fas fa-shopping-cart', path: '/admin/orders', badge: counts.orders, desc: 'Track and manage all platform orders.' },
    { name: 'Invoices', icon: 'fas fa-file-invoice', path: '/admin/invoices', desc: 'Manage billing and generated invoices.' },
    { name: 'Analytics', icon: 'fas fa-chart-pie', path: '/admin/analytics', desc: 'Platform growth and performance metrics.' },
    { name: 'Audit Trail', icon: 'fas fa-shield-alt', path: '/admin/audit-logs', desc: 'Monitor platform activities and security logs.' },
    { name: 'Settings', icon: 'fas fa-cog', path: '/admin/settings', desc: 'Configure platform settings and preferences.' }
  ];

  const currentNavItem = navItems.find(item => 
    location.pathname === item.path || (item.path === '/admin' && location.pathname === '/admin/')
  ) || navItems[0];

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white shadow-xl flex flex-col slide-in-left
        transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ animationDelay: '0.1s' }}>
        
        {/* Logo */}
        <div className="p-6 border-b border-border-light flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30">
              <i className="fas fa-shield-alt text-white text-lg"></i>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">Super Admin</h1>
              <p className="text-xs text-gray-400">SmartRetail App</p>
            </div>
          </div>
          <button 
            className="lg:hidden text-gray-500"
            onClick={() => setIsSidebarOpen(false)}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/admin' && location.pathname === '/admin/');
            
            return (
              <Link
                key={item.name}
                to={item.path !== '#' ? item.path : '#'}
                onClick={() => setIsSidebarOpen(false)}
                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive 
                    ? 'active text-brand-caramel bg-red-50' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-red-600'
                }`}
              >
                <i className={`${item.icon} w-5 text-center`}></i>
                {item.name}
                {item.badge && (
                  <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                <i className="fas fa-crown text-white text-xs"></i>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Pro Plan</p>
                <p className="text-xs text-gray-500">Expires in 12 days</p>
              </div>
            </div>
            <div className="w-full bg-white rounded-full h-1.5">
              <div className="bg-gradient-to-r from-red-500 to-red-600 h-1.5 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
          >
            <i className="fas fa-sign-out-alt w-5 text-center"></i>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        
        {/* Top Bar */}
        <header className="top-bar sticky top-0 z-30 px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-800"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
            <div className="hidden sm:block">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800">Super Admin <span className="gradient-text">{currentNavItem.name === 'Dashboard' ? 'Overview' : currentNavItem.name}</span></h2>
              <p className="text-sm text-gray-500 mt-1">{currentNavItem.desc}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* ========== NOTIFICATION BELL ========== */}
            <div className="relative" ref={notificationRef}>
                <button onClick={() => { setShowNotifications(!showNotifications); setShowEmails(false); }}
                    className="relative p-2.5 rounded-xl bg-white border border-gray-200 hover:border-red-300 hover:shadow-md transition-all group w-11 h-11 flex items-center justify-center">
                    <i className="fas fa-bell text-gray-400 group-hover:text-red-500 transition-colors text-lg"></i>
                    {notificationCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white notification-badge"></span>
                    )}
                </button>

                {/* Notification Dropdown */}
                <div className={`${showNotifications ? 'block dropdown-slide-in' : 'hidden'} absolute -right-28 sm:right-0 top-full mt-3 w-[280px] sm:w-80 glass-card bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 transform origin-top-right transition-all duration-200`}>
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                        <span onClick={markAllNotificationsRead} className="text-xs font-medium text-red-600 cursor-pointer hover:text-red-700">Mark all read</span>
                    </div>
                    
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-gray-500 text-sm">No notifications yet</div>
                        ) : (
                            notifications.map(notification => (
                                <div key={notification.id} onClick={() => !notification.is_read && supabase.from('notifications').update({is_read: true}).eq('id', notification.id).then(fetchNotifications)} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-red-50/30' : ''}`}>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <i className={`fas ${notification.type === 'order' ? 'fa-box' : notification.type === 'user' ? 'fa-user' : 'fa-bell'} text-red-600 text-xs`}></i>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-800 font-medium leading-snug">{notification.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(notification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                        {!notification.is_read && <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/80 text-center">
                        <button className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">View All Notifications</button>
                    </div>
                </div>
            </div>

            {/* ========== EMAIL BOX ========== */}
            <div className="relative" ref={emailRef}>
                <button onClick={() => { setShowEmails(!showEmails); setShowNotifications(false); }}
                    className="relative p-2.5 rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group w-11 h-11 flex items-center justify-center">
                    <i className="fas fa-envelope text-gray-400 group-hover:text-blue-500 transition-colors text-lg"></i>
                    {emailCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white notification-badge"></span>
                    )}
                </button>

                {/* Email Dropdown */}
                <div className={`${showEmails ? 'block dropdown-slide-in' : 'hidden'} absolute -right-16 sm:right-0 top-full mt-3 w-[280px] sm:w-80 glass-card bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 transform origin-top-right transition-all duration-200`}>
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-800">Messages</h3>
                        <span onClick={markAllMessagesRead} className="text-xs font-medium text-blue-600 cursor-pointer hover:text-blue-700">Mark all read</span>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="px-4 py-6 text-center text-gray-500 text-sm">No messages yet</div>
                        ) : (
                            messages.map(msg => (
                                <div key={msg.id} onClick={() => !msg.is_read && supabase.from('messages').update({is_read: true}).eq('id', msg.id).then(fetchMessages)} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!msg.is_read ? 'bg-blue-50/30' : ''}`}>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-blue-600 font-bold text-xs shadow-sm">
                                            {msg.sender_initials || 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-gray-800 font-medium leading-snug truncate">{msg.sender_name}</p>
                                                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <p className="text-xs font-semibold text-gray-600 mt-0.5 truncate">{msg.subject}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{msg.body}</p>
                                        </div>
                                        {!msg.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/80 text-center flex justify-between items-center">
                        <button className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"><i className="fas fa-pen mr-1"></i> Compose</button>
                        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">View All Emails</button>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-800">{profile?.shop_name || 'Admin User'}</p>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/30 cursor-pointer hover:scale-105 transition-transform">
                {profile?.shop_name ? profile.shop_name.substring(0, 2).toUpperCase() : 'AU'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
