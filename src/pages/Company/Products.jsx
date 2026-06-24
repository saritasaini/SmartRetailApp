import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { Package, Plus, Edit2, Trash2, X, Check, Search, Image as ImageIcon, Upload, Filter, AlertCircle, ShoppingBag, FolderTree, ChevronDown, ChevronLeft, ChevronRight, ToggleRight, Ban, AlertTriangle, Pen, Trash, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logCompanyAction } from '../../lib/logger';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState(() => {
    return new URLSearchParams(location.search).get('filter') === 'low_stock' ? 'LowStock' : 'All';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(() => new URLSearchParams(location.search).get('action') === 'add_product');
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryNames, setNewCategoryNames] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'piece',
    category_id: '',
    stock_quantity: '',
    image_url: '',
    is_active: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const user = useAuthStore.getState().user;
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select(`*, categories(name)`).eq('company_id', user.id).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('company_id', user.id).order('name')
      ]);

      if (productsRes.data) setProducts(productsRes.data);

      let allCategories = [];
      if (categoriesRes.data) {
        allCategories = [...categoriesRes.data];
      }

      // Also include categories that are already assigned to existing products, even if they belong to another company (from the old bug)
      if (productsRes.data) {
        productsRes.data.forEach(p => {
          if (p.category_id && p.categories?.name && !allCategories.some(c => c.id === p.category_id)) {
            allCategories.push({ id: p.category_id, name: p.categories.name });
          }
        });
      }

      allCategories.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(allCategories);

      if (allCategories.length > 0) {
        setFormData(prev => ({ ...prev, category_id: allCategories[0].id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product = null) => {
    setImageFile(null);
    setError('');
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price,
        unit: product.unit,
        category_id: product.category_id,
        stock_quantity: product.stock_quantity,
        image_url: product.image_url || '',
        is_active: product.is_active
      });
      setImagePreview(product.image_url || '');
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        unit: 'piece',
        category_id: categories.length > 0 ? categories[0].id : '',
        stock_quantity: '',
        image_url: '',
        is_active: true
      });
      setImagePreview('');
    }
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // JS Validation
    let errors = {};
    if (!formData.name?.trim()) errors.name = 'Product name is required';
    if (!formData.category_id) errors.category_id = 'Category is required';
    
    if (formData.price === '' || formData.price === null) {
      errors.price = 'Price is required';
    } else if (parseFloat(formData.price) < 0) {
      errors.price = 'Price cannot be negative';
    }

    if (formData.stock_quantity === '' || formData.stock_quantity === null) {
      errors.stock_quantity = 'Stock is required';
    } else if (parseInt(formData.stock_quantity, 10) < 0) {
      errors.stock_quantity = 'Stock cannot be negative';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    setFieldErrors({});
    setSaving(true);
    setError('');
    try {
      let finalImageUrl = formData.image_url;

      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity, 10),
        image_url: finalImageUrl
      };

      if (editingProduct) {
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
        await logCompanyAction({
          companyId: useAuthStore.getState().user.id,
          action: 'Product Updated',
          details: `Updated product "${payload.name}".`,
          userName: useAuthStore.getState().user.user_metadata?.owner_name || 'Staff',
          type: 'info'
        });
      } else {
        payload.company_id = useAuthStore.getState().user.id;
        await supabase.from('products').insert([payload]);
        await logCompanyAction({
          companyId: payload.company_id,
          action: 'Product Added',
          details: `Added new product "${payload.name}".`,
          userName: useAuthStore.getState().user.user_metadata?.owner_name || 'Staff',
          type: 'success'
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error.message || 'Failed to save product. Make sure the storage bucket is created.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategoryClick = () => {
    setIsCategoryModalOpen(true);
    setNewCategoryNames('');
    setCategoryError('');
  };

  const handleSaveCategories = async (e) => {
    e.preventDefault();
    if (!newCategoryNames.trim()) return;

    setSavingCategory(true);
    setCategoryError('');

    try {
      const names = newCategoryNames
        .split('\n')
        .map(n => n.trim())
        .filter(n => n !== '');

      const uniqueNames = [...new Set(names)];

      // Filter out categories that already exist in the user's current list (case-insensitive)
      const existingNames = categories.map(c => c.name.toLowerCase());
      const newUniqueNames = uniqueNames.filter(name => !existingNames.includes(name.toLowerCase()));

      if (newUniqueNames.length === 0) {
        setIsCategoryModalOpen(false);
        setSavingCategory(false);
        return;
      }

      const user = useAuthStore.getState().user;
      const payload = newUniqueNames.map(name => ({ name, company_id: user.id }));

      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new Error(`Category already exists globally. Please ask the admin to remove the unique name constraint, or use a different name.`);
        }
        throw error;
      }

      if (data && data.length > 0) {
        setCategories(prev => {
          const updated = [...prev, ...data];
          return updated.sort((a, b) => a.name.localeCompare(b.name));
        });
        setFormData(prev => ({ ...prev, category_id: data[0].id }));
      }
      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error('Error adding categories:', err);
      setCategoryError(err.message || 'Failed to add categories.');
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
      
      const product = products.find(p => p.id === id);
      if (product) {
        await logCompanyAction({
          companyId: useAuthStore.getState().user.id,
          action: 'Product Status Changed',
          details: `Product "${product.name}" was marked as ${!currentStatus ? 'Active' : 'Inactive'}.`,
          userName: useAuthStore.getState().user.user_metadata?.owner_name || 'Staff',
          type: !currentStatus ? 'success' : 'warning'
        });
      }

      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const triggerDelete = (id) => {
    setProductToDelete(id);
    setDeleteError('');
  };

  const confirmDelete = async (isHardDelete = false) => {
    if (!productToDelete) return;
    setDeleteError('');
    
    try {
      const product = products.find(p => p.id === productToDelete);
      
      if (isHardDelete) {
        const { error } = await supabase.from('products').delete().eq('id', productToDelete);
        if (error) {
          // 23503 is postgres error code for foreign key violation
          if (error.code === '23503') {
            throw new Error("Cannot permanently delete: This product has existing customer orders. Please use 'Archive' instead.");
          }
          throw error;
        }

        if (product) {
          await logCompanyAction({
            companyId: useAuthStore.getState().user.id,
            action: 'Product Deleted',
            details: `Permanently deleted product "${product.name}".`,
            userName: useAuthStore.getState().user.user_metadata?.owner_name || 'Staff',
            type: 'error'
          });
        }
      } else {
        const { error } = await supabase.from('products').update({ is_active: false }).eq('id', productToDelete);
        if (error) throw error;

        if (product) {
          await logCompanyAction({
            companyId: useAuthStore.getState().user.id,
            action: 'Product Archived',
            details: `Archived product "${product.name}" to preserve order history.`,
            userName: useAuthStore.getState().user.user_metadata?.owner_name || 'Staff',
            type: 'warning'
          });
        }
      }

      fetchData();
      if (viewingProduct?.id === productToDelete) setViewingProduct(null);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error with product deletion:', error);
      setDeleteError(error.message);
    }
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category_id === selectedCategory;

    let matchesStatus = true;
    if (statusFilter === 'Active') matchesStatus = p.is_active;
    else if (statusFilter === 'Deactive') matchesStatus = !p.is_active;
    else if (statusFilter === 'LowStock') matchesStatus = Number(p.stock_quantity) < 50;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, statusFilter]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Stats
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const deactiveProducts = products.filter(p => !p.is_active).length;
  const lowStockProducts = products.filter(p => Number(p.stock_quantity) < 50).length;

  return (
    <div className="space-y-6 relative p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="text-[28px] font-[800] text-gray-800 tracking-tight leading-tight mb-1">Products Catalog</h2>
          <p className="text-[14px] text-gray-500 font-medium">Manage your inventory, pricing, and availability.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-br from-red-600 to-red-800 text-white border-none py-3 px-6 rounded-xl text-[14px] font-[600] cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(220,38,38,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(220,38,38,0.4)] w-full md:w-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        {/* Total Products */}
        <div
          onClick={() => setStatusFilter('All')}
          className={`bg-white rounded-xl p-6 shadow-sm border ${statusFilter === 'All' ? 'border-red-200 shadow-md ring-1 ring-red-100' : 'border-gray-200'} relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-xl"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[28px] font-[800] text-gray-800 leading-none mb-1">{totalProducts}</h3>
              <p className="text-[12px] font-[600] text-gray-500">Total Products</p>
            </div>
          </div>
        </div>

        {/* Active Items */}
        <div
          onClick={() => setStatusFilter('Active')}
          className={`bg-white rounded-xl p-6 shadow-sm border ${statusFilter === 'Active' ? 'border-emerald-200 shadow-md ring-1 ring-emerald-100' : 'border-gray-200'} relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-xl"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <ToggleRight size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[28px] font-[800] text-gray-800 leading-none mb-1">{activeProducts}</h3>
              <p className="text-[12px] font-[600] text-gray-500">Active Items</p>
            </div>
          </div>
        </div>

        {/* Deactive Items */}
        <div
          onClick={() => setStatusFilter('Deactive')}
          className={`bg-white rounded-xl p-6 shadow-sm border ${statusFilter === 'Deactive' ? 'border-gray-300 shadow-md ring-1 ring-gray-200' : 'border-gray-200'} relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-500 rounded-t-xl"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Ban size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[28px] font-[800] text-gray-800 leading-none mb-1">{deactiveProducts}</h3>
              <p className="text-[12px] font-[600] text-gray-500">Deactive Items</p>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => setStatusFilter('LowStock')}
          className={`bg-white rounded-xl p-6 shadow-sm border ${statusFilter === 'LowStock' ? 'border-amber-200 shadow-md ring-1 ring-amber-100' : 'border-gray-200'} relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-xl"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[28px] font-[800] text-gray-800 leading-none mb-1">{lowStockProducts}</h3>
              <p className="text-[12px] font-[600] text-gray-500">Low Stock Alerts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="flex gap-3 mb-6 flex-col md:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3.5 pr-4 pl-12 border border-gray-200 rounded-xl text-[14px] text-gray-800 bg-white shadow-sm transition-all duration-200 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-50 placeholder:text-gray-400"
          />
        </div>
        <div className="relative z-40 hidden md:block">
          <button
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            className="flex items-center gap-2 py-3.5 px-6 border border-gray-200 rounded-xl bg-white text-gray-500 text-[14px] font-[500] shadow-sm transition-all duration-200 hover:border-red-200 hover:shadow-md cursor-pointer whitespace-nowrap h-full"
          >
            <SlidersHorizontal size={16} />
            {statusFilter === 'All' ? 'Filters' : statusFilter === 'LowStock' ? 'Low Stock' : statusFilter}
            <ChevronDown size={14} className={`ml-1 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isStatusDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 flex flex-col overflow-hidden"
              >
                <div
                  className={`px-4 py-2.5 text-[14px] cursor-pointer transition-all duration-300 hover:pl-6 hover:bg-gray-50 ${statusFilter === 'All' ? 'text-red-600 font-[600] bg-red-50/50' : 'text-gray-700'}`}
                  onClick={() => { setStatusFilter('All'); setIsStatusDropdownOpen(false); }}
                >
                  All Status
                </div>
                <div
                  className={`px-4 py-2.5 text-[14px] cursor-pointer transition-all duration-300 hover:pl-6 hover:bg-gray-50 ${statusFilter === 'Active' ? 'text-red-600 font-[600] bg-red-50/50' : 'text-gray-700'}`}
                  onClick={() => { setStatusFilter('Active'); setIsStatusDropdownOpen(false); }}
                >
                  Active
                </div>
                <div
                  className={`px-4 py-2.5 text-[14px] cursor-pointer transition-all duration-300 hover:pl-6 hover:bg-gray-50 ${statusFilter === 'Deactive' ? 'text-red-600 font-[600] bg-red-50/50' : 'text-gray-700'}`}
                  onClick={() => { setStatusFilter('Deactive'); setIsStatusDropdownOpen(false); }}
                >
                  Deactive
                </div>
                <div
                  className={`px-4 py-2.5 text-[14px] cursor-pointer transition-all duration-300 hover:pl-6 hover:bg-gray-50 ${statusFilter === 'LowStock' ? 'text-red-600 font-[600] bg-red-50/50' : 'text-gray-700'}`}
                  onClick={() => { setStatusFilter('LowStock'); setIsStatusDropdownOpen(false); }}
                >
                  Low Stock
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="relative z-40">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between gap-2 py-3.5 px-6 border border-gray-200 rounded-xl bg-white text-gray-500 text-[14px] font-[500] shadow-sm transition-all duration-200 hover:border-red-200 hover:shadow-md cursor-pointer whitespace-nowrap h-full min-w-[200px]"
          >
            <span>{selectedCategory === 'All' ? 'All Categories' : categories.find(c => c.id === selectedCategory)?.name || 'Select Category'}</span>
            <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg custom-scrollbar z-50 flex flex-col"
              >
                <div
                  className={`px-4 py-2.5 text-[14px] cursor-pointer transition-all duration-300 hover:pl-6 hover:bg-gray-50 ${selectedCategory === 'All' ? 'text-red-600 font-[600] bg-red-50/50' : 'text-gray-700'}`}
                  onClick={() => { setSelectedCategory('All'); setIsDropdownOpen(false); }}
                >
                  All Categories
                </div>
                {categories.map(c => (
                  <div
                    key={c.id}
                    className={`px-4 py-2.5 text-[14px] cursor-pointer transition-all duration-300 hover:pl-6 hover:bg-gray-50 ${selectedCategory === c.id ? 'text-red-600 font-[600] bg-red-50/50' : 'text-gray-700'}`}
                    onClick={() => { setSelectedCategory(c.id); setIsDropdownOpen(false); }}
                  >
                    {c.name}
                  </div>
                ))}
                <div
                  className="sticky bottom-0 z-10 px-4 py-3 text-[14px] cursor-pointer font-[700] bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2 mt-auto"
                  onClick={() => { setIsDropdownOpen(false); handleAddCategoryClick(); }}
                >
                  <Plus size={16} /> Add Category
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[60px_minmax(250px,2fr)_minmax(140px,1fr)_minmax(100px,1fr)_minmax(80px,0.5fr)_minmax(120px,1fr)_100px] px-6 py-4 bg-gray-50 border-b border-gray-200">
          <span className="text-[12px] font-[700] text-gray-500 uppercase tracking-wide">S.No.</span>
          <span className="text-[12px] font-[700] text-gray-500 uppercase tracking-wide">Product</span>
          <span className="text-[12px] font-[700] text-gray-500 uppercase tracking-wide">Category</span>
          <span className="text-[12px] font-[700] text-gray-500 uppercase tracking-wide">Price</span>
          <span className="text-[12px] font-[700] text-gray-500 uppercase tracking-wide">Stock</span>
          <span className="text-[12px] font-[700] text-gray-500 uppercase tracking-wide">Status</span>
          <span className="text-[12px] font-[700] text-gray-500 uppercase tracking-wide text-right">Actions</span>
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-[14px]">Loading products...</div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-[14px]">No products match your search.</div>
          ) : (
            paginatedProducts.map((product, index) => {
              const catName = (product.categories?.name || '').toLowerCase();
              const badgeColors = catName.includes('kulfi') ? 'bg-red-50 text-red-600' :
                                  catName.includes('cake') ? 'bg-emerald-50 text-emerald-600' :
                                  catName.includes('sweet') ? 'bg-amber-50 text-amber-600' :
                                  'bg-purple-50 text-purple-600';

              const isLow = product.stock_quantity < 50;
              const isMed = product.stock_quantity < 100 && product.stock_quantity >= 50;
              const stockColor = isLow ? 'text-red-600' : isMed ? 'text-amber-600' : 'text-emerald-600';

              return (
                <div key={product.id} className={`grid grid-cols-1 md:grid-cols-[60px_minmax(250px,2fr)_minmax(140px,1fr)_minmax(100px,1fr)_minmax(80px,0.5fr)_minmax(120px,1fr)_100px] px-4 md:px-6 py-4 items-center border-b border-gray-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_5px_15px_rgba(0,0,0,0.08)] hover:bg-white hover:z-10 relative group ${product.is_active ? 'active-item' : ''}`}>
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-red-600 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></div>
                  
                  <span className="hidden md:block text-[14px] text-gray-400 font-[500]">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</span>
                  
                  <div className="flex items-center gap-3.5 mb-3 md:mb-0 cursor-pointer pr-16 md:pr-0" onClick={() => setViewingProduct(product)}>
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden border border-gray-200 shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={18} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-[700] text-gray-800 mb-0.5">{product.name}</h4>
                      <span className="text-[12px] text-gray-400">SKU: MHV-{product.id.toString().substring(0, 4)}</span>
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <span className={`inline-block px-3.5 py-1.5 rounded-full text-[12px] font-[600] ${badgeColors}`}>
                      {product.categories?.name || 'Uncategorized'}
                    </span>
                  </div>

                  <div className="flex justify-between md:block mb-2 md:mb-0">
                    <span className="md:hidden text-[12px] font-[700] text-gray-500 uppercase">Price:</span>
                    <div>
                      <div className="text-[16px] font-[800] text-red-600">₹{product.price}</div>
                      <div className="text-[11px] text-gray-400 font-[500]">per {product.unit}</div>
                    </div>
                  </div>

                  <div className="flex justify-between md:block mb-2 md:mb-0">
                    <span className="md:hidden text-[12px] font-[700] text-gray-500 uppercase">Stock:</span>
                    <span className={`text-[14px] font-[700] ${stockColor}`}>{product.stock_quantity}</span>
                  </div>

                  <div className="flex justify-between md:block mb-3 md:mb-0">
                    <span className="md:hidden text-[12px] font-[700] text-gray-500 uppercase">Status:</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(product.id, product.is_active); }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-[700] transition-colors ${product.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${product.is_active ? 'bg-emerald-600' : 'bg-gray-400'}`}></span>
                      {product.is_active ? 'ACTIVE' : 'DEACTIVE'}
                    </button>
                  </div>

                  <div className="absolute top-4 right-4 md:relative md:top-auto md:right-auto flex gap-2 justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenModal(product); }}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 flex items-center justify-center transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      title="Edit Product"
                    >
                      <Pen size={13} fill="currentColor" strokeWidth={1} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); triggerDelete(product.id); }}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 flex items-center justify-center transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      title="Delete Product"
                    >
                      <Trash size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 rounded-full border-none bg-transparent text-gray-500 text-[18px] flex items-center justify-center cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-9 h-9 rounded-full border-none flex items-center justify-center text-[14px] font-[600] cursor-pointer transition-all ${currentPage === i + 1 ? 'bg-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 rounded-full border-none bg-transparent text-gray-500 text-[18px] flex items-center justify-center cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl"
            >
              <GlassCard className="relative overflow-y-auto max-h-[90vh] p-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
                >
                  <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-text-primary mb-5">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-2 text-red-500 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Image Upload Area */}
                  <div className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-border-light rounded-lg bg-bg-primary hover:border-brand-caramel transition-colors group relative cursor-pointer overflow-hidden">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                        <div className="relative z-10 flex flex-col items-center text-text-primary bg-bg-secondary/90 px-4 py-2 rounded-lg shadow-sm">
                          <Edit2 size={20} className="mb-1" />
                          <span className="text-xs font-semibold">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <div className="w-12 h-12 bg-brand-caramel/10 text-brand-caramel rounded-full flex items-center justify-center mx-auto mb-2">
                          <Upload size={24} />
                        </div>
                        <p className="text-sm text-text-primary font-medium">Upload product image</p>
                        <p className="text-xs text-text-muted mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Product Name</label>
                      <input
                        type="text"
                        value={formData.name} onChange={e => { setFormData({ ...formData, name: e.target.value }); setFieldErrors({ ...fieldErrors, name: null }); }}
                        className={`w-full bg-bg-primary border ${fieldErrors.name ? 'border-red-500' : 'border-border-light'} rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none transition-colors`}
                      />
                      {fieldErrors.name && <div className="text-red-500 text-[11px] mt-1 font-medium">{fieldErrors.name}</div>}
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Category</label>
                      <div className="flex gap-2">
                        <select
                          className={`w-full bg-bg-tertiary border ${fieldErrors.category_id ? 'border-red-500' : 'border-border-light'} text-text-primary text-sm rounded-lg focus:ring-brand-caramel focus:border-brand-caramel p-2.5 outline-none transition-all`}
                          value={formData.category_id} onChange={e => { setFormData({ ...formData, category_id: e.target.value }); setFieldErrors({ ...fieldErrors, category_id: null }); }}
                        >
                          <option value="" disabled>Select a category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddCategoryClick}
                          className="bg-brand-caramel/10 text-brand-caramel px-3 rounded-lg hover:bg-brand-caramel/20 transition-colors flex items-center justify-center whitespace-nowrap"
                          title="Add New Category"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      {fieldErrors.category_id && <div className="text-red-500 text-[11px] mt-1 font-medium">{fieldErrors.category_id}</div>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Price (₹)</label>
                      <input
                        type="number" step="0.01" min="0"
                        value={formData.price} onChange={e => { setFormData({ ...formData, price: e.target.value }); setFieldErrors({ ...fieldErrors, price: null }); }}
                        className={`w-full bg-bg-primary border ${fieldErrors.price ? 'border-red-500' : 'border-border-light'} rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none transition-colors`}
                      />
                      {fieldErrors.price && <div className="text-red-500 text-[11px] mt-1 font-medium">{fieldErrors.price}</div>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Unit (piece, box)</label>
                      <input
                        type="text" required
                        value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full bg-bg-primary border border-border-light rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Stock Quantity</label>
                      <input
                        type="number" min="0"
                        value={formData.stock_quantity} onChange={e => { setFormData({ ...formData, stock_quantity: e.target.value }); setFieldErrors({ ...fieldErrors, stock_quantity: null }); }}
                        className={`w-full bg-bg-primary border ${fieldErrors.stock_quantity ? 'border-red-500' : 'border-border-light'} rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none transition-colors`}
                      />
                      {fieldErrors.stock_quantity && <div className="text-red-500 text-[11px] mt-1 font-medium">{fieldErrors.stock_quantity}</div>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Description (Optional)</label>
                    <textarea
                      rows="2"
                      value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-bg-primary border border-border-light rounded-lg py-1.5 px-3 text-sm text-text-primary focus:ring-2 focus:ring-brand-caramel/50 focus:outline-none resize-none"
                    ></textarea>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-border-light bg-bg-primary focus:ring-brand-caramel text-brand-caramel"
                    />
                    <label htmlFor="is_active" className="text-xs font-medium text-text-secondary">Active</label>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-border-light mt-4">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="py-1.5 text-sm">Cancel</Button>
                    <Button type="submit" loading={saving} className="py-1.5 text-sm">Save</Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* View Product Modal */}
      <AnimatePresence>
        {viewingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/60 backdrop-blur-sm"
            onClick={() => setViewingProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-3xl"
              onClick={e => e.stopPropagation()}
            >
              <GlassCard className="relative overflow-hidden p-0 shadow-2xl border-border-light/30">
                <button
                  onClick={() => setViewingProduct(null)}
                  className="absolute top-4 right-4 z-20 bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full text-text-secondary hover:text-text-primary transition-colors backdrop-blur-md border border-border-light/50"
                >
                  <X size={18} />
                </button>

                <div className="flex flex-col md:flex-row md:h-[320px] select-none">
                  {/* Left Column: Image */}
                  <div className="w-full md:w-2/5 h-56 md:h-full bg-bg-tertiary relative flex items-center justify-center shrink-0 border-r border-border-light/30">
                    {viewingProduct.image_url ? (
                      <img
                        src={viewingProduct.image_url}
                        alt={viewingProduct.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-text-muted opacity-30" size={48} />
                    )}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-caramel bg-brand-caramel/10 backdrop-blur-md px-2.5 py-1 rounded border border-brand-caramel/20 shadow-sm">
                        {viewingProduct.categories?.name || 'Uncategorized'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Details */}
                  <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-br from-bg-secondary to-bg-primary">
                    <div>
                      <h2 className="text-xl font-bold text-text-primary mb-1 leading-tight line-clamp-2 select-text">{viewingProduct.name}</h2>

                      <div className="flex items-end gap-2 mt-2 mb-3 pb-3 border-b border-border-light/30">
                        <p className="text-2xl font-bold text-brand-pistachio leading-none">
                          ₹{viewingProduct.price}
                        </p>
                        <span className="text-xs text-text-secondary font-medium mb-0.5">/ {viewingProduct.unit}</span>
                      </div>

                      {viewingProduct.description && (
                        <div className="mb-4">
                          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                            {viewingProduct.description}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-6 mb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Stock Level</span>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${viewingProduct.stock_quantity >= 100 ? 'bg-brand-pistachio' :
                                viewingProduct.stock_quantity >= 50 ? 'bg-brand-honey' :
                                  'bg-brand-caramel'
                              }`}></span>
                            <span className="text-sm font-bold text-text-primary">
                              {viewingProduct.stock_quantity}
                            </span>
                          </div>
                        </div>

                        <div className="w-px h-6 bg-border-light/50 self-center"></div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Status</span>
                          <div className="flex items-center mt-1">
                            {viewingProduct.is_active ? (
                              <span className="text-xs font-semibold text-brand-pistachio flex items-center gap-1.5">
                                Active
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                                Deactive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-3 flex justify-between items-center border-t border-border-light/30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(viewingProduct.id);
                        }}
                        className="text-red-500 hover:text-red-600 text-sm font-semibold flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                      <Button
                        className="py-1.5 px-4 text-sm flex items-center gap-2"
                        onClick={() => {
                          setViewingProduct(null);
                          handleOpenModal(viewingProduct);
                        }}
                      >
                        <Edit2 size={14} /> Edit Listing
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-text-primary/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6 relative">
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col gap-1 mb-6 border-b border-border-light/50 pb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FolderTree className="text-red-500" size={20} />
                    Add Categories
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Add one or multiple categories separated by new lines.</p>
                </div>

                {categoryError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-600 text-[13px] font-medium">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{categoryError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveCategories}>
                  <div className="mb-5">
                    <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">Category Names</label>
                    <textarea
                      autoFocus
                      rows="4"
                      placeholder="e.g., Ice Cream&#10;Cake&#10;Sweets"
                      value={newCategoryNames}
                      onChange={e => setNewCategoryNames(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[14px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-red-50 focus:border-red-500 outline-none resize-none placeholder:text-gray-400 custom-scrollbar transition-all"
                    ></textarea>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                    <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-5 py-2.5 rounded-xl text-[14px] font-[600] text-gray-600 hover:bg-gray-100 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={savingCategory} className="px-5 py-2.5 rounded-xl text-[14px] font-[600] text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-[0_4px_12px_rgba(220,38,38,0.2)] hover:shadow-[0_6px_16px_rgba(220,38,38,0.3)] transition-all disabled:opacity-70 flex items-center gap-2">
                      {savingCategory ? 'Saving...' : 'Save Categories'}
                    </button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-gray-100"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-[20px] font-[800] text-gray-800 mb-2">Delete Product</h3>
                <p className="text-[14px] text-gray-500 mb-4">
                  How would you like to remove this product?
                </p>

                {deleteError && (
                  <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[13px] font-[500] text-left w-full">
                    {deleteError}
                  </div>
                )}

                <div className="flex flex-col gap-3 w-full mb-3">
                  <button
                    onClick={() => confirmDelete(false)}
                    className="w-full py-3 px-4 rounded-xl text-[14px] font-[600] text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban size={16} /> Archive (Recommended)
                  </button>
                  <p className="text-[11px] text-gray-400 mt-[-6px] mb-2 leading-tight">
                    Hides from catalog but keeps historical order invoices safe.
                  </p>

                  <button
                    onClick={() => confirmDelete(true)}
                    className="w-full py-3 px-4 rounded-xl text-[14px] font-[600] text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Permanent Delete
                  </button>
                  <p className="text-[11px] text-gray-400 mt-[-6px] mb-2 leading-tight">
                    Deletes permanently. Will fail if customers have already ordered it.
                  </p>
                </div>

                <button
                  onClick={() => setProductToDelete(null)}
                  className="w-full py-3 px-4 rounded-xl text-[14px] font-[600] text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
