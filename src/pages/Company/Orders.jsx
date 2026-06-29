import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, ChevronDown, Check, Clock, Truck, Package, ClipboardCheck, ChevronRight, User, CreditCard, Banknote, ChevronLeft } from 'lucide-react';
import InvoiceModal from '../../components/ui/InvoiceModal';
import { logCompanyAction } from '../../lib/logger';

function OrderStatusPath({ order, onUpdateStatus }) {
  const stages = [
    { id: 'pending', label: 'Pending', icon: Clock },
    { id: 'confirmed', label: 'Confirmed', icon: ClipboardCheck },
    { id: 'out_for_delivery', label: 'Out For Delivery', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: Package }
  ];

  const currentIndex = stages.findIndex(s => s.id === order.status);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  if (isCancelled) {
    return (
      <div className="mt-5 pt-5 border-t border-gray-200">
        <div className="w-full bg-red-50 text-red-600 rounded-lg p-3 text-center font-[600] text-[14px] border border-red-200">
           This order has been cancelled.
        </div>
        <div className="flex justify-center sm:justify-end mt-4">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-[700] bg-red-100 text-red-700">
                <span className="w-2 h-2 rounded-full bg-red-600"></span> Cancelled
            </span>
        </div>
      </div>
    );
  }

  // Calculate progress fill width based on 4 steps
  const progressWidth = currentIndex === 0 ? '0%' : 
                        currentIndex === 1 ? '33%' : 
                        currentIndex === 2 ? '66%' : '100%';

  return (
    <div className="mt-5 pt-5 border-t border-gray-200">
        <div className="flex items-center relative">
            <div className="absolute top-4 left-[12.5%] right-[12.5%] h-1 bg-gray-200 z-0">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-sm transition-all duration-500" style={{ width: progressWidth }}></div>
            </div>
            
            {stages.map((stage, i) => {
                const isCompleted = currentIndex > i;
                const isCurrent = currentIndex === i;
                const isClickable = i > currentIndex;
                const Icon = isCompleted ? Check : stage.icon;

                return (
                    <div key={stage.id} className={`flex-1 flex flex-col items-center relative z-10 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => isClickable && onUpdateStatus(stage.id)} title={isClickable ? "Click to update status to this stage" : ""}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[14px] mb-2 transition-all duration-300 border-[3px] ${
                            isCompleted ? 'bg-emerald-600 border-emerald-600 text-white' :
                            isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_0_4px_rgba(219,234,254,1)]' :
                            isClickable ? 'bg-white border-gray-200 text-gray-400 hover:border-gray-300' :
                            'bg-white border-gray-200 text-gray-400'
                        }`}>
                            <Icon size={14} />
                        </div>
                        <span className={`text-[12px] font-[600] text-center ${
                            isCompleted ? 'text-emerald-600' :
                            isCurrent ? 'text-blue-600' :
                            'text-gray-500'
                        }`}>
                            {stage.label}
                        </span>
                    </div>
                );
            })}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-6">
            <div className="flex-1 flex justify-center sm:justify-start">
               {currentIndex >= 0 && currentIndex < stages.length - 1 && (
                  <button onClick={() => onUpdateStatus(stages[currentIndex + 1].id)} className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors rounded-lg text-[13px] font-[600] flex items-center gap-2">
                      Mark {stages[currentIndex + 1].label} <ChevronRight size={14} />
                  </button>
               )}
            </div>
            <span className={`self-center sm:self-auto inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 rounded-full text-[13px] font-[700] ${
                currentIndex === stages.length - 1 ? 'bg-emerald-100 text-emerald-700' : 
                currentIndex === 0 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}>
                <span className={`w-2 h-2 rounded-full ${
                    currentIndex === stages.length - 1 ? 'bg-emerald-600' : 
                    currentIndex === 0 ? 'bg-blue-600' : 'bg-amber-600'
                }`}></span>
                {currentIndex === stages.length - 1 ? 'Completed' : currentIndex === 0 ? 'New Order' : 'In Progress'}
            </span>
        </div>
    </div>
  );
}

function CustomDropdown({ value, onChange, options, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-3.5 pl-5 pr-4 border rounded-xl text-[14px] font-[500] shadow-sm transition-all duration-200 focus:outline-none ${
          isOpen ? 'border-red-200 ring-4 ring-red-50 bg-white text-gray-800' : 'border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:shadow-md'
        }`}
      >
        {selectedOption ? selectedOption.label : 'Select...'}
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden py-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-5 py-2.5 text-[14px] transition-colors ${
                value === option.value 
                  ? 'bg-red-50 text-red-600 font-[600]' 
                  : 'text-gray-600 hover:bg-gray-50 font-[500]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [fetchError, setFetchError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const user = useAuthStore.getState().user;
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:customer_id (shop_name, owner_name, phone, address),
          order_items (
            quantity,
            price_at_order,
            products (name, image_url, unit)
          )
        `)
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError(error.message || JSON.stringify(error));
        throw error;
      }
      if (data) {
        setOrders(data);
        setFetchError(null);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (!fetchError) setFetchError(error.message);
    } finally {
      setLoading(false);
    }
  }, [fetchError]);

  useEffect(() => {
    fetchOrders();

    // Set up Realtime subscription
    const channel = supabase.channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    // Optimistic UI Update
    const originalOrders = [...orders];
    setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select();
        
      if (error) {
        throw error;
      }
      
      // If data is empty, it means RLS blocked the update!
      if (!data || data.length === 0) {
        throw new Error("You do not have permission to update this order. Please contact the administrator.");
      }

      // Log the action
      await logCompanyAction({
        companyId: useAuthStore.getState().user.id,
        action: `Order ${newStatus.replace('_', ' ')}`,
        details: `Order #${orderId.slice(0, 8).toUpperCase()} status changed to ${newStatus.replace('_', ' ')}.`,
        userName: useAuthStore.getState().user.user_metadata?.owner_name || 'Staff',
        type: newStatus === 'delivered' ? 'success' : newStatus === 'cancelled' ? 'error' : 'info'
      });
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed: ' + (error.message || 'Unknown error'));
      // Revert if failed
      setOrders(originalOrders);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.profiles?.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.profiles?.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    
    let matchesAmount = true;
    if (amountFilter === 'under_500') matchesAmount = order.total_amount < 500;
    else if (amountFilter === '500_to_2000') matchesAmount = order.total_amount >= 500 && order.total_amount <= 2000;
    else if (amountFilter === 'over_2000') matchesAmount = order.total_amount > 2000;
    
    return matchesSearch && matchesStatus && matchesDate && matchesAmount;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'amount_high') return b.total_amount - a.total_amount;
    if (sortBy === 'amount_low') return a.total_amount - b.total_amount;
    return 0;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getCardBorderColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-600';
      case 'cancelled': return 'bg-gray-400';
      case 'out_for_delivery': return 'bg-blue-600';
      case 'confirmed': return 'bg-amber-600';
      default: return 'bg-red-600'; // pending
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-7">
          <h2 className="text-[28px] font-[800] text-gray-800 mb-1.5 tracking-tight">Order Management</h2>
          <p className="text-[14px] text-gray-500">View and manage customer orders in real-time.</p>
      </div>

      {/* Order Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'].map(status => {
          const count = orders.filter(o => status === 'all' ? true : o.status === status).length;
          return (
            <button
                key={status}
                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                className={`px-5 py-2.5 border rounded-xl text-[14px] font-[500] transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 ${
                statusFilter === status 
                    ? 'bg-red-50 text-red-600 border-red-600 font-[600]' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:shadow-sm'
                }`}
            >
                {status === 'all' ? 'All Orders' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {count > 0 && (
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-[700] ${
                    statusFilter === status ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                    {count}
                </span>
                )}
            </button>
          )
        })}
      </div>

      {/* Search Section */}
      <div className="flex gap-3 mb-8 flex-wrap">
          <div className="flex-1 relative min-w-[250px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                  type="text" 
                  placeholder="Search Order ID, Shop name, or customer..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full py-3.5 pr-4 pl-12 border border-gray-200 rounded-xl text-[14px] text-gray-800 bg-white shadow-sm transition-all duration-200 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-50 placeholder:text-gray-400"
              />
          </div>
          
          <CustomDropdown 
            value={dateFilter} 
            onChange={(val) => { setDateFilter(val); setCurrentPage(1); }} 
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' }
            ]} 
            className="min-w-[140px]" 
          />

          <CustomDropdown 
            value={amountFilter} 
            onChange={(val) => { setAmountFilter(val); setCurrentPage(1); }} 
            options={[
              { value: 'all', label: 'All Amounts' },
              { value: 'under_500', label: 'Under ₹500' },
              { value: '500_to_2000', label: '₹500 - ₹2000' },
              { value: 'over_2000', label: 'Over ₹2000' }
            ]} 
            className="min-w-[160px]" 
          />

          <CustomDropdown 
            value={sortBy} 
            onChange={(val) => { setSortBy(val); setCurrentPage(1); }} 
            options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'amount_high', label: 'High to Low' },
              { value: 'amount_low', label: 'Low to High' }
            ]} 
            className="min-w-[150px]" 
          />
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-4">
        {fetchError ? (
          <div className="text-center py-12 text-red-600 bg-red-50 rounded-xl border border-red-200">
            <h3 className="font-[700] text-[18px]">Error loading orders</h3>
            <p className="font-mono text-[14px] mt-2">{fetchError}</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-gray-500 text-[14px]">Loading orders...</div>
        ) : paginatedOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-[14px]">No orders found matching your criteria.</div>
        ) : (
          paginatedOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-gray-200 p-6 transition-all duration-300 relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[2px]">

                <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-[14px] font-[700] text-red-600">#{order.id.slice(0, 8).toUpperCase()}</span>
                            <span className="text-[13px] text-gray-500">{new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        <div className="mb-4">
                            <div className="text-[18px] font-[700] text-gray-800 mb-1">{order.profiles?.shop_name || 'Unknown Shop'}</div>
                            <div className="text-[13px] text-gray-500 mb-2">
                                <User size={12} className="inline text-red-600 mr-1" /> {order.profiles?.owner_name || 'No Owner Name'} &bull; {order.profiles?.phone || 'No Phone'}
                            </div>
                            <div className="text-[14px] text-gray-800 font-[500] mt-3">
                                Items: <span className="text-gray-500 font-[400] leading-relaxed">
                                  {order.order_items?.slice(0, 3).map(item => `${item.quantity}x ${item.products?.name || 'Deleted Product'}`).join(', ')}
                                  {order.order_items?.length > 3 && ` + ${order.order_items.length - 3} more`}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="text-left md:text-right w-full md:w-auto flex flex-col md:items-end">
                        <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Total Amount</div>
                        <div className="text-[22px] font-[800] text-red-600 leading-none mb-3">₹{order.total_amount}</div>
                        
                        <div className="flex items-center gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-[700] ${
                                order.payment_method === 'cod' ? 'bg-emerald-100 text-emerald-700' :
                                order.payment_method === 'upi' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                            }`}>
                               {order.payment_method === 'cod' ? <><Banknote size={14}/> COD</> : order.payment_method === 'upi' ? <><CreditCard size={14}/> UPI</> : <><Clock size={14}/> Pay Later</>}
                            </div>
                            
                            <button onClick={() => setSelectedInvoice(order)} className="px-4 py-1.5 border border-gray-200 rounded-lg bg-white text-red-600 text-[13px] font-[600] cursor-pointer transition-all hover:bg-red-50 hover:border-red-600 whitespace-nowrap">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress Bar & Status Updater */}
                <OrderStatusPath order={order} onUpdateStatus={(newStatus) => updateOrderStatus(order.id, newStatus)} />
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8 mb-4">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx + 1}
              onClick={() => setCurrentPage(idx + 1)}
              className={`w-9 h-9 rounded-full text-[14px] font-[600] flex items-center justify-center transition-all ${
                currentPage === idx + 1 
                  ? 'bg-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {idx + 1}
            </button>
          ))}

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {selectedInvoice && (
        <InvoiceModal 
          order={selectedInvoice} 
          profile={selectedInvoice.profiles} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </div>
  );
}
