import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useLedgerStore } from '../../store/useLedgerStore';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import './Payments.css';

export default function CustomerPayments() {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const { payments, balance, loading, fetchLedger } = useLedgerStore();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [companyAllowPayLater, setCompanyAllowPayLater] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      supabase.from('profiles').select('allow_pay_later').eq('id', profile.company_id).single()
        .then(({ data }) => {
           if (data) setCompanyAllowPayLater(data.allow_pay_later ?? true);
        });
    }
  }, [profile?.company_id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const paymentOptions = [
    { value: 'upi', label: 'UPI / GPay / PhonePe' },
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' }
  ];

  const [isAdding, setIsAdding] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_method: 'upi',
    reference_id: '',
    notes: ''
  });


  useEffect(() => {
    if (user) {
      fetchLedger(user.id);
    }
  }, [user, fetchLedger]);

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
      alert('Payment submitted successfully! It is pending verification.');
      // Refetch ledger to update the state with the new payment
      fetchLedger(user.id, true);
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to submit payment entry.');
    } finally {
      setIsAdding(false);
    }
  };


  return (
    <div className="payments-main max-w-7xl mx-auto">
        <div className="page-header">
            <h1>My Ledger & Payments</h1>
            <p>Track your outstanding balance and submit payment details.</p>
        </div>

        {loading ? (
            <div className="flex justify-center items-center py-20 relative z-10">
                <Loader2 className="animate-spin text-[#E31837]" size={32} />
            </div>
        ) : (
            <div className="dashboard-grid">
                {/* Left Panel */}
                <div className="left-panel">
                    {/* Balance Card */}
                    <div className="balance-card">
                        <div className="balance-header">
                            <div className="balance-label">Outstanding Balance</div>
                            <div className="balance-icon">🏛️</div>
                        </div>
                        <div className="balance-amount"><span>₹</span>{balance.outstanding.toLocaleString()}</div>
                        <div className="balance-stats">
                            <div className="stat-row">
                                <span className="stat-label">Total Billed</span>
                                <span className="stat-value billed">₹{balance.billed.toLocaleString()}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Total Paid</span>
                                <span className="stat-value paid">₹{balance.paid.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Form */}
                    {companyAllowPayLater && (
                        <div className="form-card">
                            <div className="form-title">Log a Payment</div>
                            <form onSubmit={handleSubmitPayment}>
                                <div className="form-group">
                                    <label className="form-label">Amount Paid (₹) <span className="required">*</span></label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        placeholder="e.g. 5000"
                                        required
                                        min="1"
                                        value={newPayment.amount}
                                        onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                                    />
                                </div>
                                <div className="form-group relative" ref={dropdownRef}>
                                    <label className="form-label">Payment Method <span className="required">*</span></label>
                                    <div 
                                        className={`form-input form-select flex items-center justify-between ${isDropdownOpen ? 'border-[#E31837] shadow-[0_0_0_4px_rgba(227,24,55,0.15)]' : ''}`}
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <span>{paymentOptions.find(opt => opt.value === newPayment.payment_method)?.label}</span>
                                    </div>
                                    
                                    {isDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-2 bg-white border border-[#E31837]/10 rounded-xl shadow-[0_12px_40px_rgba(227,24,55,0.08)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {paymentOptions.map((option) => (
                                                <div 
                                                    key={option.value}
                                                    className={`px-4 py-3 cursor-pointer text-sm font-medium transition-colors ${
                                                        newPayment.payment_method === option.value 
                                                        ? 'bg-[rgba(227,24,55,0.06)] text-[#E31837]' 
                                                        : 'text-[#4A4A68] hover:bg-[#FFF5F5] hover:text-[#E31837]'
                                                    }`}
                                                    onClick={() => {
                                                        setNewPayment({...newPayment, payment_method: option.value});
                                                        setIsDropdownOpen(false);
                                                    }}
                                                >
                                                    {option.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {newPayment.payment_method !== 'cash' && (
                                    <div className="form-group">
                                        <label className="form-label">Reference ID / UTR Number <span className="required">*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            placeholder="Enter reference number"
                                            required
                                            value={newPayment.reference_id}
                                            onChange={(e) => setNewPayment({...newPayment, reference_id: e.target.value})}
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Notes (Optional)</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Any message for admin"
                                        value={newPayment.notes}
                                        onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                                    />
                                </div>

                                <button type="submit" className="btn-submit" disabled={isAdding || !newPayment.amount}>
                                    {isAdding ? <Loader2 size={18} className="animate-spin" /> : null}
                                    Submit Payment
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Right Panel - Payment History */}
                <div className="history-card flex flex-col">
                    <div className="history-header">
                        <div className="history-title">Payment History</div>
                        <div className="history-count">{payments.length} Transactions</div>
                    </div>

                    {payments.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-[#8A8AA3]">
                            <p>No payments recorded yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-wrapper">
                                <table className="payment-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Reference</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td>
                                                    <div className="date-cell">
                                                        <span className="date-main">{new Date(payment.created_at).toLocaleDateString()}</span>
                                                        <span className="date-time">{new Date(payment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                </td>
                                                <td><span className="amount-cell">₹{payment.amount}</span></td>
                                                <td><span className="method-badge">{payment.payment_method.replace('_', ' ')}</span></td>
                                                <td>
                                                    <div className="reference-cell">
                                                        <span className="ref-main">{payment.reference_id || 'N/A'}</span>
                                                        <span className="ref-sub truncate max-w-[150px]">{payment.notes || '-'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`status-badge status-${payment.status}`}>
                                                        <span className="status-dot"></span>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}
