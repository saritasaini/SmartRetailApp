import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus, Search, ChevronLeft, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { logCompanyAction } from '../../lib/logger';
import toast from 'react-hot-toast';

export default function OrderEditModal({ order, onClose, onSave }) {
  const [items, setItems] = useState(
    order.order_items.map(item => ({
      ...item,
      newQuantity: item.quantity
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const [currentView, setCurrentView] = useState('items'); // 'items' | 'products'
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const handleQuantityChange = (itemId, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    setItems(items.map(item => 
      (item.id || item.tempId) === itemId 
        ? { ...item, newQuantity: isNaN(qty) ? '' : qty }
        : item
    ));
  };

  const handleRemoveItem = (idOrTempId) => {
    const itemToRemove = items.find(i => (i.id || i.tempId) === idOrTempId);
    if (!itemToRemove) return;
    
    if (!itemToRemove.isNew && itemToRemove.id) {
      setDeletedItemIds(prev => [...prev, itemToRemove.id]);
    }
    setItems(items.filter(i => (i.id || i.tempId) !== idOrTempId));
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const companyId = useAuthStore.getState().user.id;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);
        
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load products.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const switchToProducts = () => {
    setCurrentView('products');
    setSelectedProducts([]);
    if (products.length === 0) fetchProducts();
  };

  const toggleProductSelection = (product) => {
    if (selectedProducts.find(p => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const addSelectedProducts = () => {
    const newItems = selectedProducts.map(product => ({
      tempId: 'new_' + Date.now() + '_' + product.id,
      isNew: true,
      product_id: product.id,
      products: product,
      price_at_order: product.price || 0,
      newQuantity: 1 // default quantity
    }));
    setItems([...items, ...newItems]);
    setCurrentView('items');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      let totalAmount = 0;
      const itemsToUpdate = [];
      const itemsToDelete = [];
      const itemsToInsert = [];
      
      for (const item of items) {
        if (item.newQuantity === '' || item.newQuantity < 0) {
          throw new Error('Invalid quantity for ' + item.products?.name);
        }
        
        if (item.newQuantity === 0) {
          if (!item.isNew) itemsToDelete.push(item.id);
        } else {
          totalAmount += item.newQuantity * item.price_at_order;
          
          if (item.isNew) {
            itemsToInsert.push({
              order_id: order.id,
              product_id: item.product_id,
              quantity: item.newQuantity,
              price_at_order: item.price_at_order
            });
          } else {
            itemsToUpdate.push({
              id: item.id,
              order_id: order.id,
              product_id: item.product_id,
              quantity: item.newQuantity,
              price_at_order: item.price_at_order
            });
          }
        }
      }
      
      if (itemsToUpdate.length === 0 && itemsToInsert.length === 0) {
          throw new Error('Order must have at least one item. If you want to cancel, use the cancel status.');
      }

      // 1. Delete items
      const allItemsToDelete = [...itemsToDelete, ...deletedItemIds];
      for (const itemId of allItemsToDelete) {
          const { error: delErr } = await supabase.from('order_items').delete().eq('id', itemId);
          if (delErr) throw delErr;
      }
      
      // 2. Update existing items
      for (const item of itemsToUpdate) {
          const { error: updErr } = await supabase.from('order_items').update({ quantity: item.quantity }).eq('id', item.id);
          if (updErr) throw updErr;
      }

      // 3. Insert new items
      if (itemsToInsert.length > 0) {
        const { error: insErr } = await supabase.from('order_items').insert(itemsToInsert);
        if (insErr) throw insErr;
      }
      
      // 4. Update order total
      const { error: orderErr } = await supabase.from('orders').update({ total_amount: totalAmount }).eq('id', order.id);
      if (orderErr) throw orderErr;

      await logCompanyAction({
        companyId: useAuthStore.getState().user.id,
        action: 'Order Edited',
        details: `Edited items/quantities for Order #${order.id.slice(0, 8).toUpperCase()}. New Total: ₹${totalAmount}.`,
        userName: useAuthStore.getState().user.user_metadata?.owner_name || 'Staff',
        type: 'info'
      });

      toast.success('Order allotment updated successfully!');
      onSave();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
    !items.some(item => item.product_id === p.id && !item.isNew && item.newQuantity > 0) 
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            {currentView === 'products' && (
              <button 
                onClick={() => setCurrentView('items')}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <h3 className="text-[18px] font-[700] text-gray-800">
                {currentView === 'items' ? 'Edit Order Allotment' : 'Add New Item'}
              </h3>
              <p className="text-[13px] text-gray-500">
                {currentView === 'items' 
                  ? `Adjust stock quantities for Order #${order.id.slice(0, 8).toUpperCase()}`
                  : 'Select products to add to this order'
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-xl flex items-start gap-2 shrink-0">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {currentView === 'items' ? (
            <>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id || item.tempId} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-red-100 transition-colors flex-wrap gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                      <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                        <img src={item.products?.image_url} alt={item.products?.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-[700] text-gray-800">
                          {item.products?.name}
                          {item.isNew && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">New</span>}
                        </h4>
                        <div className="text-[12px] text-gray-500">
                          Rate: ₹{item.price_at_order} / {item.products?.unit} • Stock: {item.products?.stock_quantity}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                      <div className="text-right">
                        <div className="text-[11px] font-[600] text-gray-400 uppercase tracking-wider mb-1">Quantity</div>
                        <input 
                          type="number" 
                          min="1"
                          value={item.newQuantity} 
                          onChange={(e) => handleQuantityChange(item.id || item.tempId, e.target.value)}
                          className="w-20 px-3 py-1.5 text-[14px] font-[600] text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 text-center"
                        />
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-[11px] font-[600] text-gray-400 uppercase tracking-wider mb-1">Total</div>
                        <div className="text-[15px] font-[700] text-gray-800">
                          ₹{((item.newQuantity || 0) * item.price_at_order).toLocaleString()}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(item.id || item.tempId)}
                        className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-center">
                <button 
                  onClick={switchToProducts}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors text-sm"
                >
                  <Plus size={16} /> Add New Item
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                <div className="text-right">
                  <span className="text-[13px] text-gray-500 font-[500] mr-4">New Total</span>
                  <span className="text-[24px] font-[800] text-red-600">
                    ₹{items.reduce((sum, item) => sum + ((item.newQuantity || 0) * item.price_at_order), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col h-[400px]">
              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {loadingProducts ? (
                  <div className="text-center py-8 text-gray-500 text-sm">Loading products...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">No products found.</div>
                ) : (
                  filteredProducts.map(product => {
                    const isSelected = selectedProducts.some(p => p.id === product.id);
                    return (
                      <div 
                        key={product.id}
                        onClick={() => toggleProductSelection(product)}
                        className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${
                          isSelected ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 mr-3">
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[13px] font-[700] text-gray-800">{product.name}</h4>
                          <div className="text-[11px] text-gray-500">₹{product.price} • Stock: {product.stock_quantity}</div>
                        </div>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          isSelected ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-300'
                        }`}>
                          {isSelected && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          {currentView === 'items' ? (
            <>
              <button 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-[14px] font-[600] text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-[14px] font-[600] text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setCurrentView('items')}
                className="px-5 py-2.5 rounded-xl text-[14px] font-[600] text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={addSelectedProducts}
                disabled={selectedProducts.length === 0}
                className="px-5 py-2.5 rounded-xl text-[14px] font-[600] text-white bg-gray-800 hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                Add {selectedProducts.length > 0 ? `(${selectedProducts.length})` : ''} Products
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
