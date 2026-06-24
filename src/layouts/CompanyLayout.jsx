import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  FileText,
  Settings,
  LogOut
} from 'lucide-react';

export default function CompanyLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const signOut = useAuthStore(state => state.signOut);
  const profile = useAuthStore(state => state.profile);

  useEffect(() => {
    document.title = profile?.shop_name || 'Mahadev - Company Panel';
    return () => {
      document.title = 'Mahadev';
    };
  }, [profile?.shop_name]);

  const navItems = [
    { name: 'Dashboard', path: '/company', icon: LayoutDashboard },
    { name: 'Products', path: '/company/products', icon: Package },
    { name: 'Orders', path: '/company/orders', icon: ShoppingCart },
    { name: 'Customers', path: '/company/customers', icon: Users },
    { name: 'Payments', path: '/company/payments', icon: CreditCard },
    { name: 'Logs', path: '/company/logs', icon: FileText },
    { name: 'Settings', path: '/company/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50 text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="w-64 bg-white shadow-xl z-20 hidden lg:flex flex-col slide-in-left fixed inset-y-0 left-0" style={{ animationDelay: '0.1s' }}>
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          {profile?.logo_url && (
            <img src={profile.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-cover shadow-sm border border-gray-100 shrink-0 bg-white" />
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-red-600 truncate" title={profile?.shop_name || 'Mahadev'}>
              {profile?.shop_name || 'Mahadev'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Company Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'active'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-red-600 font-medium'
                }`}
              >
                <div className="w-5 text-center flex items-center justify-center">
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 text-sm font-medium transition-colors"
          >
            <div className="w-5 text-center flex items-center justify-center">
               <LogOut size={18} strokeWidth={2} />
            </div>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden lg:pl-64 pb-16 lg:pb-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            {profile?.logo_url && (
              <img src={profile.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm border border-gray-100 shrink-0 bg-white" />
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-red-600 tracking-tight truncate max-w-[200px]" title={profile?.shop_name || 'Mahadev'}>
                {profile?.shop_name || 'Mahadev'}
              </h1>
              <p className="text-[11px] font-medium text-gray-400">Company Panel</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 flex overflow-x-auto overflow-y-hidden scrollbar-hide snap-x z-40 safe-area-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex-shrink-0 w-[20%] flex flex-col items-center justify-center gap-1.5 snap-start p-2 rounded-xl transition-colors ${
                isActive ? 'text-red-600' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 border border-white"></span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
