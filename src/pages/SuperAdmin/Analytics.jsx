import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { supabase } from '../../lib/supabase';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Filler
);

// Counter component for animation
const AnimatedCounter = ({ target, prefix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(target) || 0;
    if (end === 0) {
        setCount(0);
        return;
    }
    const duration = 2500; // 2.5 seconds
    const increment = end / (duration / 16);

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

  return <span>{prefix}{count.toLocaleString('en-IN')}</span>;
};

export default function SuperAdminAnalytics() {
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [doughnutData, setDoughnutData] = useState(null);
  const [activeFilter, setActiveFilter] = useState('7 Days');
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    newCustomers: 0,
    avgOrderValue: 0
  });
  const [topCompanies, setTopCompanies] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [doughnutStats, setDoughnutStats] = useState({
      delivered: 0,
      shipped: 0,
      pending: 0,
      total: 0
  });

  useEffect(() => {
    fetchAnalyticsData(activeFilter);
  }, [activeFilter]);

  const fetchAnalyticsData = async (filter) => {
      try {
          setLoading(true);

          let days = 7;
          if (filter === '30 Days') days = 30;
          if (filter === '90 Days') days = 90;
          if (filter === '1 Year') days = 365;

          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          const startDateStr = startDate.toISOString();

          // 1. Fetch Orders
          const { data: rawOrders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                company_id,
                customer:profiles!customer_id(shop_name, owner_name)
            `)
            .gte('created_at', startDateStr)
            .order('created_at', { ascending: false });

          if (ordersError) throw ordersError;

          // 2. Fetch Profiles for Customers
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, role, created_at, shop_name, owner_name')
            .gte('created_at', startDateStr)
            .order('created_at', { ascending: false });

          if (profilesError) throw profilesError;

          const { data: companiesData } = await supabase
            .from('profiles')
            .select('id, shop_name, owner_name')
            .eq('role', 'company');

          const companiesMapData = new Map();
          if (companiesData) {
              companiesData.forEach(c => companiesMapData.set(c.id, c));
          }

          const orders = (rawOrders || []).map(o => ({
              ...o,
              company: companiesMapData.get(o.company_id) || null
          }));

          const allOrders = orders || [];
          const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
          const revenue = deliveredOrders.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
          
          const newCustomers = (profiles || []).filter(p => p.role === 'customer').length;
          const avgOrderValue = deliveredOrders.length > 0 ? Math.floor(revenue / deliveredOrders.length) : 0;

          setStats({
              revenue,
              orders: allOrders.length,
              newCustomers,
              avgOrderValue
          });

          // Top Companies (Group by company_id and sum total_amount)
          const companiesMap = {};
          deliveredOrders.forEach(o => {
              if (o.company_id) {
                  if (!companiesMap[o.company_id]) {
                      companiesMap[o.company_id] = {
                          id: o.company_id,
                          name: o.company?.shop_name || o.company?.owner_name || 'Unknown',
                          initials: getInitials(o.company?.shop_name || o.company?.owner_name),
                          revenue: 0,
                          orders: 0
                      };
                  }
                  companiesMap[o.company_id].revenue += Number(o.total_amount || 0);
                  companiesMap[o.company_id].orders += 1;
              }
          });

          const sortedCompanies = Object.values(companiesMap)
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 3);
          
          // Map sorted companies to visual details
          const maxRev = sortedCompanies.length > 0 ? sortedCompanies[0].revenue : 1;
          const colors = [
              { color: 'from-pink-400 to-pink-600', bg: 'from-pink-100 to-pink-200 text-pink-600' },
              { color: 'from-red-400 to-red-600', bg: 'from-red-100 to-red-200 text-red-600' },
              { color: 'from-orange-400 to-orange-600', bg: 'from-orange-100 to-orange-200 text-orange-600' }
          ];

          setTopCompanies(sortedCompanies.map((c, idx) => ({
              ...c,
              amount: `₹${c.revenue.toLocaleString()}`,
              ordersText: `${c.orders} orders`,
              progress: `${Math.floor((c.revenue / maxRev) * 100)}%`,
              color: colors[idx % colors.length].color,
              bg: colors[idx % colors.length].bg
          })));

          // Order Status Doughnut
          const deliveredCount = allOrders.filter(o => o.status === 'delivered').length;
          const shippedCount = allOrders.filter(o => o.status === 'shipped').length;
          const pendingCount = allOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
          
          setDoughnutStats({
              delivered: deliveredCount,
              shipped: shippedCount,
              pending: pendingCount,
              total: allOrders.length || 1 // prevent div by zero
          });

          setDoughnutData({
              labels: ['Delivered', 'Shipped', 'Pending'],
              datasets: [{
                  data: [deliveredCount, shippedCount, pendingCount],
                  backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                  borderWidth: 0,
                  hoverOffset: 8
              }]
          });

          // Line Chart Data
          // We will generate the last N days array depending on filter (max 14 points to prevent clutter)
          const dataPoints = Math.min(days, 14);
          const labelsArr = [];
          const revenueArr = [];
          const ordersArr = [];

          for (let i = dataPoints - 1; i >= 0; i--) {
              const d = new Date();
              if (days > 14) {
                  // For 30, 90, 365, group by larger intervals
                  const step = Math.floor(days / dataPoints);
                  d.setDate(d.getDate() - (i * step));
                  const endD = new Date(d);
                  endD.setDate(endD.getDate() + step);
                  
                  const periodOrders = allOrders.filter(o => new Date(o.created_at) >= d && new Date(o.created_at) < endD);
                  const periodRev = periodOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
                  
                  labelsArr.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                  revenueArr.push(periodRev);
                  ordersArr.push(periodOrders.length);
              } else {
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  
                  const dayOrders = allOrders.filter(o => o.created_at.startsWith(dateStr));
                  const dayRev = dayOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
                  
                  labelsArr.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
                  revenueArr.push(dayRev);
                  ordersArr.push(dayOrders.length);
              }
          }

          const chart = chartRef.current;
          let gradient1 = 'rgba(220, 38, 38, 0.2)';
          if (chart) {
            const ctx = chart.canvas.getContext('2d');
            gradient1 = ctx.createLinearGradient(0, 0, 0, 320);
            gradient1.addColorStop(0, 'rgba(220, 38, 38, 0.2)');
            gradient1.addColorStop(1, 'rgba(220, 38, 38, 0)');
          }

          setChartData({
            labels: labelsArr,
            datasets: [{
                label: 'Revenue',
                data: revenueArr,
                borderColor: '#dc2626',
                backgroundColor: gradient1,
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#dc2626',
                pointBorderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Orders',
                data: ordersArr,
                borderColor: '#60a5fa',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                pointHoverRadius: 5,
                tension: 0.4,
                yAxisID: 'y1'
            }]
          });

          // Recent Activity
          const activities = [];
          
          allOrders.slice(0, 4).forEach(o => {
              let title = `Order #${o.id.slice(0,8).toUpperCase()} ${o.status.replace('_', ' ')}`;
              let desc = `${o.company?.shop_name || 'Unknown'} - ₹${o.total_amount}`;
              let icon = o.status === 'delivered' ? 'fas fa-check' : 'fas fa-shipping-fast';
              let color = o.status === 'delivered' ? 'from-emerald-100 to-emerald-200 text-emerald-600' : 'from-blue-100 to-blue-200 text-blue-600';
              let hover = o.status === 'delivered' ? 'hover:bg-emerald-50 hover:border-emerald-100' : 'hover:bg-blue-50 hover:border-blue-100';

              activities.push({ title, desc, time: o.created_at, icon, color, hover });
          });

          (profiles || []).slice(0, 2).forEach(p => {
              activities.push({
                  title: `New ${p.role} registered`,
                  desc: `${p.shop_name || p.owner_name} joined`,
                  time: p.created_at,
                  icon: p.role === 'company' ? 'fas fa-building' : 'fas fa-user-plus',
                  color: p.role === 'company' ? 'from-purple-100 to-purple-200 text-purple-600' : 'from-red-100 to-red-200 text-red-600',
                  hover: p.role === 'company' ? 'hover:bg-purple-50 hover:border-purple-100' : 'hover:bg-red-50 hover:border-red-100'
              });
          });

          activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
          setRecentActivity(activities.slice(0, 4));

      } catch (error) {
          console.error("Error fetching analytics data", error);
      } finally {
          setLoading(false);
      }
  };

  const timeAgo = (dateStr) => {
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

  const lineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
          legend: { display: false },
          tooltip: {
              backgroundColor: '#1f2937',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              padding: 12,
              cornerRadius: 8,
              displayColors: false,
              callbacks: { 
                  label: function(context) { 
                      if(context.dataset.label === 'Revenue') {
                          return 'Revenue: ₹' + context.parsed.y.toLocaleString('en-IN');
                      }
                      return 'Orders: ' + context.parsed.y;
                  } 
              }
          }
      },
      scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { family: 'Inter', size: 12 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { color: '#9ca3af', font: { family: 'Inter', size: 12 }, callback: function(value) { return '₹' + value; } } },
          y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { display: false } }
      },
      animation: { duration: 2000, easing: 'easeInOutQuart' }
  };

  const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
          legend: { display: false },
          tooltip: {
              backgroundColor: '#1f2937',
              padding: 12,
              cornerRadius: 8,
              callbacks: { label: function(context) { return context.label + ': ' + context.parsed + ' orders'; } }
          }
      },
      animation: { animateRotate: true, duration: 2000 }
  };

  if (loading) {
      return (
          <div className="flex flex-col justify-center items-center h-64 fade-in">
              <i className="fas fa-circle-notch fa-spin text-4xl text-red-500 mb-4"></i>
              <p className="text-gray-500 font-medium">Loading Analytics...</p>
          </div>
      );
  }

  return (
      <div className="space-y-8">
          {/* Header Action specific to Analytics */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-gray-800">Platform <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">Analytics</span></h2>
                  <p className="text-sm text-gray-500 mt-1">Deep insights into your B2B wholesale platform</p>
              </div>
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                  {['7 Days', '30 Days', '90 Days', '1 Year'].map((period) => (
                      <button 
                          key={period}
                          onClick={() => setActiveFilter(period)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeFilter === period ? 'bg-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]' : 'text-gray-500 hover:bg-gray-200'}`}
                      >
                          {period}
                      </button>
                  ))}
              </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 to-red-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-600 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                          <i className="fas fa-rupee-sign"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <i className="fas fa-arrow-up text-xs"></i>
                      </span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.revenue} prefix="₹" />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Revenue</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-1000 ease-out" style={{ width: '75%' }}></div>
                  </div>
              </div>

              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden" style={{ animationDelay: '0.3s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 to-blue-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                          <i className="fas fa-shopping-bag"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <i className="fas fa-arrow-up text-xs"></i>
                      </span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.orders} />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Orders</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000 ease-out" style={{ width: '60%' }}></div>
                  </div>
              </div>

              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden" style={{ animationDelay: '0.4s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-600 to-purple-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                          <i className="fas fa-users"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <i className="fas fa-arrow-up text-xs"></i>
                      </span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.newCustomers} />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">New Customers</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-1000 ease-out" style={{ width: '45%' }}></div>
                  </div>
              </div>

              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden" style={{ animationDelay: '0.5s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-600 to-emerald-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                          <i className="fas fa-percentage"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <i className="fas fa-arrow-up text-xs"></i>
                      </span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.avgOrderValue} prefix="₹" />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Avg Order Value</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000 ease-out" style={{ width: '68%' }}></div>
                  </div>
              </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 shadow-sm border border-gray-100 bg-white fade-in" style={{ animationDelay: '0.6s' }}>
                  <div className="flex items-center justify-between mb-6">
                      <div>
                          <h3 className="text-lg font-bold text-gray-800">Revenue Overview</h3>
                          <p className="text-sm text-gray-500 mt-1">Revenue trends over time</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-full bg-red-600"></span>Revenue</span>
                          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-full bg-blue-400"></span>Orders</span>
                      </div>
                  </div>
                  <div className="relative h-[320px]">
                      {chartData ? <Line ref={chartRef} data={chartData} options={lineOptions} /> : null}
                  </div>
              </div>

              {/* Top Companies */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 bg-white fade-in" style={{ animationDelay: '0.7s' }}>
                  <div className="flex items-center justify-between mb-6">
                      <div>
                          <h3 className="text-lg font-bold text-gray-800">Top Companies</h3>
                          <p className="text-sm text-gray-500 mt-1">By revenue generated</p>
                      </div>
                  </div>
                  <div className="space-y-6">
                      {topCompanies.length === 0 ? (
                          <div className="text-center text-sm text-gray-500 py-6">No data for selected period</div>
                      ) : topCompanies.map((company, i) => (
                          <motion.div 
                              key={company.id} 
                              className="group cursor-pointer"
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.8 + (i * 0.1) }}
                          >
                              <div className="flex items-center justify-between mb-2 group-hover:translate-x-1 transition-transform">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold shadow-sm ${company.bg}`}>
                                          {company.initials}
                                      </div>
                                      <div>
                                          <p className="text-sm font-bold text-gray-800">{company.name}</p>
                                          <p className="text-xs text-gray-500">{company.ordersText}</p>
                                      </div>
                                  </div>
                                  <span className="text-sm font-bold text-gray-800">{company.amount}</span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div 
                                      className={`h-full bg-gradient-to-r rounded-full ${company.color}`}
                                      initial={{ width: 0 }}
                                      animate={{ width: company.progress }}
                                      transition={{ duration: 1.5, delay: 1 }}
                                  ></motion.div>
                              </div>
                          </motion.div>
                      ))}
                  </div>
              </div>
          </div>

          {/* Bottom Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Status Distribution */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 bg-white fade-in" style={{ animationDelay: '0.8s' }}>
                  <div className="mb-6">
                      <h3 className="text-lg font-bold text-gray-800">Order Status Distribution</h3>
                      <p className="text-sm text-gray-500 mt-1">Breakdown of all orders by status</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-8">
                      <div className="w-48 h-48 relative shrink-0">
                          {doughnutData && <Doughnut data={doughnutData} options={doughnutOptions} />}
                      </div>
                      <div className="space-y-4 flex-1 w-full">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100 hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3">
                                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                  <span className="text-sm font-medium text-gray-700">Delivered</span>
                              </div>
                              <span className="text-sm font-bold text-emerald-600">{doughnutStats.delivered} ({Math.round(doughnutStats.delivered / doughnutStats.total * 100)}%)</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100 hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3">
                                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                  <span className="text-sm font-medium text-gray-700">Shipped</span>
                              </div>
                              <span className="text-sm font-bold text-blue-600">{doughnutStats.shipped} ({Math.round(doughnutStats.shipped / doughnutStats.total * 100)}%)</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100 hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3">
                                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                  <span className="text-sm font-medium text-gray-700">Pending</span>
                              </div>
                              <span className="text-sm font-bold text-amber-600">{doughnutStats.pending} ({Math.round(doughnutStats.pending / doughnutStats.total * 100)}%)</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 bg-white fade-in" style={{ animationDelay: '0.9s' }}>
                  <div className="flex items-center justify-between mb-6">
                      <div>
                          <h3 className="text-lg font-bold text-gray-800">Recent Activity</h3>
                          <p className="text-sm text-gray-500 mt-1">Latest platform activities</p>
                      </div>
                  </div>
                  <div className="space-y-4">
                      {recentActivity.length === 0 ? (
                          <div className="text-center text-sm text-gray-500 py-4">No recent activities</div>
                      ) : recentActivity.map((activity, i) => (
                          <div key={i} className={`flex items-start gap-4 p-4 rounded-xl bg-gray-50/50 transition-colors cursor-pointer border border-transparent ${activity.hover}`}>
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm ${activity.color}`}>
                                  <i className={`${activity.icon} text-sm`}></i>
                              </div>
                              <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-800">{activity.title}</p>
                                  <p className="text-xs text-gray-500 mt-1">{activity.desc}</p>
                                  <p className="text-xs text-gray-400 mt-1">{timeAgo(activity.time)}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
  );
}
