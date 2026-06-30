import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useOrderStore } from '../../store/useOrderStore';
import { ShoppingBag, Package, Loader2, FileText, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import InvoiceModal from '../../components/ui/InvoiceModal';
import ReorderModal from '../../components/ui/ReorderModal';
import OrderEditModal from '../../components/ui/OrderEditModal';
import Button from '../../components/ui/Button';
import './Orders.css';

const OrderCard = ({ order, index, setCancellingOrderId, setSelectedInvoice, setReorderOrder, setEditingOrder }) => {
  const getStatusDetails = (status) => {
    switch (status) {
      case 'delivered': return { text: 'Delivered', class: 'status-delivered' };
      case 'confirmed': return { text: 'Confirmed', class: 'status-confirmed' };
      case 'out_for_delivery': return { text: 'Out for Delivery', class: 'status-delivered' };
      case 'cancelled': return { text: 'Cancelled', class: 'status-cancelled' };
      default: return { text: 'Pending', class: 'status-pending' };
    }
  };

  const statusDetails = getStatusDetails(order.status);

  // Timeline Logic
  const timelineSteps = [
    { key: 'ordered', label: 'Ordered' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' }
  ];

  const getStepStatus = (stepIndex) => {
    if (order.status === 'cancelled') return 'incomplete';

    let currentIdx = 0;
    if (order.status === 'pending') currentIdx = 0;
    if (order.status === 'confirmed') currentIdx = 2; // skip to preparing since no preparing status in db
    if (order.status === 'out_for_delivery') currentIdx = 3;
    if (order.status === 'delivered') currentIdx = 4;

    if (stepIndex < currentIdx) return 'completed';
    if (stepIndex === currentIdx) return 'current';
    return 'pending';
  };

  return (
    <div className="order-card">
      <div className="order-header">
        <div className="order-meta">
          <div className="order-id">Order #{order.id.split('-')[0]}</div>
          <div className="order-date">Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}</div>
        </div>
        <div className="order-total">
          <div className="total-label">Total Amount</div>
          <div className="total-amount">₹{order.total_amount}</div>
          <div className="payment-badge">💳 {order.payment_method === 'cod' ? 'COD' : order.payment_method === 'upi' ? 'UPI' : 'Pay Later'}</div>
        </div>
      </div>

      {order.status !== 'cancelled' && (
        <div className="timeline">
          {timelineSteps.map((step, i) => {
            const status = getStepStatus(i);
            return (
              <div key={step.key} className={`timeline-step ${status === 'completed' || status === 'current' ? '' : 'incomplete'}`}>
                <div className={`step-icon ${status}`}>
                  {status === 'completed' ? '✓' : status === 'current' ? '●' : '○'}
                </div>
                <span className="step-label">{step.label}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="items-section">
        <div className="items-header">Items Ordered</div>
        {order.order_items.map((item, i) => (
          <div key={i} className="item-row">
            <div className="item-img">
              {item.products?.image_url ? (
                <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
              ) : '📦'}
            </div>
            <div className="item-info">
              <div className="item-name">{item.products?.name}</div>
              <div className="item-qty">{item.quantity} × ₹{item.price_at_order} (per {item.products?.unit})</div>
            </div>
            <div className="item-price">₹{(item.quantity * item.price_at_order).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="card-footer">
        <div className="order-status-group">
          <span className={`status-badge ${statusDetails.class}`}>
            <span className="status-dot"></span>
            {statusDetails.text}
          </span>
        </div>
        <div className="footer-actions">
          {order.status === 'pending' && (
            <>
              <button
                onClick={() => setEditingOrder(order)}
                className="order-btn order-btn-ghost !text-blue-600 !border-blue-200 hover:!bg-blue-50"
              >
                ✏️ Edit Order
              </button>
              <button
                onClick={() => setCancellingOrderId(order.id)}
                className="order-btn order-btn-ghost !text-red-600 !border-red-200 hover:!bg-red-50"
              >
                Cancel Order
              </button>
            </>
          )}
          {order.status !== 'pending' && (
            <button onClick={() => setReorderOrder(order)} className="order-btn order-btn-ghost">
              🔄 Reorder
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function MyOrders() {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const { orders, loading, fetchOrders, cancelOrderLocally } = useOrderStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [reorderOrder, setReorderOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (user) {
      fetchOrders(user.id);
    }
  }, [user, fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const cancelOrder = async (orderId) => {
    setCancellingOrderId(null);
    const originalOrders = [...orders];
    cancelOrderLocally(orderId);

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Aapke paas order cancel karne ki permission nahi hai. Kripya admin se 'Customer UPDATE Policy' on karne ko kahein.");
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Failed to cancel order: ' + (err.message || 'Unknown error'));
      // Rollback on failure is tricky with just Zustand if we don't have a rollback function, 
      // but we can just force a refetch to get the accurate state.
      fetchOrders(user.id, true);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'delivery') return order.status === 'out_for_delivery';
    return order.status === statusFilter;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const currentOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPaginationArray = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage, '...', totalPages];
  };

  return (
    <div className="orders-page-wrapper">
      <div className="orders-main">
        <div className="page-header">
          <h1>My Orders</h1>
          <p>Track and view your past orders with real-time updates.</p>
        </div>

        <div className="filter-bar">
          <button className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}><span>All Orders</span></button>
          <button className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => setStatusFilter('pending')}><span>Pending</span></button>
          <button className={`filter-btn ${statusFilter === 'confirmed' ? 'active' : ''}`} onClick={() => setStatusFilter('confirmed')}><span>Confirmed</span></button>
          <button className={`filter-btn ${statusFilter === 'delivery' ? 'active' : ''}`} onClick={() => setStatusFilter('delivery')}><span>Out for Delivery</span></button>
          <button className={`filter-btn ${statusFilter === 'delivered' ? 'active' : ''}`} onClick={() => setStatusFilter('delivered')}><span>Delivered</span></button>
          <button className={`filter-btn ${statusFilter === 'cancelled' ? 'active' : ''}`} onClick={() => setStatusFilter('cancelled')}><span>Cancelled</span></button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20 relative z-10">
            <Loader2 className="animate-spin text-brand-berry" size={32} />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center bg-white/50 backdrop-blur-md rounded-2xl border border-red-50 shadow-sm relative z-10">
            <ShoppingBag size={48} className="text-text-muted mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-text-primary mb-2">No orders yet</h2>
            <p className="text-sm text-text-secondary mb-6">You haven't placed any orders with us yet.</p>
            <Link to="/customer/catalog" className="order-btn order-btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
            <ShoppingBag size={48} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">No orders found</h2>
            <p className="text-sm text-gray-500 mb-6">We couldn't find any {statusFilter} orders.</p>
            <Button onClick={() => setStatusFilter('all')} className="bg-red-600 hover:bg-red-700 text-white">View All Orders</Button>
          </div>
        ) : (
          <div className="space-y-6 print:hidden">
            {currentOrders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                setCancellingOrderId={setCancellingOrderId}
                setSelectedInvoice={setSelectedInvoice}
                setReorderOrder={setReorderOrder}
                setEditingOrder={setEditingOrder}
              />
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-10 pb-8 gap-1.5 print:hidden">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`p-1.5 mx-1 rounded-full transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'}`}
                >
                  <ChevronLeft size={24} strokeWidth={2.5} />
                </button>

                {getPaginationArray().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && handlePageChange(page)}
                    disabled={typeof page !== 'number'}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-[15px] font-bold transition-all ${page === currentPage
                        ? 'bg-[#E31837] text-white shadow-[0_8px_16px_rgba(227,24,55,0.3)]'
                        : typeof page !== 'number'
                          ? 'text-slate-500 cursor-default bg-transparent'
                          : 'text-slate-600 hover:bg-red-50 hover:text-[#E31837] bg-transparent'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 mx-1 rounded-full transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'}`}
                >
                  <ChevronRight size={24} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedInvoice && (
        <div className="relative z-50">
          <InvoiceModal
            order={selectedInvoice}
            profile={profile || user?.user_metadata || { shop_name: 'Your Shop', owner_name: 'Owner', address: 'Address', phone: 'Phone' }}
            onClose={() => setSelectedInvoice(null)}
          />
        </div>
      )}

      {editingOrder && (
        <div className="relative z-50">
          <OrderEditModal
            order={editingOrder}
            onClose={() => setEditingOrder(null)}
            onSave={() => {
              setEditingOrder(null);
              fetchOrders(user.id);
            }}
          />
        </div>
      )}

      {reorderOrder && (
        <ReorderModal
          order={reorderOrder}
          profile={profile}
          user={user}
          onClose={() => setReorderOrder(null)}
          onOrderPlaced={() => {
            setReorderOrder(null);
            fetchMyOrders();
          }}
        />
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-red-100 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cancel Order</h3>
                <p className="text-sm text-slate-500">Are you sure you want to cancel this order? This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                className="py-2"
                onClick={() => setCancellingOrderId(null)}
              >
                Keep Order
              </Button>
              <Button
                className="py-2 bg-red-600 hover:bg-red-700 text-white border-transparent shadow-lg shadow-red-600/20"
                onClick={() => cancelOrder(cancellingOrderId)}
              >
                Yes, Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
