import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-caramel/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-berry/10 blur-[120px]" />
      
      <div className="w-full max-w-md z-10 relative">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2 tracking-tight">B2B Wholesale Portal</h1>
          <p className="text-text-secondary text-sm">Manage your retail orders and inventory</p>
        </div>
        <div className="glass-card p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
