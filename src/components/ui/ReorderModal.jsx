import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, ArrowRight } from 'lucide-react';
import Button from './Button';

export default function ReorderModal({ order, profile, user, onClose, onOrderPlaced }) {
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState('');
  const [paymentMode, setPaymentMode] = useState('ledger');
  const [upiRef, setUpiRef] = useState('');
  
  if (!order) return null;

  const handlePlaceOrder = async () => {
    if (!order.order_items || order.order_items.length === 0) return;
    
    if (paymentMode === 'upi' && !upiRef.trim()) {
      setError('Please enter your UPI Transaction ID (UTR)');
      return;
    }

    setPlacingOrder(true);
    setError('');
    
    try {
      // Format items from the previous order
      const formattedItems = order.order_items.map(item => ({
        product_id: item.product_id || item.products?.id,
        quantity: item.quantity
      }));

      if (formattedItems.some(i => !i.product_id)) {
         throw new Error("Could not retrieve product IDs for some items in this order.");
      }

      // Call secure place_order RPC
      const { data: orderId, error: rpcError } = await supabase.rpc('place_order', {
        p_customer_id: user.id,
        p_company_id: profile?.company_id || order.company_id,
        p_payment_method: paymentMode,
        p_items: formattedItems,
        p_upi_ref: paymentMode === 'upi' ? upiRef.trim() : null
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to place order. Please try again.');
      }

      // Success
      onOrderPlaced();
    } catch (err) {
      console.error('Error placing order:', err);
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const totalItems = order.order_items?.length || 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-full">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Reorder Items</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar bg-gray-50 flex-1 min-h-0">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Order Summary</h3>
            
            <div className="space-y-3 text-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-medium text-gray-800">₹{order.total_amount}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Taxes & Fees</span>
                <span className="text-gray-400 text-xs">Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between items-end">
                <span className="text-base font-bold text-gray-800">Total Amount</span>
                <span className="text-2xl font-bold text-red-600">₹{order.total_amount}</span>
              </div>
            </div>

            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Payment Mode</label>
            <div className="flex flex-col gap-2.5">
                  {/* Pay Later */}
                  <label className={`relative flex cursor-pointer rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${paymentMode === 'ledger' ? 'bg-red-600/10 border-red-600 scale-[1.02]' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-red-600/30'}`}>
                    <input type="radio" name="payment_mode" value="ledger" checked={paymentMode === 'ledger'} onChange={(e) => setPaymentMode(e.target.value)} className="sr-only" />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border shadow-sm ${paymentMode === 'ledger' ? 'border-red-600 bg-red-600' : 'border-gray-400 bg-transparent'}`}>
                          {paymentMode === 'ledger' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <div>
                          <span className={`block text-sm font-bold ${paymentMode === 'ledger' ? 'text-red-600' : 'text-gray-800'}`}>Pay Later</span>
                          <span className="block text-[10px] text-gray-500 mt-0.5">Add this order to your pending dues</span>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Cash on Delivery */}
                  <label className={`relative flex cursor-pointer rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${paymentMode === 'cod' ? 'bg-green-600/10 border-green-600 scale-[1.02]' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-green-600/30'}`}>
                    <input type="radio" name="payment_mode" value="cod" checked={paymentMode === 'cod'} onChange={(e) => setPaymentMode(e.target.value)} className="sr-only" />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border shadow-sm ${paymentMode === 'cod' ? 'border-green-600 bg-green-600' : 'border-gray-400 bg-transparent'}`}>
                          {paymentMode === 'cod' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <div>
                          <span className={`block text-sm font-bold ${paymentMode === 'cod' ? 'text-green-600' : 'text-gray-800'}`}>Cash on Delivery</span>
                          <span className="block text-[10px] text-gray-500 mt-0.5">Pay when your order arrives</span>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Online (UPI) */}
                  <label className={`relative flex cursor-pointer rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${paymentMode === 'upi' ? 'bg-blue-500/10 border-blue-500 scale-[1.02]' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-blue-500/30'}`}>
                    <input type="radio" name="payment_mode" value="upi" checked={paymentMode === 'upi'} onChange={(e) => setPaymentMode(e.target.value)} className="sr-only" />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border shadow-sm ${paymentMode === 'upi' ? 'border-blue-500 bg-blue-500' : 'border-gray-400 bg-transparent'}`}>
                          {paymentMode === 'upi' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <div>
                          <span className={`block text-sm font-bold ${paymentMode === 'upi' ? 'text-blue-500' : 'text-gray-800'}`}>Online Payment (UPI)</span>
                          <span className="block text-[10px] text-gray-500 mt-0.5">Pay via GPay, PhonePe, Paytm etc.</span>
                        </div>
                      </div>
                    </div>
                  </label>
            </div>
            
            {paymentMode === 'upi' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-3">
                <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2.5 rounded-lg flex items-start gap-2 font-medium border border-blue-100">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Please pay admin directly via UPI. Share the screenshot with them to verify.</span>
                </p>
                <div className="mt-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    UPI Transaction ID (UTR) <span className="text-red-600">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    placeholder="Enter 12-digit UTR number" 
                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm shadow-sm"
                  />
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-white shrink-0">
            {error && (
              <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <Button 
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white border-transparent flex justify-center items-center" 
              onClick={handlePlaceOrder}
              disabled={placingOrder}
            >
              {placingOrder ? (
                'Placing Order...'
              ) : (
                <>
                  Place Order <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>
            
            <p className="text-[10px] text-center text-gray-400 pt-3">
              By placing your order, you agree to the company's terms and conditions.
            </p>
        </div>
      </div>
    </div>
  );
}
