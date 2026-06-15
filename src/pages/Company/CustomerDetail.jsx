import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { 
  ArrowLeft, Store, Users, Phone, MapPin, 
  ShoppingCart, TrendingUp, Package, XCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'ledger'
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    outstanding: 0,
    pendingOrders: 0
  });

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      // Fetch Customer Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setCustomer(profileData);

      // Fetch Customer Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch Customer Payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      
      if (ordersData) {
        setOrders(ordersData);
        setPayments(paymentsData || []);
        
        // Calculate Stats
        const totalSpent = ordersData
          .filter(o => o.status !== 'cancelled')
          .reduce((acc, curr) => acc + Number(curr.total_amount), 0);
          
        const totalPaid = paymentsData
          ?.filter(p => p.status === 'verified')
          .reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

        const pending = ordersData.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
        
        setStats({
          totalOrders: ordersData.length,
          totalSpent: totalSpent,
          outstanding: totalSpent - totalPaid,
          pendingOrders: pending
        });
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      alert('Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: "Outstanding Balance", value: `₹${stats.outstanding.toLocaleString()}`, icon: TrendingUp, color: "text-brand-berry", bg: "bg-brand-berry/10" },
    { title: "Total Billed", value: `₹${stats.totalSpent.toLocaleString()}`, icon: ShoppingCart, color: "text-brand-caramel", bg: "bg-brand-caramel/10" },
    { title: "Total Orders", value: stats.totalOrders, icon: Package, color: "text-brand-pistachio", bg: "bg-green-400/10" },
    { title: "Pending Deliveries", value: stats.pendingOrders, icon: XCircle, color: "text-brand-honey", bg: "bg-brand-honey/10" },
  ];

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (dateFilter === 'today') {
        matchesDate = orderDate.getTime() === today.getTime();
      } else if (dateFilter === 'yesterday') {
        matchesDate = orderDate.getTime() === yesterday.getTime();
      }
    }
    
    return matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        Loading customer dashboard...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
        <p className="mb-4">Customer not found.</p>
        <Button onClick={() => navigate('/company/customers')}>Back to Customers</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/company/customers')}
            className="p-2 rounded-lg bg-bg-secondary border border-border-light text-text-secondary hover:text-brand-caramel hover:border-brand-caramel transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-3">
              {customer.shop_name}
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                customer.is_approved 
                  ? 'bg-brand-pistachio/10 text-brand-pistachio border-brand-pistachio/20' 
                  : 'bg-brand-honey/10 text-brand-honey border-yellow-500/20'
              }`}>
                {customer.is_approved ? 'Approved' : 'Pending'}
              </span>
            </h1>
            <p className="text-text-secondary text-sm mt-1">Customer Dashboard & Order History</p>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <GlassCard className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-caramel/10 text-brand-caramel rounded-lg">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Owner Name</p>
            <p className="text-sm font-medium text-text-primary">{customer.owner_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-caramel/10 text-brand-caramel rounded-lg">
            <Phone size={20} />
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Phone Number</p>
            <p className="text-sm font-medium text-text-primary">{customer.phone || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-caramel/10 text-brand-caramel rounded-lg">
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Address</p>
            <p className="text-sm font-medium text-text-primary line-clamp-2">{customer.address || 'N/A'}</p>
          </div>
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard hover className="flex items-center gap-4 py-4 px-5">
                <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary font-medium mb-0.5">{stat.title}</p>
                  <h3 className="text-xl font-bold text-text-primary">
                    {stat.value}
                  </h3>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-light pb-2">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 font-bold transition-all ${activeTab === 'orders' ? 'text-brand-caramel border-b-2 border-brand-caramel' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Order History
        </button>
        <button 
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 font-bold transition-all ${activeTab === 'ledger' ? 'text-brand-caramel border-b-2 border-brand-caramel' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Payment Ledger
        </button>
      </div>

      {/* Tab Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {activeTab === 'orders' ? (
          <GlassCard>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Order Logs</h2>
                <p className="text-sm text-text-secondary">Complete history of orders placed by this customer.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-text-secondary">Date:</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-bg-secondary border border-border-light text-text-primary rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                </select>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    statusFilter === status 
                      ? 'bg-brand-caramel text-white shadow-md' 
                      : 'bg-bg-secondary text-text-secondary hover:bg-bg-primary border border-border-light'
                  }`}
                >
                  {status === 'all' ? 'All Orders' : 
                   status === 'out_for_delivery' ? 'Out for Delivery' : 
                   status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-light bg-bg-primary/50">
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap w-12">S.No.</th>
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Order ID</th>
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Date & Time</th>
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Amount</th>
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-text-secondary">
                        No orders found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, index) => (
                      <tr key={order.id} className="border-b border-border-light/50 hover:bg-bg-primary/5 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-text-secondary">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-mono text-brand-caramel whitespace-nowrap">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-primary whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString()} <span className="text-text-secondary text-xs">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-text-primary whitespace-nowrap">
                          ₹{order.total_amount}
                        </td>
                        <td className="py-3 px-4 text-sm whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                            order.status === 'delivered' ? 'bg-brand-pistachio/10 text-brand-pistachio border-brand-pistachio/20' :
                            order.status === 'cancelled' ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/20' :
                            order.status === 'out_for_delivery' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            'bg-brand-honey/10 text-brand-honey border-yellow-500/20'
                          }`}>
                            {order.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-text-primary">Payment Ledger</h2>
              <p className="text-sm text-text-secondary">Complete history of payments made by this customer.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-light bg-bg-primary/50">
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Date & Time</th>
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Amount</th>
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Method</th>
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Ref / UTR</th>
                    <th className="py-3 px-4 text-sm font-semibold text-text-secondary whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-text-secondary">
                        No payments found for this customer.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border-light/50 hover:bg-bg-primary/5 transition-colors">
                        <td className="py-3 px-4 text-sm text-text-primary whitespace-nowrap">
                          {new Date(payment.created_at).toLocaleDateString()} <span className="text-text-secondary text-xs">{new Date(payment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-brand-pistachio whitespace-nowrap">
                          ₹{payment.amount}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-text-secondary uppercase whitespace-nowrap">
                          {payment.payment_method.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-primary font-mono whitespace-nowrap">
                          {payment.reference_id || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                            payment.status === 'verified' ? 'bg-brand-pistachio/10 text-brand-pistachio border-brand-pistachio/20' :
                            payment.status === 'rejected' ? 'bg-brand-berry/10 text-brand-berry border-brand-berry/20' :
                            'bg-brand-honey/10 text-brand-honey border-yellow-500/20'
                          }`}>
                            {payment.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}
