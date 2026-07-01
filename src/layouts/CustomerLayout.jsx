import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { supabase } from '../lib/supabase';
import {
  Home,
  IceCream,
  ShoppingCart,
  ClipboardList,
  User,
  LogOut,
  Wallet
} from 'lucide-react';
import NotificationBell from '../components/ui/NotificationBell';

export default function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const signOut = useAuthStore(state => state.signOut);
  const profile = useAuthStore(state => state.profile);
  const originalAdminProfile = useAuthStore(state => state.originalAdminProfile);
  const stopImpersonating = useAuthStore(state => state.stopImpersonating);
  const cartItemsCount = useCartStore(state => state.items.reduce((acc, item) => acc + item.quantity, 0));

  const [companyName, setCompanyName] = useState('Ice Cream Catalog');

  useEffect(() => {
    async function fetchCompanyName() {
      if (profile?.company_id) {
        const { data } = await supabase
          .from('profiles')
          .select('shop_name')
          .eq('id', profile.company_id)
          .single();

        if (data?.shop_name) {
          setCompanyName(data.shop_name);
        }
      }
    }
    fetchCompanyName();
  }, [profile?.company_id]);

  useEffect(() => {
    document.title = companyName || 'SmartRetails';
    return () => {
      document.title = 'SmartRetails';
    };
  }, [companyName]);

  const navItems = [
    { name: 'Home', path: '/customer', icon: Home },
    { name: 'Catalog', path: '/customer/catalog', icon: IceCream },
    { name: 'Cart', path: '/customer/cart', icon: ShoppingCart, badge: cartItemsCount },
    { name: 'Orders', path: '/customer/orders', icon: ClipboardList },
    { name: 'Ledger', path: '/customer/payments', icon: Wallet },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className={`h-[100dvh] w-full flex flex-col bg-bg-primary overflow-hidden ${originalAdminProfile ? 'pt-2' : ''}`}>
      {originalAdminProfile && (
        <div className="fixed top-0 left-0 right-0 bg-brand-berry text-white px-4 py-2 text-sm font-bold flex justify-between items-center z-[9999] shadow-lg">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Viewing as Customer</span>
          <button
            onClick={() => {
              stopImpersonating();
              navigate('/company/customers');
            }}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors shadow-sm"
          >
            Return to Admin
          </button>
        </div>
      )}

      {/* Desktop Header */}
      <header className={`hidden min-[1281px]:flex items-center px-8 py-3 bg-white/85 backdrop-blur-md border-b border-gray-100 sticky z-50 mt-0 ${originalAdminProfile ? 'top-10' : 'top-0'}`}>
        {/* Left: Logo */}
        <div className="flex-1 flex items-center gap-3">
          <div className="bg-[#b91c1c] w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
            <IceCream className="text-white" size={22} />
          </div>
          <h1 className="text-[26px] font-bold text-[#dc2626] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{companyName}</h1>
        </div>

        {/* Center: Nav Items */}
        <nav className="flex items-center gap-2 justify-center">
          {navItems.map((item) => {
            if (item.name === 'Cart') return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] transition-all duration-200 font-semibold text-[15px] ${isActive
                    ? 'bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_4px_16px_rgba(220,38,38,0.3)]'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex-1 flex items-center justify-end gap-3">
          <NotificationBell recipientType="customer" />
          
          <Link
            to="/customer/profile"
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${location.pathname === '/customer/profile'
                ? 'bg-gradient-to-br from-red-600 to-red-800 text-white border-red-600 shadow-[0_4px_16px_rgba(220,38,38,0.3)]'
                : 'bg-white border-[#f0e6d8] text-gray-500 hover:border-red-600 hover:text-red-600'
              }`}
          >
            <User size={18} />
          </Link>

          <Link
            to="/customer/cart"
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm relative ${location.pathname === '/customer/cart'
                ? 'bg-gradient-to-br from-red-600 to-red-800 text-white border-red-600 shadow-[0_4px_16px_rgba(220,38,38,0.3)]'
                : 'bg-white border-[#f0e6d8] text-gray-500 hover:border-red-600 hover:text-red-600'
              }`}
          >
            <ShoppingCart size={18} />
            {cartItemsCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 text-[10px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm ${location.pathname === '/customer/cart'
                  ? 'bg-white text-red-600 border border-red-100'
                  : 'bg-[#dc2626] text-white'
                }`}>
                {cartItemsCount}
              </span>
            )}
          </Link>

          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full border border-[#f0e6d8] flex items-center justify-center text-gray-500 hover:border-red-600 hover:text-red-600 transition-colors bg-white shadow-sm"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className={`min-[1281px]:hidden flex items-center justify-between px-4 py-4 glass-card rounded-none border-x-0 border-t-0 sticky z-50 ${originalAdminProfile ? 'top-[36px]' : 'top-0'}`}>
        <div className="flex items-center gap-2">
          <IceCream className="text-brand-caramel" size={24} />
          <h1 className="text-lg font-bold text-gradient">{companyName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell 
            recipientType="customer" 
            buttonClassName="relative text-text-secondary hover:text-brand-caramel transition-colors" 
            iconSize={22} 
          />
          <Link to="/customer/profile" className="text-text-secondary hover:text-brand-caramel transition-colors">
            <User size={22} />
          </Link>
          <button onClick={handleLogout} className="text-text-secondary hover:text-brand-berry transition-colors">
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 min-[1281px]:p-8 min-[1281px]:pb-8">
        <Outlet context={{ companyName }} />
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="min-[1281px]:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 safe-area-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <nav className="flex justify-around items-center px-2 py-2 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-1 p-2 w-[20%] transition-colors ${
                  isActive ? 'text-red-600' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 border border-white"></span>
                  )}
                  {item.badge > 0 && !isActive && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
