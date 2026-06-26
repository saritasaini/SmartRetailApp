import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function SuperAdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            *,
            customer:profiles!customer_id (owner_name, email, phone, address),
            order_items (
              id,
              quantity,
              price_at_order,
              products (name, image_url)
            )
          `)
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        let companyData = null;
        if (data.company_id) {
            const { data: cData } = await supabase
                .from('profiles')
                .select('shop_name, owner_name, phone, address, email')
                .eq('id', data.company_id)
                .single();
            companyData = cData;
        }
        data.company = companyData;

        const getInitials = (name) => {
            if (!name) return 'U';
            return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        };

        const statusLower = data.status?.toLowerCase() || 'pending';
        let displayStatus = 'Pending';
        let statusColor = 'amber';

        if (statusLower === 'pending') {
            displayStatus = 'Pending';
            statusColor = 'amber';
        } else if (statusLower === 'confirmed' || statusLower === 'out_for_delivery' || statusLower === 'shipped') {
            displayStatus = 'Shipped';
            statusColor = 'blue';
        } else if (statusLower === 'delivered') {
            displayStatus = 'Delivered';
            statusColor = 'emerald';
        } else {
            displayStatus = 'Cancelled';
            statusColor = 'red';
        }

        const formattedOrder = {
          id: `#${data.id.split('-')[0].toUpperCase()}`,
          rawId: data.id,
          date: new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: new Date(data.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: displayStatus,
          statusColor: statusColor,
          customer: {
            name: data.customer?.owner_name || 'Unknown',
            email: data.customer?.email || 'N/A',
            phone: data.customer?.phone || 'N/A',
            address: data.customer?.address || 'N/A',
            initials: getInitials(data.customer?.owner_name),
            color: 'blue'
          },
          company: {
            name: data.company?.shop_name || 'Unknown',
            contactPerson: data.company?.owner_name || 'Unknown',
            email: data.company?.email || 'N/A',
            phone: data.company?.phone || 'N/A',
            address: data.company?.address || 'N/A',
            initials: getInitials(data.company?.shop_name),
            color: 'pink'
          },
          payment: {
            method: data.payment_method?.toUpperCase() || 'N/A',
            transactionId: data.id,
            status: data.status === 'delivered' ? 'Paid' : 'Pending',
            subtotal: data.total_amount || 0,
            tax: 0,
            shipping: 0,
            total: data.total_amount || 0
          },
          items: (data.order_items || []).map((item, i) => ({
            id: item.id || i,
            name: item.products?.name || 'Unknown Product',
            sku: item.products?.sku || 'N/A',
            price: item.price_at_order,
            quantity: item.quantity,
            total: item.price_at_order * item.quantity,
            image: item.products?.image_url || 'https://via.placeholder.com/150'
          }))
        };

        setOrder(formattedOrder);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (id) fetchOrderDetail();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading order details...</div>;
  if (error || !order) return <div className="p-8 text-center text-red-500">Error loading order details: {error}</div>;

  return (
    <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 hover:text-red-600 transition-colors shadow-sm"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-800">Order {order.id}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${order.statusColor}-50 text-${order.statusColor}-600 border border-${order.statusColor}-100`}>
                            {order.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Placed on {order.date} at {order.time}</p>
                </div>
            </div>
            <button className="px-5 py-2.5 rounded-xl bg-gray-800 text-white font-medium hover:bg-gray-900 transition-colors shadow-sm flex items-center gap-2">
                <i className="fas fa-print"></i> Print Invoice
            </button>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Customer Details */}
            <div className="glass-card bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                        <i className="fas fa-user"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Customer Details</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full bg-${order.customer.color}-100 text-${order.customer.color}-700 flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                            {order.customer.initials}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{order.customer.name}</p>
                            <p className="text-xs text-gray-500">{order.customer.email}</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-sm text-gray-600 mb-2"><i className="fas fa-phone text-gray-400 w-5"></i> {order.customer.phone}</p>
                        <p className="text-sm text-gray-600 leading-relaxed"><i className="fas fa-map-marker-alt text-gray-400 w-5"></i> {order.customer.address}</p>
                    </div>
                </div>
            </div>

            {/* Company Details */}
            <div className="glass-card bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <i className="fas fa-building"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Company Details</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-${order.company.color}-100 text-${order.company.color}-700 flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                            {order.company.initials}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{order.company.name}</p>
                            <p className="text-xs text-gray-500">Contact: {order.company.contactPerson}</p>
                            <p className="text-xs text-gray-500">{order.company.email}</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-sm text-gray-600 mb-2"><i className="fas fa-phone text-gray-400 w-5"></i> {order.company.phone}</p>
                        <p className="text-sm text-gray-600 leading-relaxed"><i className="fas fa-map-marker-alt text-gray-400 w-5"></i> {order.company.address}</p>
                    </div>
                </div>
            </div>

            {/* Payment Details */}
            <div className="glass-card bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <i className="fas fa-wallet"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Payment Details</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Method</span>
                        <span className="font-semibold text-gray-800">{order.payment.method}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Transaction ID</span>
                        <span className="font-medium text-gray-800">{order.payment.transactionId}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className="font-bold text-emerald-600">{order.payment.status}</span>
                    </div>
                    <div className="pt-3 mt-1 border-t border-gray-100 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium text-gray-800">₹{order.payment.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Tax</span>
                            <span className="font-medium text-gray-800">₹{order.payment.tax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Shipping</span>
                            <span className="font-medium text-gray-800">₹{order.payment.shipping.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 text-base font-bold">
                            <span className="text-gray-800">Total</span>
                            <span className="text-red-600">₹{order.payment.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        {/* Order Items Table */}
        <div className="glass-card bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Order Items</h3>
                <span className="text-sm font-medium text-gray-500">{order.items.length} items</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price</th>
                            <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {order.items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-bg-tertiary flex items-center justify-center border border-border-light overflow-hidden shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-sm font-bold text-gray-800">{item.name}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-sm font-medium text-gray-700">x{item.quantity}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-sm font-medium text-gray-700">₹{item.price.toLocaleString()}</span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <span className="text-sm font-bold text-gray-800">₹{item.total.toLocaleString()}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

    </div>
  );
}
