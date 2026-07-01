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
    const duration = 1000;
    const incrementTime = Math.max(duration / end, 10);

    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{count}</span>;
};

// Helper to generate a gradient based on the customer name
const getGradient = (name) => {
    const gradients = [
        'from-amber-100 to-amber-200 text-amber-700 border-amber-200',
        'from-blue-100 to-blue-200 text-blue-700 border-blue-200',
        'from-purple-100 to-purple-200 text-purple-700 border-purple-200',
        'from-pink-100 to-pink-200 text-pink-700 border-pink-200',
        'from-red-100 to-red-200 text-red-700 border-red-200',
        'from-orange-100 to-orange-200 text-orange-700 border-orange-200',
        'from-emerald-100 to-emerald-200 text-emerald-700 border-emerald-200',
    ];
    if (!name) return gradients[0];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return gradients[sum % gradients.length];
};

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Details View
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'payments'

  // Stats
  const [stats, setStats] = useState({
      total: 0,
      active: 0,
      newThisMonth: 0
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: rawCustomers, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const { data: companiesData } = await supabase
        .from('profiles')
        .select('id, shop_name')
        .eq('role', 'company');

      const companiesMap = new Map();
      if (companiesData) {
          companiesData.forEach(c => companiesMap.set(c.id, c));
      }

      const fetchedCustomers = (rawCustomers || []).map(customer => {
          return {
              ...customer,
              company: companiesMap.get(customer.company_id) || null
          };
      });
      setCustomers(fetchedCustomers);

      // Calculate stats
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      setStats({
          total: fetchedCustomers.length,
          active: fetchedCustomers.filter(c => c.is_approved).length,
          newThisMonth: fetchedCustomers.filter(c => new Date(c.created_at) >= firstDayOfMonth).length
      });

    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setCustomers(customers.map(c => 
        c.id === id ? { ...c, is_approved: !currentStatus } : c
      ));

      // Re-calculate active stats
      setStats(prev => ({
          ...prev,
          active: currentStatus ? prev.active - 1 : prev.active + 1
      }));
    } catch (error) {
      console.error('Error toggling approval:', error);
      alert('Failed to update customer status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCustomers(customers.filter(c => c.id !== id));
      if (selectedCustomer && selectedCustomer.id === id) setSelectedCustomer(null);
      fetchCustomers(); // Refresh stats fully
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    }
  };

  const handleOpenEdit = (customer, e) => {
    e.stopPropagation();
    setEditingCustomer({
      id: customer.id,
      owner_name: customer.owner_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || ''
    });
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          owner_name: editingCustomer.owner_name,
          phone: editingCustomer.phone,
          address: editingCustomer.address
        })
        .eq('id', editingCustomer.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();

      if (selectedCustomer && selectedCustomer.id === editingCustomer.id) {
          setSelectedCustomer(prev => ({...prev, ...editingCustomer}));
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      setErrorMsg(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchCustomerDetails = async (customer) => {
    setSelectedCustomer(customer);
    setDetailsLoading(true);
    setActiveTab('orders');
    try {
      // Fetch Customer Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch Customer Payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const totalBilled = ordersData
          ?.filter(o => o.status === 'delivered')
          .reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
          
      const totalPaid = paymentsData
          ?.filter(p => p.status === 'verified')
          .reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setCustomerDetails({
        orders: ordersData || [],
        payments: paymentsData || [],
        totalBilled,
        totalPaid,
        outstanding: totalBilled - totalPaid
      });
    } catch (error) {
      console.error('Error fetching customer details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Filtering Logic
  const filteredCustomers = customers.filter(customer => {
      const matchesSearch = 
          (customer.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (customer.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (customer.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (customer.company?.shop_name || '').toLowerCase().includes(searchQuery.toLowerCase());
          
      const matchesStatus = 
          filterStatus === 'All Status' || 
          (filterStatus === 'Active' && customer.is_approved) ||
          (filterStatus === 'Inactive' && !customer.is_approved);

      return matchesSearch && matchesStatus;
  });

  // Details View Output
  if (selectedCustomer) {
      return (
          <div className="space-y-6 fade-in pb-10">
              {/* Header & Back Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                      <button 
                          onClick={() => setSelectedCustomer(null)}
                          className="w-10 h-10 shrink-0 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
                      >
                          <i className="fas fa-arrow-left"></i>
                      </button>
                      <div>
                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                              {selectedCustomer.owner_name || 'N/A'}
                              {selectedCustomer.is_approved ? (
                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 uppercase tracking-wider">Active</span>
                              ) : (
                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-red-50 text-red-600 rounded-lg border border-red-100 uppercase tracking-wider">Inactive</span>
                              )}
                          </h2>
                          <p className="text-sm text-gray-500 font-medium mt-0.5">Customer ID: <span className="text-gray-700">#{selectedCustomer.id.substring(0,8).toUpperCase()}</span></p>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button 
                          onClick={(e) => handleOpenEdit(selectedCustomer, e)}
                          className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-100"
                      >
                          <i className="fas fa-pen"></i> Edit Profile
                      </button>
                  </div>
              </div>

              {detailsLoading ? (
                  <div className="flex flex-col justify-center items-center py-20 bg-white rounded-2xl border border-gray-100">
                      <i className="fas fa-circle-notch fa-spin text-4xl text-red-500 mb-4"></i>
                      <p className="text-gray-500 font-medium">Loading customer history...</p>
                  </div>
              ) : (
                  <>
                      {/* Financial Overview Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="glass-card rounded-2xl p-6 border border-gray-100 bg-white shadow-sm flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl border border-blue-100">
                                  <i className="fas fa-file-invoice-dollar"></i>
                              </div>
                              <div>
                                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Total Billed</p>
                                  <h3 className="text-2xl font-black text-gray-800">₹{customerDetails?.totalBilled?.toLocaleString()}</h3>
                              </div>
                          </div>
                          
                          <div className="glass-card rounded-2xl p-6 border border-gray-100 bg-white shadow-sm flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl border border-emerald-100">
                                  <i className="fas fa-money-bill-wave"></i>
                              </div>
                              <div>
                                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Total Paid</p>
                                  <h3 className="text-2xl font-black text-gray-800">₹{customerDetails?.totalPaid?.toLocaleString()}</h3>
                              </div>
                          </div>
                          
                          <div className="glass-card rounded-2xl p-6 border border-gray-100 bg-white shadow-sm flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${
                                  (customerDetails?.outstanding || 0) > 0 
                                  ? 'bg-red-50 text-red-600 border-red-100' 
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                  <i className="fas fa-balance-scale"></i>
                              </div>
                              <div>
                                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Outstanding</p>
                                  <h3 className={`text-2xl font-black ${(customerDetails?.outstanding || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                      ₹{(customerDetails?.outstanding || 0).toLocaleString()}
                                  </h3>
                              </div>
                          </div>
                      </div>

                      {/* Tabs */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="flex border-b border-gray-100">
                              <button 
                                  onClick={() => setActiveTab('orders')}
                                  className={`flex-1 sm:flex-none px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
                                      activeTab === 'orders' 
                                      ? 'border-red-500 text-red-600 bg-red-50/30' 
                                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                  }`}
                              >
                                  <i className="fas fa-box"></i> Order History
                                  <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{customerDetails?.orders?.length || 0}</span>
                              </button>
                              <button 
                                  onClick={() => setActiveTab('payments')}
                                  className={`flex-1 sm:flex-none px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
                                      activeTab === 'payments' 
                                      ? 'border-red-500 text-red-600 bg-red-50/30' 
                                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                  }`}
                              >
                                  <i className="fas fa-receipt"></i> Payment History
                                  <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{customerDetails?.payments?.length || 0}</span>
                              </button>
                          </div>

                          <div className="p-6">
                              {/* Orders Tab */}
                              {activeTab === 'orders' && (
                                  <div className="overflow-x-auto">
                                      {customerDetails?.orders?.length === 0 ? (
                                          <div className="text-center py-10">
                                              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 text-2xl mx-auto mb-3">
                                                  <i className="fas fa-box-open"></i>
                                              </div>
                                              <p className="text-gray-500 font-medium">No orders found for this customer.</p>
                                          </div>
                                      ) : (
                                          <table className="w-full">
                                              <thead>
                                                  <tr className="bg-gray-50 rounded-xl">
                                                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase rounded-l-xl">Order ID</th>
                                                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                                      <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase rounded-r-xl">Total Amount</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-50">
                                                  {customerDetails?.orders?.map(order => (
                                                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                                          <td className="py-4 px-4 whitespace-nowrap">
                                                              <span className="font-bold text-gray-700 text-sm">#{order.id.substring(0,8).toUpperCase()}</span>
                                                          </td>
                                                          <td className="py-4 px-4 text-sm text-gray-600">
                                                              {new Date(order.created_at).toLocaleDateString()}
                                                          </td>
                                                          <td className="py-4 px-4">
                                                              {order.status === 'delivered' ? (
                                                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 uppercase">Delivered</span>
                                                              ) : order.status === 'pending' ? (
                                                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-600 rounded-md border border-amber-100 uppercase">Pending</span>
                                                              ) : order.status === 'cancelled' ? (
                                                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-red-50 text-red-600 rounded-md border border-red-100 uppercase">Cancelled</span>
                                                              ) : (
                                                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-md border border-blue-100 uppercase">{order.status}</span>
                                                              )}
                                                          </td>
                                                          <td className="py-4 px-4 text-right">
                                                              <span className="font-bold text-gray-800">₹{order.total_amount?.toLocaleString()}</span>
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      )}
                                  </div>
                              )}

                              {/* Payments Tab */}
                              {activeTab === 'payments' && (
                                  <div className="overflow-x-auto">
                                      {customerDetails?.payments?.length === 0 ? (
                                          <div className="text-center py-10">
                                              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 text-2xl mx-auto mb-3">
                                                  <i className="fas fa-receipt"></i>
                                              </div>
                                              <p className="text-gray-500 font-medium">No payments found for this customer.</p>
                                          </div>
                                      ) : (
                                          <table className="w-full">
                                              <thead>
                                                  <tr className="bg-gray-50 rounded-xl">
                                                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase rounded-l-xl">Payment ID</th>
                                                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Method</th>
                                                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                                      <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase rounded-r-xl">Amount</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-50">
                                                  {customerDetails?.payments?.map(payment => (
                                                      <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                                                          <td className="py-4 px-4 whitespace-nowrap">
                                                              <span className="font-bold text-gray-700 text-sm">#{payment.id.substring(0,8).toUpperCase()}</span>
                                                          </td>
                                                          <td className="py-4 px-4 text-sm text-gray-600">
                                                              {new Date(payment.created_at).toLocaleDateString()}
                                                          </td>
                                                          <td className="py-4 px-4">
                                                              <div className="flex items-center gap-2">
                                                                  <i className={`fas ${payment.payment_method === 'cash' ? 'fa-money-bill text-emerald-500' : 'fa-university text-blue-500'} text-xs`}></i>
                                                                  <span className="text-sm font-medium text-gray-700 capitalize">{payment.payment_method}</span>
                                                              </div>
                                                          </td>
                                                          <td className="py-4 px-4">
                                                              {payment.status === 'verified' ? (
                                                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 uppercase">Verified</span>
                                                              ) : payment.status === 'pending' ? (
                                                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-600 rounded-md border border-amber-100 uppercase">Pending</span>
                                                              ) : payment.status === 'rejected' ? (
                                                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-red-50 text-red-600 rounded-md border border-red-100 uppercase">Rejected</span>
                                                              ) : (
                                                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-md border border-gray-200 uppercase">{payment.status}</span>
                                                              )}
                                                          </td>
                                                          <td className="py-4 px-4 text-right">
                                                              <span className="font-bold text-gray-800">₹{payment.amount?.toLocaleString()}</span>
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>
                  </>
              )}
          </div>
      );
  }

  return (
    <div className="space-y-8 pb-10">
        
        {/* Top Bar Equivalent (Header Area) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 fade-in" style={{ animationDelay: '0.1s' }}>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Manage <span className="gradient-text">Customers</span></h2>
                <p className="text-sm text-gray-500 mt-1 font-medium">View and manage all customer accounts across all companies</p>
            </div>
            {/* Action buttons could go here */}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Total Customers */}
            <div className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-start justify-between mb-4">
                    <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-600 text-2xl shadow-sm border border-red-100/50">
                        <i className="fas fa-users"></i>
                    </div>
                    <div className="relative">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                    </div>
                </div>
                <h3 className="text-4xl font-bold text-gray-800 mb-1">
                    <AnimatedCounter target={stats.total} />
                </h3>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Total Customers</p>
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: '100%' }}></div>
                </div>
            </div>

            {/* Active Customers */}
            <div className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-start justify-between mb-4">
                    <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-sm border border-emerald-100/50">
                        <i className="fas fa-user-check"></i>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <i className="fas fa-arrow-up text-xs"></i> {(stats.total > 0 ? Math.round((stats.active/stats.total)*100) : 0)}%
                    </span>
                </div>
                <h3 className="text-4xl font-bold text-gray-800 mb-1">
                    <AnimatedCounter target={stats.active} />
                </h3>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Active Customers</p>
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${stats.total > 0 ? (stats.active/stats.total)*100 : 0}%` }}></div>
                </div>
            </div>

            {/* New This Month */}
            <div className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-start justify-between mb-4">
                    <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-sm border border-blue-100/50">
                        <i className="fas fa-user-plus"></i>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                        <i className="fas fa-plus text-xs"></i> New
                    </span>
                </div>
                <h3 className="text-4xl font-bold text-gray-800 mb-1">
                    <AnimatedCounter target={stats.newThisMonth} />
                </h3>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">New This Month</p>
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: '33%' }}></div>
                </div>
            </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between fade-in relative z-20" style={{ animationDelay: '0.5s' }}>
            <div className="flex gap-4 w-full lg:w-auto flex-1 flex-col sm:flex-row">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input 
                        type="text" 
                        placeholder="Search customers by name, email, phone..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-red-500 shadow-sm"
                    />
                </div>
                {/* Filters */}
                <div className="relative shrink-0 sm:w-40" style={{ minWidth: '160px' }}>
                    <button 
                        type="button"
                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                        className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 focus:outline-none focus:border-red-500 hover:border-gray-300 transition-colors shadow-sm"
                    >
                        <span>{filterStatus}</span>
                        <i className={`fas fa-chevron-down text-xs transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    
                    {isStatusOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsStatusOpen(false)}></div>
                            <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden py-1">
                                {['All Status', 'Active', 'Inactive'].map((status) => (
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
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
            </div>
        </div>

        {/* Content Views */}
        {loading ? (
            <div className="flex flex-col justify-center items-center py-20 fade-in">
                <i className="fas fa-circle-notch fa-spin text-4xl text-red-500 mb-4"></i>
                <p className="text-gray-500 font-medium">Loading customers data...</p>
            </div>
        ) : (
            <>
                {/* TABLE VIEW */}
                    <div className="glass-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden fade-in" style={{ animationDelay: '0.6s' }}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-100">
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-16">S.No</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Info</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                                        <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredCustomers.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="py-12 text-center text-gray-500">
                                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 text-3xl mb-4 border border-gray-100">
                                                    <i className="fas fa-users-slash"></i>
                                                </div>
                                                <p className="font-bold text-gray-700 text-base">No customers found</p>
                                                <p className="text-sm mt-1 font-medium text-gray-500">Try adjusting your search or filters.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCustomers.map((customer, index) => {
                                            const grad = getGradient(customer.owner_name);
                                            return (
                                                <motion.tr 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    key={customer.id} 
                                                    className="table-row hover:bg-gray-50/50 cursor-pointer"
                                                    onClick={() => fetchCustomerDetails(customer)}
                                                >
                                                    <td className="py-5 px-6 text-sm font-bold text-gray-400 whitespace-nowrap">{index + 1}</td>
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`customer-avatar w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-lg shadow-sm border ${grad}`}>
                                                                {customer.owner_name ? customer.owner_name.charAt(0).toUpperCase() : 'C'}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-gray-800">{customer.owner_name || 'N/A'}</h4>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <div className="space-y-2">
                                                            <div className="contact-chip inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-600">
                                                                <i className="fas fa-envelope text-red-400 text-xs w-4"></i>
                                                                <span className="text-xs font-medium">{customer.email || 'N/A'}</span>
                                                            </div>
                                                            <div className="contact-chip inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-600 mt-1">
                                                                <i className="fas fa-phone text-red-400 text-xs w-4"></i>
                                                                <span className="text-xs font-bold">{customer.phone || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <div 
                                                            className={`flex items-center gap-2 ${customer.company_id ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                                            onClick={(e) => {
                                                                if (customer.company_id) {
                                                                    e.stopPropagation();
                                                                    navigate('/admin/companies', { state: { openCompanyId: customer.company_id, returnTo: '/admin/customers' } });
                                                                }
                                                            }}
                                                            title={customer.company_id ? "View Company Details" : ""}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold border border-gray-200">
                                                                <i className="fas fa-building"></i>
                                                            </div>
                                                            <span className={`text-sm font-bold ${customer.company_id ? 'text-blue-600 hover:text-blue-700 hover:underline' : 'text-gray-700'}`}>
                                                                {customer.company?.shop_name || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                                            <i className="far fa-calendar-alt text-gray-400"></i>
                                                            <span>{new Date(customer.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        {customer.is_approved ? (
                                                            <span className="status-badge inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm">
                                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="status-badge inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-full border border-red-100 shadow-sm">
                                                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleToggleApproval(customer.id, customer.is_approved); }}
                                                                className={`action-btn w-9 h-9 rounded-lg flex items-center justify-center shadow-sm border ${
                                                                    customer.is_approved 
                                                                        ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' 
                                                                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                                                }`}
                                                                title={customer.is_approved ? "Block Customer" : "Approve Customer"}
                                                            >
                                                                <i className={`fas ${customer.is_approved ? 'fa-ban' : 'fa-check'} text-xs`}></i>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => handleOpenEdit(customer, e)}
                                                                className="action-btn w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm hover:bg-blue-100"
                                                                title="Edit Customer"
                                                            >
                                                                <i className="fas fa-pen text-xs"></i>
                                                            </button>

                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}
                                                                className="delete-btn action-btn w-9 h-9 rounded-lg bg-gray-50 text-gray-400 border border-gray-200 flex items-center justify-center shadow-sm hover:text-red-600 hover:bg-red-50 hover:border-red-100"
                                                                title="Delete Customer"
                                                            >
                                                                <i className="fas fa-trash-alt text-xs"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Footer */}
                        {filteredCustomers.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
                                <p className="text-sm text-gray-500 font-medium">Showing <span className="font-bold text-gray-800">1-{filteredCustomers.length}</span> of <span className="font-bold text-gray-800">{filteredCustomers.length}</span> customers</p>
                                <div className="flex items-center gap-2">
                                    <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-600 transition-colors shadow-sm" disabled>
                                        <i className="fas fa-chevron-left text-xs"></i>
                                    </button>
                                    <button className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-red-500/30 border-none">1</button>
                                    <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-600 transition-colors shadow-sm" disabled>
                                        <i className="fas fa-chevron-right text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
            </>
        )}

        {/* Edit Customer Modal */}
        {isEditModalOpen && editingCustomer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div 
                    className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
                    onClick={() => !isUpdating && setIsEditModalOpen(false)}
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative z-10 bg-white"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Edit Customer</h3>
                        <button 
                            onClick={() => !isUpdating && setIsEditModalOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleUpdateCustomer} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Owner Name</label>
                            <input 
                                type="text" 
                                required
                                value={editingCustomer.owner_name}
                                onChange={e => setEditingCustomer({...editingCustomer, owner_name: e.target.value})}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                            <input 
                                type="email" 
                                value={editingCustomer.email}
                                disabled
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed transition-colors"
                                title="Email cannot be changed as it is used for login"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                            <input 
                                type="text" 
                                value={editingCustomer.phone}
                                onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                            <input 
                                type="text" 
                                value={editingCustomer.address}
                                onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-500 transition-colors"
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit"
                                disabled={isUpdating}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
                            >
                                {isUpdating ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
    </div>
  );
}
