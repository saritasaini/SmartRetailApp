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

// Animated Counter Component
const AnimatedCounter = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2500;
    const increment = target / (duration / 16); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
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
  
  const dummyChartData = [
    { name: 'Wed', sales: 350 },
    { name: 'Thu', sales: 80 },
    { name: 'Fri', sales: 20 },
    { name: 'Sat', sales: 15 },
    { name: 'Sun', sales: 25 },
    { name: 'Mon', sales: 750 },
    { name: 'Tue', sales: 200 }
  ];

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
                <AnimatedCounter target={1090} />
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
                <AnimatedCounter target={3} />
              </h3>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Companies</p>
              <div className="mt-4 flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold z-30">A</div>
                  <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold z-20">B</div>
                  <div className="w-8 h-8 rounded-full bg-pink-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold z-10">C</div>
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-bold z-0">+0</div>
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
                <AnimatedCounter target={3} />
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
                <AnimatedCounter target={16} />
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
                  <AreaChart data={dummyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                          <span>Last checked: 2 mins ago</span>
                          <button className="text-red-400 hover:text-red-300 transition-colors">Refresh</button>
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
                      <button className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">View All</button>
                  </div>
                  
                  <div className="space-y-1">
                      <div className="activity-item flex items-center gap-3 p-3 rounded-xl cursor-pointer">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                              <i className="fas fa-plus text-red-600 text-sm"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">New order #1234 received</p>
                              <p className="text-xs text-gray-500">2 minutes ago</p>
                          </div>
                          <span className="text-xs font-semibold text-red-600">₹1,200</span>
                      </div>
                      
                      <div className="activity-item flex items-center gap-3 p-3 rounded-xl cursor-pointer">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <i className="fas fa-building text-blue-600 text-sm"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">TechCorp registered</p>
                              <p className="text-xs text-gray-500">1 hour ago</p>
                          </div>
                          <span className="text-xs font-semibold text-blue-600">New</span>
                      </div>

                      <div className="activity-item flex items-center gap-3 p-3 rounded-xl cursor-pointer">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <i className="fas fa-user-plus text-purple-600 text-sm"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">New customer added</p>
                              <p className="text-xs text-gray-500">3 hours ago</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.9s' }}>
                  <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                      <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors group">
                          <i className="fas fa-plus-circle text-red-500 text-xl group-hover:scale-110 transition-transform"></i>
                          <span className="text-xs font-medium text-gray-700">Add Company</span>
                      </button>
                      <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
                          <i className="fas fa-file-invoice text-blue-500 text-xl group-hover:scale-110 transition-transform"></i>
                          <span className="text-xs font-medium text-gray-700">New Invoice</span>
                      </button>
                      <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group">
                          <i className="fas fa-user-plus text-purple-500 text-xl group-hover:scale-110 transition-transform"></i>
                          <span className="text-xs font-medium text-gray-700">Add Customer</span>
                      </button>
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
              <button className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                  View All Orders
              </button>
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
                      <tr className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 text-sm font-medium text-gray-800">#ORD-001</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">T</div>
                                  TechCorp
                              </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">Rahul Sharma</td>
                          <td className="py-4 px-4 text-sm text-gray-500">Jun 15, 2026</td>
                          <td className="py-4 px-4 text-sm font-bold text-gray-800">₹1,200</td>
                          <td className="py-4 px-4">
                              <span className="px-2.5 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full">Delivered</span>
                          </td>
                          <td className="py-4 px-4">
                              <button className="text-gray-400 hover:text-red-600 transition-colors">
                                <i className="fas fa-ellipsis-h"></i>
                              </button>
                          </td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 text-sm font-medium text-gray-800">#ORD-002</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">R</div>
                                  RetailMax
                              </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">Priya Patel</td>
                          <td className="py-4 px-4 text-sm text-gray-500">Jun 14, 2026</td>
                          <td className="py-4 px-4 text-sm font-bold text-gray-800">₹890</td>
                          <td className="py-4 px-4">
                              <span className="px-2.5 py-1 text-xs font-semibold text-amber-600 bg-amber-50 rounded-full">Processing</span>
                          </td>
                          <td className="py-4 px-4">
                              <button className="text-gray-400 hover:text-red-600 transition-colors">
                                <i className="fas fa-ellipsis-h"></i>
                              </button>
                          </td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 text-sm font-medium text-gray-800">#ORD-003</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-bold">S</div>
                                  ShopEase
                              </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">Amit Kumar</td>
                          <td className="py-4 px-4 text-sm text-gray-500">Jun 14, 2026</td>
                          <td className="py-4 px-4 text-sm font-bold text-gray-800">₹2,450</td>
                          <td className="py-4 px-4">
                              <span className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-full">Shipped</span>
                          </td>
                          <td className="py-4 px-4">
                              <button className="text-gray-400 hover:text-red-600 transition-colors">
                                <i className="fas fa-ellipsis-h"></i>
                              </button>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
}
