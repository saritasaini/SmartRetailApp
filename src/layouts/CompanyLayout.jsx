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
    document.title = profile?.shop_name || 'SmartRetails';
    return () => {
      document.title = 'SmartRetails';
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
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-bg-primary pb-24 lg:pb-0">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 w-56 glass-card rounded-none border-t-0 border-b-0 border-l-0">
        <div className="p-5">
          <h1 className="text-lg font-bold text-gradient truncate" title={profile?.shop_name || 'Company Panel'}>
            {profile?.shop_name || 'Company Panel'}
          </h1>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                    ? 'bg-brand-caramel/10 text-brand-caramel border border-brand-caramel/20 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
                    : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
                  }`}
              >
                <Icon size={18} className={isActive ? 'text-brand-caramel' : ''} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border-light">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-text-secondary hover:bg-brand-caramel/10 hover:text-brand-caramel transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden lg:pl-56 pb-16 lg:pb-0">
        {/* Mobile Header */}
        <header className="lg:hidden glass-card rounded-none border-x-0 border-t-0 p-4 flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-lg font-bold text-gradient truncate flex-1 pr-2" title={profile?.shop_name || 'Company Panel'}>
            {profile?.shop_name || 'Company Panel'}
          </h1>
          <button
            onClick={handleLogout}
            className="p-2 text-text-secondary hover:text-brand-caramel rounded-lg hover:bg-brand-caramel/10 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-card rounded-none border-x-0 border-b-0 px-0 py-2 flex overflow-x-auto overflow-y-hidden scrollbar-hide snap-x z-40 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex-shrink-0 w-[20%] flex flex-col items-center gap-1 snap-start ${isActive ? 'text-brand-caramel' : 'text-text-secondary'
                }`}
            >
              <div className={`p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-brand-caramel/10' : ''}`}>
                <Icon size={22} />
              </div>
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
