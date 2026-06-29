import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle, Plus,
  FileText, Users, CheckCircle, XCircle, Clock, ArrowRight,
  Eye, Edit2, Pencil, Star, Activity, Check, X, UserPlus, ChevronRight, ShoppingBag, Banknote
} from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

/* ─── Counter animation hook ─────────────────────────── */
function useCountUp(target, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) { setValue(target); return; }
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, start, duration]);
  return value;
}

/* ─── Tilt card wrapper ───────────────────────────────── */
function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-4, 4]);

  const handleMouse = (e) => {
    const rect = ref.current.getBoundingClientRect();
    x.set(((e.clientX - rect.left) / rect.width) - 0.5);
    y.set(((e.clientY - rect.top) / rect.height) - 0.5);
  };
  const resetTilt = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1000 }}
      onMouseMove={handleMouse}
      onMouseLeave={resetTilt}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── StatCard component ──────────────────────────────── */
function StatCard({ icon, iconBg, iconColor, badgeText, badgeColor, value, prefix = '', label, sublabel, delay, started }) {
  const count = useCountUp(typeof value === 'number' ? value : 0, 1800, started);
  return (
    <TiltCard>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group"
        style={{ '--tw-shadow': '0 2px 10px rgba(0,0,0,0.02)' }}
      >
        {/* shimmer accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-red-300 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-400 rounded-t-2xl" />

        <div className="flex justify-between items-start mb-6">
          <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center ${iconColor} shadow-sm`}>
            {icon}
          </div>
          {badgeText && (
            <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>
              <TrendingUp size={10} strokeWidth={3} /> {badgeText}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-3xl font-black text-gray-800 mb-1 tracking-tight">
            {prefix}{typeof value === 'number' ? count.toLocaleString('en-IN') : value}
          </h3>
          <p className="text-sm font-semibold text-gray-500">{label}</p>
          {sublabel && <p className="text-[11px] font-medium text-gray-400 mt-1">{sublabel}</p>}
        </div>
      </motion.div>
    </TiltCard>
  );
}

/* ─── Main Dashboard ──────────────────────────────────── */
export default function CompanyDashboard() {
  const navigate = useNavigate();
  const profile = useAuthStore(state => state.profile);
  const [mounted, setMounted] = useState(false);       // for counter trigger
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalOrders: 0, deliveredOrders: 0, cancelledOrders: 0,
    pendingDeliveries: 0, outstanding: 0, revenue: 0,
    revenueGrowth: 0, orderGrowth: 0, totalProducts: 0,
    lowStockProducts: 0, pendingRequests: 0, pendingInvoices: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [orderPage, setOrderPage] = useState(1);
  const [topCustomers, setTopCustomers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [productStock, setProductStock] = useState([]);
  const [pendingRetailers, setPendingRetailers] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  /* ── Fetch ─────────────────────────────────────────── */
  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) { setLoading(false); return; }

      /* Orders */
      const { data: orders } = await supabase
        .from('orders')
        .select(`*, profiles:customer_id(shop_name), order_items(products(name))`)
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      /* Payments */
      const { data: payments } = await supabase
        .from('payments').select('*').eq('company_id', user.id);

      /* Products */
      const { data: products } = await supabase
        .from('products').select('*')
        .eq('company_id', user.id).eq('is_active', true)
        .order('stock_quantity', { ascending: true });

      /* Retailers */
      const { data: retailers } = await supabase
        .from('profiles').select('*')
        .eq('company_id', user.id).eq('role', 'customer').eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (retailers) setPendingRetailers(retailers.slice(0, 3));
      if (products) setProductStock(products.slice(0, 4));

      /* Activities */
      const acts = [];
      if (orders) {
        orders.slice(0, 2).forEach(o => {
          const isDelivered = o.status === 'delivered';
          const isShipped = ['out_for_delivery', 'shipped'].includes(o.status);
          acts.push({
            id: `ord_${o.id}`,
            action: isDelivered ? `Order #${o.id.slice(0, 6).toUpperCase()} delivered`
              : isShipped ? `Order #${o.id.slice(0, 6).toUpperCase()} shipped`
                : `New order #${o.id.slice(0, 6).toUpperCase()}`,
            details: `${o.profiles?.shop_name || 'Customer'} ${isDelivered ? 'received their order' : isShipped ? 'order dispatched' : 'placed an order'}`,
            created_at: o.created_at,
            type: isDelivered ? 'success' : 'info'
          });
        });
      }
      if (retailers?.length) {
        acts.push({
          id: `ret_${retailers[0].id}`, action: 'New retailer request',
          details: `${retailers[0].shop_name || retailers[0].owner_name} wants to join as retailer`,
          created_at: retailers[0].created_at, type: 'request'
        });
      }
      if (products) {
        const low = products.filter(p => p.stock_quantity < 50);
        if (low.length) acts.push({
          id: `stk_${low[0].id}`, action: 'Low stock alert',
          details: `${low[0].name} stock below 50 units`, created_at: new Date().toISOString(), type: 'warning'
        });
      }
      acts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentActivities(acts.slice(0, 4));
      setRecentOrders(orders || []);

      /* Stats */
      if (orders && payments) {
        const verified = payments.filter(p => p.status === 'verified');
        const pending = payments.filter(p => p.status === 'pending');
        const totalRev = orders.filter(o => o.status !== 'cancelled').reduce((a, c) => a + Number(c.total_amount), 0);
        const totalPaid = verified.reduce((a, c) => a + Number(c.amount), 0);
        const outstanding = Math.max(0, totalRev - totalPaid);
        const pendingDelivs = orders.filter(o => ['pending', 'confirmed', 'out_for_delivery', 'shipped'].includes(o.status)).length;

        const now = new Date();
        const d7 = new Date(now - 7 * 86400000);
        const d14 = new Date(now - 14 * 86400000);
        const cur7Rev = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at) >= d7).reduce((a, c) => a + Number(c.total_amount), 0);
        const prev7Rev = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at) >= d14 && new Date(o.created_at) < d7).reduce((a, c) => a + Number(c.total_amount), 0);
        const revGrowth = prev7Rev === 0 ? (cur7Rev > 0 ? 100 : 0) : +((cur7Rev - prev7Rev) / prev7Rev * 100).toFixed(1);
        const cur7Ord = orders.filter(o => new Date(o.created_at) >= d7).length;
        const prev7Ord = orders.filter(o => new Date(o.created_at) >= d14 && new Date(o.created_at) < d7).length;
        const ordGrowth = prev7Ord === 0 ? (cur7Ord > 0 ? 100 : 0) : +((cur7Ord - prev7Ord) / prev7Ord * 100).toFixed(1);

        setStats({
          totalOrders: orders.length,
          deliveredOrders: orders.filter(o => o.status === 'delivered').length,
          cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
          pendingDeliveries: pendingDelivs, revenue: totalRev, outstanding,
          revenueGrowth: revGrowth, orderGrowth: ordGrowth,
          totalProducts: products?.length || 0,
          lowStockProducts: products?.filter(p => p.stock_quantity < 50).length || 0,
          pendingRequests: retailers?.length || 0, pendingInvoices: pending.length
        });

        /* Top customers */
        const totals = {};
        orders.forEach(o => {
          if (o.status !== 'cancelled' && o.profiles?.shop_name)
            totals[o.profiles.shop_name] = (totals[o.profiles.shop_name] || 0) + Number(o.total_amount);
        });
        setTopCustomers(Object.entries(totals).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 3));

        /* Chart */
        const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0]; });
        setChartData(days.map(date => ({
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          sales: orders.filter(o => o.status !== 'cancelled' && o.created_at.startsWith(date)).reduce((a, c) => a + Number(c.total_amount), 0)
        })));
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setMounted(true), 100);
    }
  };

  /* ── Retailer actions ──────────────────────────────── */
  const handleApproveRetailer = async (id) => {
    await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    setPendingRetailers(p => p.filter(r => r.id !== id));
    setStats(s => ({ ...s, pendingRequests: s.pendingRequests - 1 }));
  };
  const handleRejectRetailer = async (id) => {
    await supabase.from('profiles').delete().eq('id', id);
    setPendingRetailers(p => p.filter(r => r.id !== id));
    setStats(s => ({ ...s, pendingRequests: s.pendingRequests - 1 }));
  };

  /* ── Helpers ───────────────────────────────────────── */
  const CustomTooltip = ({ active, payload }) =>
    active && payload?.length ? (
      <div className="bg-gray-900 text-white border-0 px-3 py-2 rounded-xl text-xs font-bold shadow-xl">
        ₹{payload[0].value.toLocaleString('en-IN')}
      </div>
    ) : null;

  const formatTimeAgo = (ds) => {
    const diff = Date.now() - new Date(ds);
    const m = Math.round(diff / 60000), h = Math.round(diff / 3600000), d = Math.round(diff / 86400000);
    if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; if (d === 1) return '1d ago'; return `${d}d ago`;
  };

  const getStatusColor = (s) => ({
    delivered: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    shipped: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
    out_for_delivery: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  }[s] || { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-500' });

  const avatarColors = ['bg-red-700', 'bg-blue-600', 'bg-amber-600', 'bg-purple-600', 'bg-emerald-600'];

  /* ── Variants ──────────────────────────────────────── */
  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { y: 24, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-red-100" />
        <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
      </div>
    </div>
  );

  return (
    <motion.div variants={container} initial="hidden" animate="visible"
      className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 bg-[#fafafa] min-h-screen"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >

      {/* ── Header ── */}
      <motion.div variants={item} className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 xl:gap-6">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-gray-900 mb-1 leading-tight whitespace-nowrap">
            Welcome back, <span className="inline-flex items-center gap-2">{profile?.shop_name || 'SmartRetail'} <span className="text-[28px]">👋</span></span>
          </h1>
          <p className="text-[13px] text-gray-500 font-medium">Here's what's happening with your business today.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 lg:gap-3 shrink-0 w-full md:w-auto">
          {[
            { to: '/company/products?action=add_product', bg: 'bg-red-500 hover:bg-red-600 shadow-red-200', Icon: Plus, label: 'Add Product' },
            { to: '/company/customers', bg: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200', Icon: UserPlus, label: 'Approve Retailers' },
            { to: '/company/payments', bg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200', Icon: FileText, label: 'Verify Payments' },
          ].map(({ to, bg, Icon, label }) => (
            <Link key={label} to={to}
              className={`${bg} text-white px-4 py-2.5 rounded-[10px] text-[13px] font-bold shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap`}
            >
              <Icon size={15} strokeWidth={2.5} /> {label}
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Primary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard delay={0.1} started={mounted} icon={<TrendingUp size={22} strokeWidth={2.5} />}
          iconBg="bg-emerald-50" iconColor="text-emerald-500"
          badgeText={stats.revenueGrowth !== 0 ? `${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%` : null}
          badgeColor="text-emerald-600 bg-emerald-50 border-emerald-100"
          prefix="₹" value={stats.revenue} label="Total Revenue"
          sublabel={`From ${stats.totalOrders - stats.cancelledOrders} successful orders`} />

        <StatCard delay={0.2} started={mounted} icon={<AlertTriangle size={22} strokeWidth={2.5} />}
          iconBg="bg-amber-50" iconColor="text-amber-500"
          prefix="₹" value={stats.outstanding} label="Outstanding"
          sublabel="Uncollected payments" />

        <StatCard delay={0.3} started={mounted} icon={<ShoppingCart size={22} strokeWidth={2.5} />}
          iconBg="bg-red-50" iconColor="text-red-500"
          badgeText={stats.orderGrowth !== 0 ? `${stats.orderGrowth > 0 ? '+' : ''}${stats.orderGrowth}%` : null}
          badgeColor="text-emerald-600 bg-emerald-50 border-emerald-100"
          value={stats.totalOrders} label="Total Orders"
          sublabel={`${stats.deliveredOrders} delivered, ${stats.cancelledOrders} cancelled`} />

        <StatCard delay={0.4} started={mounted} icon={<Package size={22} strokeWidth={2.5} />}
          iconBg="bg-orange-50" iconColor="text-orange-500"
          value={stats.pendingDeliveries} label="Pending Deliveries"
          sublabel="Orders awaiting dispatch" />
      </div>

      {/* ── Secondary strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-6 lg:mb-8">
        {[
          { icon: <Package size={18} className="text-red-500" />, bg: 'bg-red-50', color: 'text-red-500', label: `${stats.totalProducts} Products`, sub: `${stats.lowStockProducts} low stock` },
          { icon: <UserPlus size={18} className="text-blue-500" />, bg: 'bg-blue-50', color: 'text-blue-500', label: `${stats.pendingRequests} Requests`, sub: 'Retailer approvals' },
          { icon: <Banknote size={18} className="text-amber-500" />, bg: 'bg-amber-50', color: 'text-amber-500', label: `₹${stats.outstanding} Due`, sub: `${stats.pendingInvoices} pending invoices` },
          { icon: <Star size={18} fill="currentColor" className="text-purple-500" />, bg: 'bg-purple-50', color: 'text-purple-500', label: '4.8 Rating', sub: 'From 12 reviews' },
        ].map(({ icon, bg, color, label, sub }, i) => (
          <motion.div key={i} variants={item}
            className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-[12px] ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
            <div>
              <p className="text-[13px] font-bold text-gray-800 leading-tight">{label}</p>
              <p className="text-[11px] font-medium text-gray-500">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

            {/* ── Main Grid 1: Chart + Top Customers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-6 md:mb-8">
        
        {/* Revenue Chart */}
        <motion.div variants={item} className="lg:col-span-2 bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-gray-800 mb-1">Revenue Overview</h3>
              <p className="text-[12px] font-medium text-gray-500">Last 7 days performance</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[12px] font-bold text-gray-500">Revenue</span>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} tickFormatter={v => '₹' + v} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fca5a5', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="natural" dataKey="sales" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#revGrad)"
                  dot={{ r: 5, fill: '#fff', stroke: '#ef4444', strokeWidth: 2.5 }}
                  activeDot={{ r: 7, fill: '#fff', stroke: '#ef4444', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Customers */}
        <motion.div variants={item} className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[16px] font-bold text-gray-800">Top Customers</h3>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
              <TrendingUp size={14} strokeWidth={3} />
            </div>
          </div>
          <div className="space-y-4 flex-1">
            {topCustomers.length > 0 ? topCustomers.map((c, i) => (
              <motion.div key={i} whileHover={{ x: 4 }} className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${avatarColors[i]} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-800 group-hover:text-red-600 transition-colors">{c.name}</p>
                    <p className="text-[11px] text-gray-400 font-semibold">{i === 0 ? 'Top Buyer' : i === 1 ? 'Regular Buyer' : 'New Customer'}</p>
                  </div>
                </div>
                <p className="text-[13px] font-black text-emerald-500">₹{c.total.toLocaleString('en-IN')}</p>
              </motion.div>
            )) : <p className="text-[13px] text-gray-400 text-center py-4">No customers yet.</p>}
          </div>
          {topCustomers.length > 0 && (
            <div className="mt-auto pt-4 border-t border-gray-50">
              <Link to="/company/customers" className="w-full py-2.5 rounded-xl border-[1.5px] border-gray-900 text-gray-900 text-[13px] font-bold hover:bg-gray-900 hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-sm">
                View All Customers <ChevronRight size={14} strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Orders Table ── */}
      <motion.div variants={item} className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm overflow-hidden mb-6 md:mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-[16px] font-bold text-gray-800 mb-1">Recent Orders</h3>
            <p className="text-[12px] font-medium text-gray-500">Latest orders from your customers</p>
          </div>
          <Link to="/company/orders" className="text-[14px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 transition-colors">
            View All Orders <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[680px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['ORDER ID', 'CUSTOMER', 'PRODUCTS', 'AMOUNT', 'DATE', 'STATUS', 'ACTION'].map(h => (
                  <th key={h} className="pb-3 px-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.slice((orderPage - 1) * 4, orderPage * 4).length > 0 ? recentOrders.slice((orderPage - 1) * 4, orderPage * 4).map((order, idx) => {
                const sc = getStatusColor(order.status);
                const initial = order.profiles?.shop_name?.charAt(0).toUpperCase() || 'U';
                const products = (order.order_items || []).map(i => i.products?.name).filter(Boolean).slice(0, 2).join(', ') || 'Various items';
                return (
                  <motion.tr key={order.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-gray-50 border-l-[3px] border-l-transparent hover:border-l-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-white hover:translate-x-1 hover:shadow-sm transition-all duration-300 group"
                  >
                    <td className="py-4 px-2 pl-4">
                      <span className="font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg text-[11px] font-mono">
                        #ORD-{order.id.slice(0, 3).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${avatarColors[idx % avatarColors.length]} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>{initial}</div>
                        <span className="font-semibold text-gray-800 text-[13px]">{order.profiles?.shop_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-gray-500 font-medium text-[12px] max-w-[120px] truncate">{products}</td>
                    <td className="py-4 px-2 font-black text-gray-800 text-[13px]">₹{Number(order.total_amount).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-2 text-gray-500 font-medium text-[12px]">
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${sc.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${order.status === 'pending' ? 'animate-pulse' : ''}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${sc.text}`}>
                          {order.status === 'out_for_delivery' ? 'Shipped' : order.status}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => navigate('/company/orders')}
                          className="w-8 h-8 rounded-lg bg-[#fff1f2] text-[#e11d48] hover:bg-red-100 flex items-center justify-center transition-colors">
                          <Eye size={14} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => navigate('/company/orders')}
                          className="w-8 h-8 rounded-lg bg-[#f0f9ff] text-[#2563eb] hover:bg-blue-100 flex items-center justify-center transition-colors">
                          <Pencil size={14} fill="currentColor" strokeWidth={0.5} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              }) : (
                <tr><td colSpan="7" className="text-center py-10 text-gray-400 text-[13px]">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <span className="text-[12px] font-medium text-gray-500">
            Showing <strong className="text-gray-700">{Math.min(recentOrders.length, orderPage * 4)}</strong> of <strong className="text-gray-700">{stats.totalOrders}</strong> orders
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1} className="w-8 h-8 rounded-[8px] text-[13px] font-bold flex items-center justify-center transition-colors bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronRight size={14} className="rotate-180" />
            </button>
            {Array.from({ length: Math.min(3, Math.ceil(recentOrders.length / 4) || 1) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button key={pageNum} onClick={() => setOrderPage(pageNum)} className={`w-8 h-8 rounded-[8px] text-[13px] font-bold flex items-center justify-center transition-colors ${orderPage === pageNum ? 'bg-red-500 text-white shadow-md shadow-red-200' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => setOrderPage(p => Math.min(Math.ceil(recentOrders.length / 4), p + 1))} disabled={orderPage >= Math.ceil(recentOrders.length / 4)} className="w-8 h-8 rounded-[8px] text-[13px] font-bold flex items-center justify-center transition-colors bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom Grid: Retailer Requests + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 md:mb-8">
        
        {/* Retailer Requests */}
        <motion.div variants={item} className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-gray-800 mb-0.5">Retailer Requests</h3>
              <p className="text-[12px] font-medium text-gray-500">Pending approvals</p>
            </div>
            <span className="bg-amber-100 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
              {pendingRetailers.length} Pending
            </span>
          </div>
          <div className="space-y-3">
            {pendingRetailers.length > 0 ? pendingRetailers.map((r, i) => {
              const name = r.owner_name || r.shop_name || 'User';
              const initials = name.substring(0, 2).toUpperCase();
              const avatarCls = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700'][i % 3];
              return (
                <motion.div key={r.id} layout
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  whileHover={{ x: 6 }}
                  className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${avatarCls} flex items-center justify-center font-bold text-xs shrink-0`}>{initials}</div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-[13px]">{name}</h4>
                      <p className="text-[11px] text-gray-500">{r.email || 'Retailer'}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Applied {formatTimeAgo(r.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleApproveRetailer(r.id)}
                      className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all hover:scale-110">
                      <Check size={13} strokeWidth={3} />
                    </button>
                    <button onClick={() => handleRejectRetailer(r.id)}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-all hover:scale-110">
                      <X size={13} strokeWidth={3} />
                    </button>
                  </div>
                </motion.div>
              );
            }) : (
              <p className="text-[13px] text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-gray-100">No pending approvals.</p>
            )}
          </div>
          {pendingRetailers.length > 0 && (
            <div className="mt-auto pt-4 border-t border-gray-50 text-center">
              <Link to="/company/customers" className="text-[12px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wide transition-colors">
                View All Requests
              </Link>
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item} className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-gray-800 mb-0.5">Recent Activity</h3>
              <p className="text-[12px] font-medium text-gray-500">Latest updates</p>
            </div>
            <Link to="/company/logs" className="text-[12px] font-bold text-red-600 hover:text-red-700 transition-colors">View All</Link>
          </div>
          <div className="relative pl-4 space-y-5 before:content-[''] before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-gray-200 before:to-transparent">
            {recentActivities.length > 0 ? recentActivities.map((a, i) => {
              const configs = {
                success: { bg: 'bg-emerald-500', Icon: Check },
                request: { bg: 'bg-red-500', Icon: UserPlus },
                warning: { bg: 'bg-amber-500', Icon: AlertTriangle },
                info: { bg: 'bg-blue-500', Icon: Package },
              };
              const { bg, Icon } = configs[a.type] || configs.info;
              return (
                <motion.div key={a.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="relative pl-6"
                >
                  <div className={`absolute -left-[8px] top-0.5 w-[18px] h-[18px] rounded-full ${bg} ring-4 ring-white flex items-center justify-center z-10 shadow-sm`}>
                    <Icon size={10} strokeWidth={3} className="text-white" />
                  </div>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-[13px] font-bold text-gray-800 mb-0.5">{a.action}</p>
                      <p className="text-[11px] font-medium text-gray-500">{a.details}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap pt-0.5">{formatTimeAgo(a.created_at)}</span>
                  </div>
                </motion.div>
              );
            }) : <p className="text-[13px] text-gray-400 text-center py-4">No recent activity.</p>}
          </div>
        </motion.div>
      </div>

      {/* ── Product Stock ── */}
      <motion.div variants={item} className="bg-white rounded-[20px] p-6 lg:p-8 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-[18px] font-bold text-gray-800 mb-1">Product Stock</h3>
            <p className="text-[13px] text-gray-500 font-medium">Quick overview of your inventory</p>
          </div>
          <Link to="/company/products?filter=low_stock" className="text-[13px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors">
            Manage Products <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {productStock.length > 0 ? productStock.map((prod, i) => {
            const isLow = prod.stock_quantity < 50, isMed = prod.stock_quantity < 100;
            const status = isLow ? { label: 'Low', cls: 'bg-red-100 text-red-700', bar: 'bg-red-500', pct: Math.max(5, prod.stock_quantity / 50 * 100) }
              : isMed ? { label: 'Medium', cls: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', pct: Math.max(10, prod.stock_quantity / 100 * 100) }
                : { label: 'Good', cls: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', pct: Math.min(100, prod.stock_quantity / 150 * 100) };
            const icons = [<Package size={16} />, <ShoppingCart size={16} />, <Activity size={16} />, <ShoppingBag size={16} />];
            const iconCls = ['bg-amber-50 text-amber-500', 'bg-blue-50 text-blue-500', 'bg-purple-50 text-purple-500', 'bg-emerald-50 text-emerald-500'][i % 4];
            return (
              <motion.div key={prod.id} whileHover={{ y: -6, boxShadow: '0 16px 32px rgba(0,0,0,0.07)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="bg-gray-50 rounded-[16px] p-5 border border-gray-100 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-5">
                  <div className={`w-9 h-9 rounded-lg ${iconCls} flex items-center justify-center`}>{icons[i % 4]}</div>
                  <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide ${status.cls}`}>{status.label}</span>
                </div>
                <h4 className="font-bold text-gray-800 text-[14px] mb-1 truncate">{prod.name}</h4>
                <p className="text-[12px] text-gray-500 font-medium mb-4">{prod.stock_quantity} units left</p>
                <div className="h-[4px] w-full bg-gray-200 rounded-full overflow-hidden">
                  <motion.div className={`h-full ${status.bar} rounded-full`}
                    initial={{ width: 0 }} animate={{ width: `${status.pct}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            );
          }) : (
            <div className="col-span-full text-center py-10 text-gray-400 text-[14px]">No products found.</div>
          )}
        </div>
      </motion.div>

    </motion.div>
  );
}