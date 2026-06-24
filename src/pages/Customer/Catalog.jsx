import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { Search, Filter, ChevronDown, Image as ImageIcon, ShoppingCart, Plus, Minus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductCatalog() {
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
        
        // Extract unique categories from the loaded products
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
    
    // Quick visual feedback
    setTimeout(() => {
      setAddingToCart(null);
    }, 600);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary mb-0.5">Product Catalog</h1>
          <p className="text-xs text-text-secondary">Browse and order our premium ice cream products.</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <GlassCard className="flex items-center gap-2 flex-1 py-2 px-4">
          <Search className="text-text-secondary" size={18} />
          <input 
            type="text" 
            placeholder="Search products by name or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-sm text-text-primary focus:outline-none w-full"
          />
        </GlassCard>

        <div className="relative md:w-64 z-40">
          <GlassCard 
            className="flex items-center justify-between py-2 px-4 cursor-pointer h-full"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex items-center gap-2">
              <Filter className="text-text-secondary" size={18} />
              <span className="text-sm text-text-primary truncate">
                {selectedCategory === 'All' ? 'All Categories' : categories.find(c => c.id === selectedCategory)?.name || 'Select Category'}
              </span>
            </div>
            <ChevronDown size={16} className={`text-text-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </GlassCard>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-bg-secondary border border-border-light rounded-lg shadow-lg custom-scrollbar"
              >
                <div 
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-bg-primary ${selectedCategory === 'All' ? 'text-brand-caramel font-semibold bg-bg-primary/50' : 'text-text-primary'}`}
                  onClick={() => { setSelectedCategory('All'); setIsDropdownOpen(false); }}
                >
                  All Categories
                </div>
                {categories.map(c => (
                  <div 
                    key={c.id}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-bg-primary ${selectedCategory === c.id ? 'text-brand-caramel font-semibold bg-bg-primary/50' : 'text-text-primary'}`}
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

      {/* Product Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand-caramel" size={40} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-bg-tertiary/30 rounded-xl border border-border-light border-dashed">
          <ShoppingCart className="mx-auto text-text-muted mb-3" size={48} />
          <h3 className="text-lg font-semibold text-text-primary">No products found</h3>
          <p className="text-sm text-text-secondary mt-1">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((product) => {
            const cartItem = cartItems.find(item => item.product.id === product.id);
            const isOutOfStock = product.stock_quantity === 0;
            return (
            <GlassCard key={product.id} className={`flex flex-col p-0 overflow-hidden group transition-all duration-300 ${isOutOfStock ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]'}`}>
              <div className="h-32 bg-bg-tertiary relative overflow-hidden">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="text-text-muted opacity-50" size={32} />
                  </div>
                )}
                {!isOutOfStock && product.stock_quantity < 10 && product.stock_quantity > 0 && (
                  <div className="absolute top-2 right-2 bg-brand-honey text-brand-navy text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
                    Only {product.stock_quantity} left
                  </div>
                )}
                {product.stock_quantity === 0 && (
                  <div className="absolute top-2 right-2 bg-brand-berry text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
                    Out of Stock
                  </div>
                )}
              </div>
              
              <div className="p-3 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="text-sm font-bold text-text-primary leading-tight line-clamp-2 pr-1">{product.name}</h3>
                  <p className="text-xs font-bold text-brand-caramel whitespace-nowrap">₹{product.price}</p>
                </div>
                
                <span className="text-[10px] font-medium text-text-secondary bg-bg-primary w-fit px-1.5 py-0.5 rounded border border-border-light mb-2">
                  {product.categories?.name}
                </span>
                
                {product.description && (
                  <p className="text-[11px] text-text-muted line-clamp-2 mb-3 flex-1">
                    {product.description}
                  </p>
                )}
                
                <div className="mt-auto pt-3 border-t border-border-light/50 flex items-center justify-between gap-1">
                  <span className="text-[9px] text-text-secondary uppercase font-medium whitespace-nowrap truncate">
                    Per {product.unit}
                  </span>
                  {cartItem ? (
                    <div className="flex items-center gap-1 bg-bg-tertiary rounded-md px-1 py-0.5 border border-border-light shadow-sm shrink-0">
                      <button 
                        onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                        className="p-0.5 hover:bg-bg-primary hover:text-brand-caramel rounded text-text-secondary transition-colors shrink-0"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-bold w-4 text-center text-text-primary">{cartItem.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                        disabled={cartItem.quantity >= product.stock_quantity}
                        className={`p-0.5 rounded transition-colors shrink-0 ${cartItem.quantity >= product.stock_quantity ? 'opacity-40 cursor-not-allowed' : 'hover:bg-bg-primary hover:text-brand-caramel text-text-secondary'}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock || addingToCart === product.id}
                      className={`flex justify-center items-center gap-1 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-1.5 px-2.5 text-xs shadow-sm shrink-0 ${isOutOfStock ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gradient-to-br from-brand-caramel to-brand-caramel-light text-white shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:from-brand-caramel-dark hover:to-brand-caramel'}`}
                    >
                      {addingToCart === product.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus size={12} strokeWidth={3} />
                          Add
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          )})}
        </div>
      )}
    </div>
  );
}
