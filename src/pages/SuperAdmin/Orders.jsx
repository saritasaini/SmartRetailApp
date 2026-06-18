import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

// Animated Counter Component
const AnimatedCounter = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
        setCount(0);
        return;
    }
    let start = 0;
    const end = parseInt(target, 10);
    const duration = 2500;
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

  return <span>{count.toLocaleString('en-IN')}</span>;
};

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterCompany, setFilterCompany] = useState('All Companies');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companiesList, setCompaniesList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [stats, setStats] = useState({
      total: 0,
      pending: 0,
      shipped: 0,
      delivered: 0
  });

  useEffect(() => {
      fetchOrders();
  }, []);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchQuery, filterStatus, filterCompany]);

  const fetchOrders = async () => {
      try {
          const { data, error } = await supabase
            .from('orders')
            .select(`
              id,
              created_at,
              status,
              total_amount,
              customer:profiles!customer_id (owner_name, phone),
              company:profiles!company_id (shop_name, logo_url),
              order_items (quantity)
            `)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const getInitials = (name) => {
              if (!name) return 'U';
              return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          };

          const colors = [
              'from-amber-100 to-amber-200 text-amber-700',
              'from-blue-100 to-blue-200 text-blue-700',
              'from-purple-100 to-purple-200 text-purple-700',
              'from-gray-100 to-gray-200 text-gray-700',
              'from-emerald-100 to-emerald-200 text-emerald-700',
              'from-pink-100 to-pink-200 text-pink-600',
              'from-red-100 to-red-200 text-red-600',
              'from-orange-100 to-orange-200 text-orange-600'
          ];

          let totalStats = { total: 0, pending: 0, shipped: 0, delivered: 0, cancelled: 0 };

          const mappedOrders = (data || []).map((order, index) => {
              const customerName = order.customer?.owner_name || 'Unknown Customer';
              const companyName = order.company?.shop_name || 'Unknown Company';
              
              const statusLower = order.status?.toLowerCase() || 'pending';
              let displayStatus = 'Pending';
              let statusBadge = 'text-amber-600 bg-amber-50 border-amber-100';
              let statusDot = 'bg-amber-500';
              let pulse = false;

              if (statusLower === 'pending') {
                  displayStatus = 'Pending';
                  statusBadge = 'text-amber-600 bg-amber-50 border-amber-100';
                  statusDot = 'bg-amber-500';
                  pulse = true;
                  totalStats.pending++;
              } else if (statusLower === 'confirmed' || statusLower === 'out_for_delivery' || statusLower === 'shipped') {
                  displayStatus = 'Shipped';
                  statusBadge = 'text-blue-600 bg-blue-50 border-blue-100';
                  statusDot = 'bg-blue-500';
                  pulse = true;
                  totalStats.shipped++;
              } else if (statusLower === 'delivered') {
                  displayStatus = 'Delivered';
                  statusBadge = 'text-emerald-600 bg-emerald-50 border-emerald-100';
                  statusDot = 'bg-emerald-500';
                  pulse = false;
                  totalStats.delivered++;
              } else {
                  displayStatus = 'Cancelled';
                  statusBadge = 'text-red-600 bg-red-50 border-red-100';
                  statusDot = 'bg-red-500';
                  pulse = false;
                  totalStats.cancelled++;
              }
              totalStats.total++;

              const itemsCount = order.order_items ? order.order_items.reduce((acc, item) => acc + item.quantity, 0) : 0;
              const shortId = order.id.split('-')[0].toUpperCase();

              return {
                  id: `#${shortId}`,
                  rawId: order.id,
                  customerInitials: getInitials(customerName),
                  customerName: customerName,
                  customerPhone: order.profiles?.phone || 'N/A',
                  companyInitials: getInitials(companyName),
                  companyName: companyName,
                  companyLogo: order.company?.logo_url,
                  itemsCount: itemsCount,
                  amount: order.total_amount || 0,
                  date: new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  status: displayStatus,
                  customerColor: colors[index % colors.length],
                  companyColor: colors[(index + 3) % colors.length],
                  statusBadge,
                  statusDot,
                  pulse
              };
          });

          setOrders(mappedOrders);
          setStats(totalStats);

          // Fetch real companies for the filter
          const { data: companiesData, error: companiesError } = await supabase
            .from('profiles')
            .select('shop_name')
            .eq('role', 'company')
            .order('shop_name');
            
          if (!companiesError && companiesData) {
              setCompaniesList(companiesData.map(c => c.shop_name));
          } else {
              setCompaniesList([]);
          }

          setLoading(false);
      } catch (error) {
          console.error('Error fetching orders:', error);
          setLoading(false);
      }
  };

  const filteredOrders = orders.filter(o => {
      const searchMatch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.companyName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const statusMatch = filterStatus === 'All Status' || o.status === filterStatus;
      const companyMatch = filterCompany === 'All Companies' || o.companyName === filterCompany;

      return searchMatch && statusMatch && companyMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) {
      return (
          <div className="flex flex-col justify-center items-center py-20 fade-in">
              <i className="fas fa-circle-notch fa-spin text-4xl text-red-500 mb-4"></i>
              <p className="text-gray-500 font-medium">Loading orders data...</p>
          </div>
      );
  }

  return (
      <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Orders */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '0.2s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 to-red-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-600 text-2xl shadow-sm">
                          <i className="fas fa-shopping-bag"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          <i className="fas fa-arrow-up text-xs"></i> 12%
                      </span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.total} />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Orders</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: '80%' }}></div>
                  </div>
              </div>

              {/* Pending Orders */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '0.3s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-yellow-500 to-yellow-300 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 text-2xl shadow-sm">
                          <i className="fas fa-clock"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                          <i className="fas fa-minus text-xs"></i> 2
                      </span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.pending} />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Pending</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full" style={{ width: '31%' }}></div>
                  </div>
              </div>

              {/* Shipped Orders */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '0.4s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 to-blue-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-sm">
                          <i className="fas fa-shipping-fast"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                          <i className="fas fa-arrow-up text-xs"></i> 5
                      </span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.shipped} />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Shipped</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: '44%' }}></div>
                  </div>
              </div>

              {/* Delivered Orders */}
              <div className="glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '0.5s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-600 to-emerald-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-sm">
                          <i className="fas fa-check-circle"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          <i className="fas fa-arrow-up text-xs"></i> 8%
                      </span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.delivered} />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Delivered</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: '25%' }}></div>
                  </div>
              </div>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between fade-in relative z-20" style={{ animationDelay: '0.6s' }}>
              <div className="flex gap-4 w-full lg:w-auto flex-1 flex-col sm:flex-row">
                  <div className="relative flex-1 max-w-md">
                      <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      <input 
                          type="text" 
                          placeholder="Search by order ID, customer, company..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all shadow-sm"
                      />
                  </div>
                  <div className="relative shrink-0" style={{ minWidth: '180px' }}>
                      <button 
                          type="button"
                          onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCompanyOpen(false); }}
                          className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:border-red-500 hover:border-gray-300 transition-colors shadow-sm"
                      >
                          <span>{filterStatus}</span>
                          <i className={`fas fa-chevron-down text-xs transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}></i>
                      </button>
                      
                      {isStatusOpen && (
                          <>
                              <div className="fixed inset-0 z-10" onClick={() => setIsStatusOpen(false)}></div>
                              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden py-1">
                                  {['All Status', 'Pending', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
                                      <button
                                          key={status}
                                          onClick={() => { setFilterStatus(status); setIsStatusOpen(false); }}
                                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filterStatus === status ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                      >
                                          {status}
                                      </button>
                                  ))}
                              </div>
                          </>
                      )}
                  </div>
                  <div className="relative shrink-0" style={{ minWidth: '200px' }}>
                      <button 
                          type="button"
                          onClick={() => { setIsCompanyOpen(!isCompanyOpen); setIsStatusOpen(false); }}
                          className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:border-red-500 hover:border-gray-300 transition-colors shadow-sm"
                      >
                          <span className="truncate pr-2">{filterCompany}</span>
                          <i className={`fas fa-chevron-down text-xs transition-transform ${isCompanyOpen ? 'rotate-180' : ''}`}></i>
                      </button>
                      
                      {isCompanyOpen && (
                          <>
                              <div className="fixed inset-0 z-10" onClick={() => setIsCompanyOpen(false)}></div>
                              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg py-1">
                                  <div className="max-h-52 overflow-y-auto">
                                      {['All Companies', ...companiesList].map((company) => (
                                          <button
                                              key={company}
                                              onClick={() => { setFilterCompany(company); setIsCompanyOpen(false); }}
                                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filterCompany === company ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                          >
                                              {company}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </>
                      )}
                  </div>
              </div>

          </div>

          {/* Orders Table */}
          <div className="glass-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden fade-in bg-white" style={{ animationDelay: '0.7s' }}>
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {currentOrders.length === 0 ? (
                              <tr>
                                  <td colSpan="8" className="py-8 text-center text-gray-500 font-medium">No orders found matching your filters.</td>
                              </tr>
                          ) : (
                              currentOrders.map(order => (
                                  <motion.tr 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      key={order.id} 
                                      onClick={() => navigate(`/admin/orders/${order.rawId}`)}
                                      className="table-row hover:bg-gray-50/50 transition-colors border-l-4 border-transparent hover:border-red-500 cursor-pointer"
                                  >
                                      <td className="py-5 px-6 whitespace-nowrap">
                                          <span className="font-mono text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100">{order.id}</span>
                                      </td>
                                      <td className="py-5 px-6">
                                          <div className="flex items-center gap-3">
                                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-sm ${order.customerColor}`}>
                                                  {order.customerInitials}
                                              </div>
                                              <div>
                                                  <p className="text-sm font-bold text-gray-800">{order.customerName}</p>
                                                  <p className="text-xs text-gray-500">{order.customerPhone}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="py-5 px-6">
                                          <div className="flex items-center gap-2">
                                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-bold ${order.companyLogo ? '' : order.companyColor} overflow-hidden`}>
                                                  {order.companyLogo ? (
                                                      <img src={order.companyLogo} alt="Logo" className="w-full h-full object-cover" />
                                                  ) : (
                                                      order.companyInitials
                                                  )}
                                              </div>
                                              <span className="text-sm font-medium text-gray-700">{order.companyName}</span>
                                          </div>
                                      </td>
                                      <td className="py-5 px-6">
                                          <span className="text-sm font-medium text-gray-700">{order.itemsCount} items</span>
                                      </td>
                                      <td className="py-5 px-6">
                                          <span className="text-sm font-bold text-gray-800">₹{order.amount.toLocaleString()}</span>
                                      </td>
                                      <td className="py-5 px-6 whitespace-nowrap">
                                          <div className="flex items-center gap-2 text-sm text-gray-600">
                                              <i className="far fa-calendar-alt text-gray-400"></i>
                                              <span className="font-medium">{order.date}</span>
                                          </div>
                                      </td>
                                      <td className="py-5 px-6">
                                          <span className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full border shadow-sm ${order.statusBadge}`}>
                                              <span className={`w-2 h-2 rounded-full ${order.statusDot} ${order.pulse ? 'animate-pulse' : ''}`}></span>
                                              {order.status}
                                          </span>
                                      </td>
                                      <td className="py-5 px-6">
                                          <div className="flex items-center justify-end gap-2">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation(); // Prevent row click
                                                  // Edit logic here
                                                }}
                                                className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors border border-blue-100"
                                              >
                                                  <i className="fas fa-pen text-xs"></i>
                                              </button>
                                          </div>
                                      </td>
                                  </motion.tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
                  <p className="text-sm text-gray-500">Showing <span className="font-bold text-gray-800">{filteredOrders.length > 0 ? indexOfFirstItem + 1 : '0'}-{Math.min(indexOfLastItem, filteredOrders.length)}</span> of <span className="font-bold text-gray-800">{filteredOrders.length}</span> orders</p>
                  <div className="flex items-center gap-2">
                      <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                          <i className="fas fa-chevron-left text-xs"></i>
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button 
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-colors ${currentPage === page ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/20' : 'border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 font-medium'}`}
                          >
                              {page}
                          </button>
                      ))}

                      <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                          <i className="fas fa-chevron-right text-xs"></i>
                      </button>
                  </div>
              </div>
          </div>
      </div>
  );
}
