import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { IndianRupee, Clock, CheckCircle, XCircle, ArrowUpRight, Loader2, Landmark } from 'lucide-react';

export default function CustomerPayments() {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState({ billed: 0, paid: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_method: 'upi',
    reference_id: '',
    notes: ''
  });

  const fetchLedger = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch all valid orders to calculate total billed
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('customer_id', user.id)
        .neq('status', 'cancelled');

      if (ordersError) throw ordersError;

      // 2. Fetch all payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const totalBilled = orders?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
      
      // Only VERIFIED payments reduce the outstanding balance
      const totalPaid = paymentsData
        ?.filter(p => p.status === 'verified')
        .reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setBalance({
        billed: totalBilled,
        paid: totalPaid,
        outstanding: totalBilled - totalPaid
      });

      setPayments(paymentsData || []);
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [user]);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!user || !newPayment.amount || isNaN(newPayment.amount)) return;

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          customer_id: user.id,
          company_id: profile?.company_id,
          amount: Number(newPayment.amount),
          payment_method: newPayment.payment_method,
          reference_id: newPayment.reference_id,
          notes: newPayment.notes,
          status: 'pending' // Admin needs to verify
        });

      if (error) throw error;

      setNewPayment({ amount: '', payment_method: 'upi', reference_id: '', notes: '' });
      fetchLedger();
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to submit payment entry.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">My Ledger & Payments</h1>
        <p className="text-sm text-text-secondary">Track your outstanding balance and submit payment details.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-brand-caramel" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Balance & Add Payment */}
          <div className="space-y-6 lg:col-span-1">
            {/* Balance Card */}
            <GlassCard className="relative overflow-hidden border-brand-caramel/30 bg-gradient-to-br from-bg-tertiary to-brand-caramel/10">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-brand-caramel pointer-events-none">
                <Landmark size={80} />
              </div>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Outstanding Balance</h3>
              <p className="text-4xl font-bold text-text-primary mb-6">₹{balance.outstanding.toLocaleString()}</p>
              
              <div className="space-y-3 pt-4 border-t border-border-light/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Total Billed</span>
                  <span className="text-sm font-medium text-text-primary">₹{balance.billed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Total Paid</span>
                  <span className="text-sm font-medium text-brand-pistachio">₹{balance.paid.toLocaleString()}</span>
                </div>
              </div>
            </GlassCard>

            {/* Submit Payment Form */}
            <GlassCard>
              <h3 className="text-lg font-bold text-text-primary mb-4">Log a Payment</h3>
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    className="w-full bg-bg-tertiary border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-caramel"
                    placeholder="e.g. 5000"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Payment Method</label>
                  <select
                    required
                    value={newPayment.payment_method}
                    onChange={(e) => setNewPayment({...newPayment, payment_method: e.target.value})}
                    className="w-full bg-bg-tertiary border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-caramel"
                  >
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Reference ID / UTR Number</label>
                  <input
                    type="text"
                    required={newPayment.payment_method !== 'cash'}
                    value={newPayment.reference_id}
                    onChange={(e) => setNewPayment({...newPayment, reference_id: e.target.value})}
                    className="w-full bg-bg-tertiary border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-caramel"
                    placeholder={newPayment.payment_method === 'cash' ? "Optional for cash" : "e.g. 123456789012"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                    className="w-full bg-bg-tertiary border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-caramel"
                    placeholder="Any message for admin"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full py-2 flex items-center justify-center gap-2"
                  disabled={isAdding || !newPayment.amount}
                >
                  {isAdding ? <Loader2 size={18} className="animate-spin" /> : <ArrowUpRight size={18} />}
                  Submit Entry
                </Button>
                <p className="text-[10px] text-text-secondary text-center mt-2">
                  Payment will reflect in your balance once verified by Admin.
                </p>
              </form>
            </GlassCard>
          </div>

          {/* Right Column: Payment History */}
          <div className="lg:col-span-2">
            <GlassCard className="h-full flex flex-col">
              <h3 className="text-lg font-bold text-text-primary mb-4">Payment History</h3>
              
              {payments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-bg-tertiary text-text-muted mb-4">
                    <IndianRupee size={32} />
                  </div>
                  <h4 className="text-base font-bold text-text-primary">No payments recorded</h4>
                  <p className="text-sm text-text-secondary">Your payment submissions will appear here.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-light bg-bg-tertiary/50">
                        <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Date</th>
                        <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Amount</th>
                        <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Method</th>
                        <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Reference</th>
                        <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-border-light/30 hover:bg-bg-primary/5 transition-colors">
                          <td className="py-4 px-4 whitespace-nowrap">
                            <p className="text-sm text-text-primary font-medium">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {new Date(payment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <p className="text-sm font-bold text-brand-caramel">₹{payment.amount}</p>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="text-xs font-medium text-text-secondary px-2 py-1 bg-bg-tertiary rounded-md capitalize">
                              {payment.payment_method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <p className="text-sm text-text-primary font-mono">{payment.reference_id || 'N/A'}</p>
                            {payment.notes && <p className="text-[10px] text-text-secondary truncate max-w-[120px] mt-0.5">{payment.notes}</p>}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap text-right">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>

        </div>
      )}
    </div>
  );
}
