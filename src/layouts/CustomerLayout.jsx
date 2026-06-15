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
    <div className={`min-h-screen w-full overflow-x-hidden flex flex-col bg-bg-primary pb-24 lg:pb-0 ${originalAdminProfile ? 'pt-10' : ''}`}>
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
      <header className="hidden lg:flex items-center justify-between px-8 py-4 glass-card rounded-none border-x-0 border-t-0 sticky top-0 z-30 mt-0">
        <div className="flex items-center gap-4">
          <IceCream className="text-brand-caramel" size={32} />
          <h1 className="text-2xl font-bold text-gradient tracking-tight">{companyName}</h1>
        </div>
        
        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-caramel/10 text-brand-caramel border border-brand-caramel/20 shadow-[0_0_15px_rgba(0,212,255,0.1)]' 
                    : 'text-text-secondary hover:bg-brand-glass hover:text-text-primary'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-brand-caramel' : ''} />
                <span className="font-medium text-sm">{item.name}</span>
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-brand-berry text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(255,107,157,0.5)]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          
          <div className="h-6 w-px bg-border-light mx-2"></div>
          
          <Link 
            to="/customer/profile"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              location.pathname === '/customer/profile' ? 'text-brand-caramel bg-brand-caramel/10' : 'text-text-secondary hover:text-text-primary hover:bg-brand-glass'
            }`}
          >
            <User size={18} />
            <span className="font-medium text-sm">Profile</span>
          </Link>

          <button 
            onClick={handleLogout}
            className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:bg-brand-berry/10 hover:text-brand-berry transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </nav>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-4 glass-card rounded-none border-x-0 border-t-0 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <IceCream className="text-brand-caramel" size={24} />
          <h1 className="text-lg font-bold text-gradient">{companyName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/customer/profile" className="text-text-secondary hover:text-brand-caramel transition-colors">
            <User size={22} />
          </Link>
          <button onClick={handleLogout} className="text-text-secondary hover:text-brand-berry transition-colors">
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-card rounded-none border-x-0 border-b-0 px-2 py-2 flex justify-between items-center z-40 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`relative flex flex-col items-center gap-1 ${
                isActive ? 'text-brand-caramel' : 'text-text-secondary'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-brand-caramel/10' : ''}`}>
                <Icon size={22} />
              </div>
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-berry text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
