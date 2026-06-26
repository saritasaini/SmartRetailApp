import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { supabase } from '../../lib/supabase';

// Animated Counter Component
const AnimatedCounter = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(target) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 2500;
    const increment = end / (duration / 16); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{count.toLocaleString('en-IN')}</span>;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    companies: 0,
    customers: 0,
    orders: 0
  });
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch Orders
      const { data: rawOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!customer_id(shop_name, owner_name)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch Profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, shop_name, owner_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const allProfiles = profiles || [];
      const companies = allProfiles.filter(p => p.role === 'company');
      const customers = allProfiles.filter(p => p.role === 'customer');

      // Map company to orders manually since direct join on company_id -> profiles is not supported
      const orders = (rawOrders || []).map(order => {
        const company = companies.find(c => c.id === order.company_id);
        return {
          ...order,
          company: company ? { shop_name: company.shop_name, owner_name: company.owner_name } : null
        };
      });

      // Calculate Stats
      const allOrders = orders || [];
      const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
      const revenue = deliveredOrders.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
      
      setStats({
        revenue,
        companies: companies.length,
        customers: customers.length,
        orders: allOrders.length
      });

      // Recent Orders Table (Top 5)
      setRecentOrders(allOrders.slice(0, 5));

      // Companies initials for bubbles
      setCompaniesList(companies.slice(0, 3));

      // Chart Data (Last 7 days revenue)
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const newChartData = last7Days.map(dateStr => {
        const dayOrders = deliveredOrders.filter(o => o.created_at.startsWith(dateStr));
        const daySales = dayOrders.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
        return {
          name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
          sales: daySales
        };
      });
      setChartData(newChartData);

      // Recent Activity (Combine latest orders and latest profiles)
      const activities = [];
      
      allOrders.slice(0, 5).forEach(o => {
        activities.push({
          type: 'order',
          title: `Order #${o.id.slice(0,8).toUpperCase()} ${o.status.replace('_', ' ')}`,
          desc: `${o.company?.shop_name || o.company?.owner_name || 'Unknown'} - ₹${o.total_amount}`,
          time: o.created_at,
          icon: o.status === 'delivered' ? 'fas fa-check' : 'fas fa-bolt',
          color: o.status === 'delivered' ? 'from-emerald-100 to-emerald-200 text-emerald-600 bg-emerald-100' : 'from-blue-100 to-blue-200 text-blue-600 bg-blue-100',
          textColor: o.status === 'delivered' ? 'text-emerald-600' : 'text-blue-600',
          bgColor: o.status === 'delivered' ? 'bg-emerald-100' : 'bg-blue-100'
        });
      });

      allProfiles.slice(0, 5).forEach(p => {
        activities.push({
          type: 'profile',
          title: `New ${p.role} registered`,
          desc: `${p.shop_name || p.owner_name} joined`,
          time: p.created_at,
          icon: p.role === 'company' ? 'fas fa-building' : 'fas fa-user-plus',
          color: p.role === 'company' ? 'from-purple-100 to-purple-200 text-purple-600 bg-purple-100' : 'from-red-100 to-red-200 text-red-600 bg-red-100',
          textColor: p.role === 'company' ? 'text-purple-600' : 'text-red-600',
          bgColor: p.role === 'company' ? 'bg-purple-100' : 'bg-red-100'
        });
      });

      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
  };

  const handleMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white p-3 rounded-lg shadow-xl text-sm">
          <p className="mb-1 opacity-80">{label}</p>
          <p className="font-bold">₹{payload[0].value.toLocaleString('en-IN')}</p>
        </div>
      );
    }
    return null;
  };

  const getStatusColor = (status) => {
      switch(status?.toLowerCase()) {
          case 'delivered': return 'text-emerald-600 bg-emerald-50';
          case 'processing': return 'text-amber-600 bg-amber-50';
          case 'shipped': return 'text-red-600 bg-red-50';
          case 'cancelled': return 'text-gray-600 bg-gray-50';
          default: return 'text-blue-600 bg-blue-50';
      }
  };

  const timeAgo = (dateStr) => {
      if (!dateStr) return 'Just now';
      const ms = new Date() - new Date(dateStr);
      const minutes = Math.floor(ms / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes} mins ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hours ago`;
      const days = Math.floor(hours / 24);
      return `${days} days ago`;
  };

  const getInitials = (name) => {
      if (!name) return 'NA';
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getRandomColor = (index) => {
      const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-red-500', 'bg-emerald-500', 'bg-amber-500'];
      return colors[index % colors.length];
  };

  if (loading) {
      return (
          <div className="flex flex-col justify-center items-center h-64 fade-in">
              <i className="fas fa-circle-notch fa-spin text-4xl text-red-500 mb-4"></i>
              <p className="text-gray-500 font-medium">Loading Dashboard Data...</p>
          </div>
      );
  }

  return (
    <div className="space-y-8">
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Revenue Card */}
          <div 
            className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" 
            style={{ animationDelay: '0.2s', transition: 'transform 0.1s' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
              <div className="flex items-start justify-between mb-4">
                  <div className="icon-box w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-600 text-xl shadow-sm">
                      <i className="fas fa-rupee-sign"></i>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <i className="fas fa-arrow-up text-xs"></i> 12.5%
                  </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-1 counter">
                <AnimatedCounter target={stats.revenue} />
              </h3>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Platform Revenue</p>
              <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: '75%' }}></div>
              </div>
          </div>

          {/* Companies Card */}
          <div 
            className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" 
            style={{ animationDelay: '0.3s', transition: 'transform 0.1s' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
              <div className="flex items-start justify-between mb-4">
                  <div className="icon-box w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 text-xl shadow-sm">
                      <i className="fas fa-building"></i>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <i className="fas fa-arrow-up text-xs"></i> New
                  </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-1 counter">
                <AnimatedCounter target={stats.companies} />
              </h3>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Companies</p>
              <div className="mt-4 flex -space-x-2">
                  {companiesList.map((comp, idx) => (
                      <div key={comp.id} className={`w-8 h-8 rounded-full ${getRandomColor(idx)} border-2 border-white flex items-center justify-center text-white text-xs font-bold z-${30 - idx * 10}`}>{getInitials(comp.shop_name || comp.owner_name)}</div>
                  ))}
                  {stats.companies > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-bold z-0">+{stats.companies - 3}</div>
                  )}
              </div>
          </div>

          {/* Customers Card */}
          <div 
            className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" 
            style={{ animationDelay: '0.4s', transition: 'transform 0.1s' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
              <div className="flex items-start justify-between mb-4">
                  <div className="icon-box w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600 text-xl shadow-sm">
                      <i className="fas fa-users"></i>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      <i className="fas fa-minus text-xs"></i> 0%
                  </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-1 counter">
                <AnimatedCounter target={stats.customers} />
              </h3>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Customers</p>
              <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" style={{ width: '45%' }}></div>
              </div>
          </div>

          {/* Orders Card */}
          <div 
            className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" 
            style={{ animationDelay: '0.5s', transition: 'transform 0.1s' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
              <div className="flex items-start justify-between mb-4">
                  <div className="icon-box w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 text-xl shadow-sm">
                      <i className="fas fa-shopping-cart"></i>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <i className="fas fa-arrow-up text-xs"></i> 8.2%
                  </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-1 counter">
                <AnimatedCounter target={stats.orders} />
              </h3>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Orders</p>
              <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: '60%' }}></div>
              </div>
          </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center justify-between mb-6">
                  <div>
                      <h3 className="text-lg font-bold text-gray-800">Platform Revenue Growth</h3>
                      <p className="text-sm text-gray-500 mt-1">Delivered orders revenue over the last 7 days</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">7 Days</button>
                      <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">30 Days</button>
                      <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">90 Days</button>
                  </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#dc2626" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                      activeDot={{ r: 6, strokeWidth: 3, stroke: '#ffffff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
              
              {/* System Reminders */}
              <div className="reminder-card rounded-2xl p-6 shadow-lg fade-in" style={{ animationDelay: '0.7s' }}>
                  <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                              <i className="fas fa-bell text-red-400 text-lg"></i>
                          </div>
                          <h3 className="text-lg font-bold text-white">System Reminders</h3>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                          <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <i className="fas fa-check text-emerald-400 text-sm"></i>
                              </div>
                              <div>
                                  <h4 className="text-white font-semibold text-sm">All Caught Up!</h4>
                                  <p className="text-gray-300 text-xs mt-1">No pending company approvals. Everything is running smoothly.</p>
                              </div>
                          </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                          <span>Last checked: Just now</span>
                          <button className="text-red-400 hover:text-red-300 transition-colors" onClick={fetchDashboardData}>Refresh</button>
                      </div>
                  </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.8s' }}>
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                              <i className="fas fa-bolt text-red-500 text-sm"></i>
                          </div>
                          <h3 className="text-lg font-bold text-gray-800">Recent Activity</h3>
                      </div>
                      <Link to="/super-admin/audit" className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">View All</Link>
                  </div>
                  
                  <div className="space-y-1">
                      {recentActivity.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">No recent activities</div>
                      ) : (
                          recentActivity.map((activity, i) => (
                              <div key={i} className="activity-item flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50">
                                  <div className={`w-10 h-10 rounded-full ${activity.bgColor} flex items-center justify-center flex-shrink-0`}>
                                      <i className={`${activity.icon} ${activity.textColor} text-sm`}></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-800 truncate">{activity.title}</p>
                                      <p className="text-xs text-gray-500">{timeAgo(activity.time)}</p>
                                  </div>
                                  <span className={`text-xs font-semibold ${activity.textColor}`}>
                                      {activity.type === 'order' ? 'Order' : 'New'}
                                  </span>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.9s' }}>
                  <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                      <Link to="/super-admin/companies" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors group">
                          <i className="fas fa-plus-circle text-red-500 text-xl group-hover:scale-110 transition-transform"></i>
                          <span className="text-xs font-medium text-gray-700">Add Company</span>
                      </Link>
                      <Link to="/super-admin/invoices" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
                          <i className="fas fa-file-invoice text-blue-500 text-xl group-hover:scale-110 transition-transform"></i>
                          <span className="text-xs font-medium text-gray-700">New Invoice</span>
                      </Link>
                      <Link to="/super-admin/customers" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group">
                          <i className="fas fa-user-plus text-purple-500 text-xl group-hover:scale-110 transition-transform"></i>
                          <span className="text-xs font-medium text-gray-700">Add Customer</span>
                      </Link>
                      <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors group">
                          <i className="fas fa-download text-emerald-500 text-xl group-hover:scale-110 transition-transform"></i>
                          <span className="text-xs font-medium text-gray-700">Export</span>
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* Bottom Section - Recent Orders Table */}
      <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '1s' }}>
          <div className="flex items-center justify-between mb-6">
              <div>
                  <h3 className="text-lg font-bold text-gray-800">Recent Orders</h3>
                  <p className="text-sm text-gray-500 mt-1">Latest transactions across all companies</p>
              </div>
              <Link to="/super-admin/orders" className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                  View All Orders
              </Link>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full">
                  <thead>
                      <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {recentOrders.length === 0 ? (
                          <tr>
                              <td colSpan="7" className="py-6 text-center text-gray-500">No recent orders found</td>
                          </tr>
                      ) : (
                          recentOrders.map((order, idx) => (
                              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="py-4 px-4 text-sm font-medium text-gray-800">#{order.id.slice(0, 8).toUpperCase()}</td>
                                  <td className="py-4 px-4 text-sm text-gray-600">
                                      <div className="flex items-center gap-2">
                                          <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold ${getRandomColor(idx)}`}>
                                              {getInitials(order.company?.shop_name || order.company?.owner_name)}
                                          </div>
                                          {order.company?.shop_name || order.company?.owner_name || 'N/A'}
                                      </div>
                                  </td>
                                  <td className="py-4 px-4 text-sm text-gray-600">{order.customer?.shop_name || order.customer?.owner_name || 'N/A'}</td>
                                  <td className="py-4 px-4 text-sm text-gray-500">
                                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </td>
                                  <td className="py-4 px-4 text-sm font-bold text-gray-800">₹{order.total_amount?.toLocaleString() || 0}</td>
                                  <td className="py-4 px-4">
                                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(order.status)}`}>
                                          {order.status?.replace('_', ' ') || 'pending'}
                                      </span>
                                  </td>
                                  <td className="py-4 px-4">
                                      <Link to={`/super-admin/orders/${order.id}`} className="text-gray-400 hover:text-red-600 transition-colors">
                                        <i className="fas fa-ellipsis-h"></i>
                                      </Link>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
}
