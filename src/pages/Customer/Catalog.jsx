import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, Filter, ChevronDown, Image as ImageIcon, ShoppingCart, Plus, Minus, Loader2, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';

export default function ProductCatalog() {
  const { companyName } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState(null);

  const addItem = useCartStore(state => state.addItem);
  const cartItems = useCartStore(state => state.items);
  const updateQuantity = useCartStore(state => state.updateQuantity);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const profile = useAuthStore.getState().profile;
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`*, categories(name)`)
        .eq('is_active', true)
        .eq('company_id', profile?.company_id)
        .order('name');

      if (error) throw error;

      if (productsData) {
        setProducts(productsData);
        
        const uniqueCategories = [];
        const categoryMap = new Map();
        
        productsData.forEach(p => {
          if (p.category_id && p.categories?.name) {
            if (!categoryMap.has(p.category_id)) {
              categoryMap.set(p.category_id, true);
              uniqueCategories.push({
                id: p.category_id,
                name: p.categories.name
              });
            }
          }
        });
        
        uniqueCategories.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    setAddingToCart(product.id);
    addItem(product, 1);
    setTimeout(() => setAddingToCart(null), 600);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-[#faf9f7] min-h-full font-sans -m-4 lg:-m-8 pt-4 lg:pt-8 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Hero Section */}
      <section className="px-6 py-6 md:py-8 w-full text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Delicious <span className="bg-gradient-to-br from-red-600 to-amber-500 bg-clip-text text-transparent">Ice Cream</span> Delights
        </h1>
      </section>

      {/* Search Section */}
      <div className="px-6 pb-7 w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Search products by name or category..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-4 pr-5 pl-12 border-2 border-[#f0e6d8] rounded-[28px] text-[15px] text-slate-900 bg-white shadow-sm focus:outline-none focus:border-red-600 focus:shadow-[0_0_40px_rgba(220,38,38,0.15)] transition-all"
            />
        </div>
        
        <div className="relative md:w-56 z-30">
          <div 
            className="flex items-center justify-between py-4 px-5 border-2 border-[#f0e6d8] rounded-[28px] bg-white cursor-pointer h-full shadow-sm hover:border-red-600 hover:shadow-[0_0_40px_rgba(220,38,38,0.15)] transition-all"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex items-center gap-2.5">
              <Filter className="text-red-600" size={18} />
              <span className="text-[14px] font-medium text-slate-900 truncate">
                {selectedCategory === 'All' ? 'All Categories' : categories.find(c => c.id === selectedCategory)?.name || 'Select'}
              </span>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-[#f0e6d8] rounded-xl shadow-lg custom-scrollbar z-40"
              >
                <div 
                  className={`px-5 py-3 text-[14px] cursor-pointer transition-colors hover:bg-gray-50 ${selectedCategory === 'All' ? 'text-red-600 font-semibold bg-red-50/50' : 'text-slate-900'}`}
                  onClick={() => { setSelectedCategory('All'); setIsDropdownOpen(false); }}
                >
                  All Categories
                </div>
                {categories.map(c => (
                  <div 
                    key={c.id}
                    className={`px-5 py-3 text-[14px] cursor-pointer transition-colors hover:bg-gray-50 ${selectedCategory === c.id ? 'text-red-600 font-semibold bg-red-50/50' : 'text-slate-900'}`}
                    onClick={() => { setSelectedCategory(c.id); setIsDropdownOpen(false); }}
                  >
                    {c.name}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Category Chips - Scrollable */}
      <div className="px-6 pb-4 pt-2 w-full relative overflow-visible bg-[#faf9f7]">
        <div 
          className="flex gap-2.5 overflow-x-auto pb-2 pt-1" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Hide webkit scrollbar using standard Tailwind arbitrary variant or inline styles */}
          <style dangerouslySetInnerHTML={{__html: `
            .overflow-x-auto::-webkit-scrollbar { display: none; }
          `}} />
          
          <button 
             onClick={() => setSelectedCategory('All')}
             className={`px-5 py-2.5 rounded-full border-2 text-[14px] font-medium transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${selectedCategory === 'All' ? 'bg-gradient-to-br from-red-600 to-red-800 text-white border-red-600 shadow-[0_4px_16px_rgba(220,38,38,0.3)]' : 'bg-white border-[#f0e6d8] text-gray-500 hover:border-red-600 hover:text-red-600 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(93,64,55,0.1)]'}`}
          >
              All
          </button>
          {categories.map(c => (
              <button 
                 key={c.id}
                 onClick={() => setSelectedCategory(c.id)}
                 className={`px-5 py-2.5 rounded-full border-2 text-[14px] font-medium transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${selectedCategory === c.id ? 'bg-gradient-to-br from-red-600 to-red-800 text-white border-red-600 shadow-[0_4px_16px_rgba(220,38,38,0.3)]' : 'bg-white border-[#f0e6d8] text-gray-500 hover:border-red-600 hover:text-red-600 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(93,64,55,0.1)]'}`}
              >
                  {c.name}
              </button>
          ))}
        </div>
      </div>

      {/* Products Section */}
      <section className="px-6 pb-12 w-full">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-[20px] font-bold text-slate-900">
                All Products <span className="text-[14px] font-normal text-gray-400 ml-2">({filteredProducts.length} items)</span>
            </h3>
        </div>

        {loading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-red-600" size={40} />
            </div>
        ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-[#f0e6d8] border-dashed">
                <ShoppingCart className="mx-auto text-gray-300 mb-3" size={48} />
                <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter criteria.</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {filteredProducts.map((product) => {
                    const cartItem = cartItems.find(item => item.product.id === product.id);
                    const isOutOfStock = product.stock_quantity === 0;
                    return (
                        <div key={product.id} className="bg-white rounded-[16px] overflow-hidden shadow-[0_2px_8px_rgba(93,64,55,0.06)] border border-[#f0e6d8] transition-all duration-400 hover:-translate-y-2 hover:shadow-[0_16px_48px_rgba(93,64,55,0.14)] hover:border-red-600/20 relative flex flex-col group">
                            
                            {/* Badges */}
                            {isOutOfStock ? (
                                <span className="absolute top-3.5 left-3.5 px-3.5 py-1.5 bg-gray-600 text-white rounded-full text-[11px] font-bold uppercase tracking-wide z-10 shadow-lg">
                                    Out of Stock
                                </span>
                            ) : product.stock_quantity < 10 ? (
                                <span className="absolute top-3.5 left-3.5 px-3.5 py-1.5 bg-gradient-to-br from-amber-500 to-[#d97706] text-white rounded-full text-[11px] font-bold uppercase tracking-wide z-10 shadow-[0_4px_12px_rgba(245,158,11,0.3)]">
                                    Only {product.stock_quantity} left
                                </span>
                            ) : null}

                            {/* Product Image */}
                            <div className="h-[180px] md:h-[220px] overflow-hidden relative bg-gradient-to-br from-[#fff8f0] to-[#fef3e6] shrink-0">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className={`w-full h-full object-cover transition-transform duration-600 group-hover:scale-[1.08] ${isOutOfStock ? 'grayscale opacity-70' : ''}`} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="text-gray-300" size={40} />
                                    </div>
                                )}
                                
                                </div>

                            {/* Content */}
                            <div className="p-[14px] md:p-[18px] flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-1.5 gap-2">
                                    <h4 className="text-[14px] md:text-[15px] font-bold text-slate-900 leading-[1.3] flex-1 line-clamp-2">{product.name}</h4>
                                    <span className="text-[16px] md:text-[18px] font-extrabold text-red-600 whitespace-nowrap"><span className="text-[12px] md:text-[13px] font-semibold">₹</span>{product.price}</span>
                                </div>
                                
                                <span className="inline-block px-2.5 py-1 bg-[#fff8f0] text-[#5d4037] rounded-[20px] text-[10px] md:text-[11px] font-semibold mb-2 w-fit">
                                    {product.categories?.name || 'General'}
                                </span>
                                
                                {product.description && (
                                    <p className="text-[11px] md:text-[12px] text-gray-500 mb-3.5 leading-[1.5] flex-1 line-clamp-2">
                                        {product.description}
                                    </p>
                                )}
                                
                                {/* Footer */}
                                <div className="flex justify-between items-center pt-3 border-t border-[#f0e6d8] mt-auto gap-1">
                                    <span className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-[1px] font-semibold whitespace-nowrap truncate">
                                        Per {product.unit}
                                    </span>
                                    
                                    {cartItem ? (
                                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 border border-[#f0e6d8] shadow-sm shrink-0">
                                            <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="p-0.5 hover:bg-white hover:text-red-600 rounded text-gray-500 transition-colors shrink-0">
                                                <Minus size={14} />
                                            </button>
                                            <span className="text-[12px] md:text-[13px] font-bold w-4 text-center text-slate-900">{cartItem.quantity}</span>
                                            <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} disabled={cartItem.quantity >= product.stock_quantity} className={`p-0.5 rounded transition-colors shrink-0 ${cartItem.quantity >= product.stock_quantity ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white hover:text-red-600 text-gray-500'}`}>
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleAddToCart(product)}
                                            disabled={isOutOfStock || addingToCart === product.id}
                                            className={`px-3 md:px-5 py-1.5 md:py-2.5 rounded-[10px] md:rounded-[12px] text-[12px] md:text-[13px] font-semibold flex items-center justify-center gap-1 transition-all shrink-0 ${isOutOfStock ? 'bg-gray-400 text-white cursor-not-allowed shadow-none' : 'bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_4px_12px_rgba(220,38,38,0.25)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(220,38,38,0.35)] active:scale-95'}`}
                                        >
                                            {addingToCart === product.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.5} />}
                                            Add
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </section>



      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white px-6 pt-10 pb-24 md:pb-10 text-center mt-auto">
        <h4 className="text-2xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{companyName} - The Taste of India</h4>
        <p className="text-white/60 text-sm">Premium products delivered fresh to your doorstep</p>
      </footer>

    </div>
  );
}
