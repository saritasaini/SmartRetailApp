import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { Search, IndianRupee, CheckCircle, XCircle, Clock, Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentManagement() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // default to pending to process them
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPayment, setNewPayment] = useState({
    customer_id: '',
    amount: '',
    payment_method: 'cash',
    reference_id: '',
    notes: ''
  });

  const fetchPaymentsAndCustomers = async () => {
    setLoading(true);
    try {
      // Fetch Payments
      const user = useAuthStore.getState().user;
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          profiles:customer_id (shop_name, owner_name, phone)
        `)
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      
      // Fetch Customers for the manual add dropdown
      const { data: customersData, error: customersError } = await supabase
        .from('profiles')
        .select('id, shop_name')
        .eq('role', 'customer')
        .eq('company_id', user.id)
        .eq('is_approved', true);

      if (customersError) throw customersError;

      // Fetch Orders for balance calculation
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('customer_id, total_amount, status')
        .eq('company_id', user.id)
        .neq('status', 'cancelled');
        
      if (ordersError) throw ordersError;

      // Calculate balances
      const balances = {};
      if (customersData) {
        customersData.forEach(c => balances[c.id] = 0);
      }
      
      if (ordersData) {
        ordersData.forEach(o => {
          if (balances[o.customer_id] !== undefined) {
             balances[o.customer_id] += Number(o.total_amount);
          }
        });
      }

      if (paymentsData) {
        paymentsData.forEach(p => {
          if (p.status === 'verified') {
            if (balances[p.customer_id] !== undefined) {
              balances[p.customer_id] -= Number(p.amount);
            }
          }
        });
      }

      // Filter customers with dues
      const customersWithDues = customersData
        .filter(c => balances[c.id] > 0)
        .map(c => ({
           ...c,
           due_amount: balances[c.id]
        }));

      setPayments(paymentsData || []);
      setCustomers(customersWithDues || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsAndCustomers();
  }, []);

  const updatePaymentStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this payment as ${status.toUpperCase()}?`)) return;
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      fetchPaymentsAndCustomers();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update payment status.');
    }
  };

  const handleManualPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.customer_id || !newPayment.amount) return;

    const user = useAuthStore.getState().user;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          company_id: user.id,
          customer_id: newPayment.customer_id,
          amount: Number(newPayment.amount),
          payment_method: newPayment.payment_method,
          reference_id: newPayment.reference_id,
          notes: newPayment.notes || 'Manually logged by Admin',
          status: 'verified' // Auto-verify admin added payments
        });

      if (error) throw error;

      setIsAddModalOpen(false);
      setNewPayment({ customer_id: '', amount: '', payment_method: 'cash', reference_id: '', notes: '' });
      fetchPaymentsAndCustomers();
    } catch (error) {
      console.error('Error logging payment:', error);
      alert('Failed to log payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.profiles?.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.reference_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Payment Verification</h1>
          <p className="text-text-secondary">Verify customer payments and log manual receipts.</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2"
        >
          <Plus size={18} /> Log Received Payment
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between md:items-center">
        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 items-center">
          {['pending', 'verified', 'rejected', 'all'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap border ${
                statusFilter === status 
                  ? 'bg-brand-caramel/10 border-brand-caramel/30 text-brand-caramel shadow-sm' 
                  : 'bg-bg-secondary border-border-light/50 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} {status === 'pending' && payments.filter(p => p.status === 'pending').length > 0 && `(${payments.filter(p => p.status === 'pending').length})`}
            </button>
          ))}
        </div>

        <GlassCard className="flex flex-1 items-center gap-2 px-4 py-2.5 w-full ml-auto md:max-w-xs">
          <Search className="text-text-secondary shrink-0" size={18} />
          <input 
            type="text" 
            placeholder="Search Shop or UTR..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-text-primary focus:outline-none w-full text-sm"
          />
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light bg-bg-tertiary/50">
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Date & Time</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Shop Details</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Amount</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Method & Ref</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Status</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-text-secondary">
                    <Loader2 className="animate-spin mx-auto text-brand-caramel mb-2" size={24} />
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-text-secondary">
                    <IndianRupee className="mx-auto text-text-muted mb-2 opacity-50" size={32} />
                    No payments found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border-light/50 hover:bg-bg-primary/5 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="text-sm text-text-primary font-medium">{new Date(payment.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-text-secondary">{new Date(payment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-text-primary truncate max-w-[200px]" title={payment.profiles?.shop_name}>{payment.profiles?.shop_name}</p>
                      <p className="text-xs text-text-secondary">{payment.profiles?.phone}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="text-base font-bold text-brand-caramel">₹{payment.amount}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{payment.payment_method.replace('_', ' ')}</p>
                      <p className="text-sm text-text-primary font-mono">{payment.reference_id || 'No Ref'}</p>
                      {payment.notes && <p className="text-[10px] text-text-secondary truncate max-w-[150px] mt-0.5">{payment.notes}</p>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {payment.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-pistachio px-2 py-1 bg-brand-pistachio/10 rounded-md">
                          <CheckCircle size={12} /> Verified
                        </span>
                      ) : payment.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-berry px-2 py-1 bg-brand-berry/10 rounded-md">
                          <XCircle size={12} /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-honey px-2 py-1 bg-brand-honey/10 rounded-md">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      {payment.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => updatePaymentStatus(payment.id, 'verified')}
                            className="p-1.5 rounded bg-brand-pistachio/10 text-brand-pistachio hover:bg-brand-pistachio hover:text-white transition-colors"
                            title="Verify & Accept"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => updatePaymentStatus(payment.id, 'rejected')}
                            className="p-1.5 rounded bg-brand-berry/10 text-brand-berry hover:bg-brand-berry hover:text-white transition-colors"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Manual Payment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-secondary border border-border-light rounded-xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <IndianRupee className="text-brand-caramel" /> Log Received Payment
            </h2>
            <form onSubmit={handleManualPayment} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Select Customer</label>
                <select
                  required
                  value={newPayment.customer_id}
                  onChange={(e) => setNewPayment({...newPayment, customer_id: e.target.value})}
                  className="w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel"
                >
                  <option value="" disabled>-- Select Retailer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.shop_name} (Due: ₹{c.due_amount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                  className="w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel"
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Method</label>
                  <select
                    required
                    value={newPayment.payment_method}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewPayment({
                        ...newPayment, 
                        payment_method: val,
                        ...(val === 'cash' ? { reference_id: '' } : {})
                      });
                    }}
                    className="w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / Online</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                {newPayment.payment_method !== 'cash' && (
                  <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Ref ID / UTR <span className="text-brand-caramel">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newPayment.reference_id}
                      onChange={(e) => setNewPayment({...newPayment, reference_id: e.target.value})}
                      className="w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel"
                      placeholder="Enter UTR"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Admin Notes</label>
                <input
                  type="text"
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                  className="w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel"
                  placeholder="Collected by Rahul..."
                />
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-border-light">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Log & Verify Payment'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
