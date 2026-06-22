import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { logSuperAdminAction } from '../../lib/logger';

// Animated Counter Component
const AnimatedCounter = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
        setCount(0);
        return;
    }
    let start = 0;
    const duration = 2500;
    const increment = target / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{count.toLocaleString('en-IN')}</span>;
};

export default function Companies() {
  const location = useLocation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  // Add/Edit State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [newCompany, setNewCompany] = useState({
    email: '',
    password: '',
    shop_name: '',
    owner_name: '',
    phone: '',
    address: ''
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Details View
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('customers');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!loading && companies.length > 0 && location.state?.openCompanyId) {
        const companyToOpen = companies.find(c => c.id === location.state.openCompanyId);
        if (companyToOpen && (!selectedCompany || selectedCompany.id !== companyToOpen.id)) {
            fetchCompanyDetails(companyToOpen);
            // Clear the state so it doesn't reopen if navigated back
            window.history.replaceState({}, document.title);
        }
    }
  }, [loading, companies, location.state, selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'company')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (id, currentStatus) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setCompanies(companies.map(c => 
        c.id === id ? { ...c, is_approved: !currentStatus } : c
      ));

      const company = companies.find(c => c.id === id);
      if (company) {
        await logSuperAdminAction({
          type: 'COMPANY',
          title: `Company ${!currentStatus ? 'Activated' : 'Deactivated'}`,
          desc: `The company "${company.shop_name}" was ${!currentStatus ? 'activated' : 'deactivated'}.`,
          userInitials: 'SA',
          color: !currentStatus ? 'emerald' : 'amber',
          icon: !currentStatus ? 'fas fa-check' : 'fas fa-ban'
        });
      }
    } catch (error) {
      console.error('Error toggling approval:', error);
      alert('Failed to update company status');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = (id, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirmId(id);
    setDeleteError('');
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setProcessingId(id);
    setDeleteError('');
    try {
      const { error } = await supabase.rpc('delete_company_permanently', {
        target_company_id: id
      });

      if (error) throw error;
      
      setCompanies(companies.filter(c => c.id !== id));
      
      const company = companies.find(c => c.id === id);
      if (company) {
        await logSuperAdminAction({
          type: 'COMPANY',
          title: 'Company Deleted',
          desc: `The company "${company.shop_name}" was permanently deleted.`,
          userInitials: 'SA',
          color: 'red',
          icon: 'fas fa-trash-alt'
        });
      }

      if (selectedCompany && selectedCompany.id === id) {
          setSelectedCompany(null);
      }
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting company:', error);
      setDeleteError(error.message || 'Failed to delete company');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    setErrorMsg('');
    try {
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: { persistSession: false, autoRefreshToken: false }
        }
      );

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: newCompany.email,
        password: newCompany.password,
        options: {
          data: {
            shop_name: newCompany.shop_name,
            owner_name: newCompany.owner_name,
            phone: newCompany.phone,
            address: newCompany.address,
            role: 'company'
          }
        }
      });

      if (authError) throw authError;

      if (authData?.user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_approved: true, email: newCompany.email })
          .eq('id', authData.user.id);

        if (updateError) console.error("Error auto-approving:", updateError);
        
        if (logoFile) {
          try {
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('company-logos')
              .upload(fileName, logoFile);
              
            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('company-logos')
                .getPublicUrl(fileName);
                
              await supabase
                .from('profiles')
                .update({ logo_url: publicUrlData.publicUrl })
                .eq('id', authData.user.id);
            }
          } catch (imgErr) {
            console.error("Logo upload failed:", imgErr);
          }
        }

        setIsAddModalOpen(false);
      }
      setNewCompany({ email: '', password: '', shop_name: '', owner_name: '', phone: '', address: '' });
      
      await logSuperAdminAction({
        type: 'COMPANY',
        title: 'New Company Added',
        desc: `Added new company "${newCompany.shop_name}".`,
        userInitials: 'SA',
        color: 'blue',
        icon: 'fas fa-building'
      });

      fetchCompanies();
    } catch (error) {
      console.error('Error adding company:', error);
      setErrorMsg(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEdit = (company, e) => {
    e.stopPropagation();
    setEditingCompany({
      id: company.id,
      shop_name: company.shop_name || '',
      owner_name: company.owner_name || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      logo_url: company.logo_url || ''
    });
    setLogoFile(null);
    setLogoPreview(company.logo_url || null);
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setErrorMsg('');
    try {
      const updateData = {
          shop_name: editingCompany.shop_name,
          owner_name: editingCompany.owner_name,
          email: editingCompany.email,
          phone: editingCompany.phone,
          address: editingCompany.address
      };

      if (logoFile) {
          try {
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `${editingCompany.id}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('company-logos')
              .upload(fileName, logoFile);
              
            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('company-logos')
                .getPublicUrl(fileName);
                
              updateData.logo_url = publicUrlData.publicUrl;
            }
          } catch (imgErr) {
            console.error("Logo upload failed:", imgErr);
          }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editingCompany.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      setEditingCompany(null);
      fetchCompanies();
      
      if (selectedCompany && selectedCompany.id === editingCompany.id) {
        setSelectedCompany(prev => ({...prev, ...editingCompany, logo_url: updateData.logo_url || prev.logo_url}));
      }

      await logSuperAdminAction({
        type: 'COMPANY',
        title: 'Company Details Updated',
        desc: `Updated details for company "${editingCompany.shop_name}".`,
        userInitials: 'SA',
        color: 'purple',
        icon: 'fas fa-edit'
      });
    } catch (error) {
      console.error('Error updating company:', error);
      setErrorMsg(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchCompanyDetails = async (company) => {
    setSelectedCompany(company);
    setDetailsLoading(true);
    setActiveDetailTab('customers');
    setCustomerSearch('');
    setProductSearch('');
    try {
      const { data: customers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      const customersCount = customers ? customers.length : 0;

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('company_id', company.id);

      const totalOrders = orders ? orders.length : 0;
      const totalRevenue = orders 
        ? orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
        : 0;

      const { data: products } = await supabase
        .from('products')
        .select(`
          *,
          categories (name)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      const productsCount = products ? products.length : 0;

      setCompanyDetails({
        customersCount,
        customers: customers || [],
        products: products || [],
        productsCount,
        totalOrders,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching company details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredCompanies = companies.filter(c => {
    const searchMatch = (c.shop_name?.toLowerCase().includes(searchQuery.toLowerCase())) || 
                        (c.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (c.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterStatus === 'Active') return searchMatch && c.is_approved;
    if (filterStatus === 'Deactivated') return searchMatch && !c.is_approved;
    return searchMatch;
  });

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.is_approved).length;
  const deactivatedCompanies = totalCompanies - activeCompanies;

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
  };

  const handleMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
  };

  const getGradient = (name) => {
    const colors = [
        'from-pink-100 to-pink-200 text-pink-600',
        'from-blue-100 to-blue-200 text-blue-600',
        'from-purple-100 to-purple-200 text-purple-600',
        'from-orange-100 to-orange-200 text-orange-600',
        'from-emerald-100 to-emerald-200 text-emerald-600'
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
            <i className="fas fa-circle-notch fa-spin text-3xl text-red-500"></i>
        </div>
    );
  }

  // Details View Output
  if (selectedCompany) {
      return (
          <div className="space-y-6 fade-in p-4 lg:p-8">
              <button 
                  onClick={() => {
                      if (location.state?.returnTo) {
                          navigate(location.state.returnTo);
                      } else {
                          setSelectedCompany(null);
                      }
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors mb-2 w-max px-4 py-2 rounded-xl hover:bg-red-50"
              >
                  <i className="fas fa-arrow-left"></i> {location.state?.returnTo ? 'Back to Customers' : 'Back to Companies'}
              </button>

              <div className="glass-card w-full rounded-2xl p-6 lg:p-10 shadow-lg border border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-gray-100">
                      <div className="flex items-center gap-6">
                          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center font-bold text-4xl shadow-md ${selectedCompany.logo_url ? '' : getGradient(selectedCompany.shop_name)} overflow-hidden`}>
                              {selectedCompany.logo_url ? (
                                  <img src={selectedCompany.logo_url} alt="Logo" className="w-full h-full object-cover" />
                              ) : (
                                  selectedCompany.shop_name ? selectedCompany.shop_name.charAt(0).toUpperCase() : 'C'
                              )}
                          </div>
                          <div>
                              <h2 className="text-3xl font-bold text-gray-800 tracking-tight">{selectedCompany.shop_name}</h2>
                              <p className="text-gray-500 mt-1 flex items-center gap-2">
                                  <i className="fas fa-envelope text-gray-400"></i> {selectedCompany.email}
                              </p>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                            {selectedCompany.is_approved ? (
                                <button 
                                    onClick={() => handleToggleApproval(selectedCompany.id, true)}
                                    disabled={processingId === selectedCompany.id}
                                    className="deactivate-btn action-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                                >
                                    {processingId === selectedCompany.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-ban"></i>}
                                    Deactivate Company
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleToggleApproval(selectedCompany.id, false)}
                                    disabled={processingId === selectedCompany.id}
                                    className="action-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200"
                                >
                                    {processingId === selectedCompany.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                                    Activate Company
                                </button>
                            )}
                            <button 
                                onClick={(e) => confirmDelete(selectedCompany.id, e)}
                                disabled={processingId === selectedCompany.id}
                                className="delete-btn action-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-50 text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                {processingId === selectedCompany.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash-alt"></i>}
                                Delete
                            </button>
                      </div>
                  </div>

                  {detailsLoading ? (
                      <div className="py-20 flex justify-center">
                          <i className="fas fa-circle-notch fa-spin text-4xl text-red-500"></i>
                      </div>
                  ) : companyDetails ? (
                      <div className="space-y-10">
                          {/* Key Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 text-center shadow-sm hover:shadow-md transition-shadow">
                                  <div className="w-12 h-12 mx-auto rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                                      <i className="fas fa-users text-xl"></i>
                                  </div>
                                  <p className="text-4xl font-bold text-purple-700 mb-1">{companyDetails.customersCount}</p>
                                  <p className="text-xs font-bold text-purple-600/70 uppercase tracking-widest">Total Customers</p>
                              </div>
                              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 text-center shadow-sm hover:shadow-md transition-shadow">
                                  <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                                      <i className="fas fa-shopping-cart text-xl"></i>
                                  </div>
                                  <p className="text-4xl font-bold text-emerald-700 mb-1">{companyDetails.totalOrders}</p>
                                  <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest">Total Orders</p>
                              </div>
                              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 text-center shadow-sm hover:shadow-md transition-shadow">
                                  <div className="w-12 h-12 mx-auto rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                                      <i className="fas fa-rupee-sign text-xl"></i>
                                  </div>
                                  <p className="text-4xl font-bold text-blue-700 mb-1">₹{companyDetails.totalRevenue.toLocaleString('en-IN')}</p>
                                  <p className="text-xs font-bold text-blue-600/70 uppercase tracking-widest">Total Revenue</p>
                              </div>
                          </div>

                          {/* Info Blocks */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <div className="p-6 rounded-2xl bg-gray-50/50 border border-gray-100">
                                  <h4 className="text-sm font-bold text-gray-800 mb-5 border-b border-gray-200 pb-3 flex items-center gap-2">
                                      <i className="fas fa-info-circle text-gray-400"></i> Profile Information
                                  </h4>
                                  <div className="space-y-4 text-sm">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                          <span className="text-gray-500">Owner Name</span>
                                          <span className="font-semibold text-gray-800 text-base">{selectedCompany.owner_name || 'N/A'}</span>
                                      </div>
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                          <span className="text-gray-500">Phone Number</span>
                                          <span className="font-semibold text-gray-800 text-base">{selectedCompany.phone || 'N/A'}</span>
                                      </div>
                                      <div className="flex flex-col sm:flex-row justify-between gap-1 pt-1">
                                          <span className="text-gray-500">Address</span>
                                          <span className="font-semibold text-gray-800 sm:text-right max-w-xs leading-relaxed">{selectedCompany.address || 'N/A'}</span>
                                      </div>
                                  </div>
                              </div>

                              <div className="p-6 rounded-2xl bg-gray-50/50 border border-gray-100">
                                  <h4 className="text-sm font-bold text-gray-800 mb-5 border-b border-gray-200 pb-3 flex items-center gap-2">
                                      <i className="fas fa-shield-alt text-gray-400"></i> Account Status
                                  </h4>
                                  <div className="space-y-4 text-sm">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                          <span className="text-gray-500">Current Status</span>
                                          {selectedCompany.is_approved ? (
                                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                                              </span>
                                          ) : (
                                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold">
                                                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Deactivated
                                              </span>
                                          )}
                                      </div>
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                          <span className="text-gray-500">Joined Date</span>
                                          <span className="font-semibold text-gray-800">{new Date(selectedCompany.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Tabs */}
                          <div className="flex border-b border-gray-200 mt-8 mb-6">
                              <button 
                                  onClick={() => setActiveDetailTab('customers')}
                                  className={`pb-3 px-6 text-sm font-bold transition-all ${activeDetailTab === 'customers' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                  <i className="fas fa-users mr-2"></i> Associated Customers
                              </button>
                              <button 
                                  onClick={() => setActiveDetailTab('products')}
                                  className={`pb-3 px-6 text-sm font-bold transition-all ${activeDetailTab === 'products' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                  <i className="fas fa-box mr-2"></i> Products List
                              </button>
                          </div>

                          {/* Tab Content */}
                          {activeDetailTab === 'customers' && (
                              <div className="p-6 rounded-2xl bg-gray-50/50 border border-gray-100">
                                  <div className="flex items-center justify-between mb-4">
                                      <h5 className="font-bold text-gray-800">Customers ({companyDetails.customers ? companyDetails.customers.length : 0})</h5>
                                      <div className="relative">
                                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                              <i className="fas fa-search text-xs"></i>
                                          </div>
                                          <input 
                                              type="text" 
                                              value={customerSearch}
                                              onChange={(e) => setCustomerSearch(e.target.value)}
                                              placeholder="Search customers..." 
                                              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all w-64"
                                          />
                                      </div>
                                  </div>
                                  
                                  {companyDetails.customers && companyDetails.customers.filter(c => 
                                      (c.owner_name?.toLowerCase().includes(customerSearch.toLowerCase())) || 
                                      (c.phone?.includes(customerSearch)) || 
                                      (c.email?.toLowerCase().includes(customerSearch.toLowerCase()))
                                  ).length > 0 ? (
                                      <div className="overflow-auto max-h-[600px] custom-scrollbar">
                                          <table className="w-full text-left">
                                              <thead className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur-sm shadow-sm">
                                                  <tr>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tl-lg w-16">S.No.</th>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Name</th>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined Date</th>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tr-lg">Status</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100">
                                                  {companyDetails.customers.filter(c => 
                                                      (c.owner_name?.toLowerCase().includes(customerSearch.toLowerCase())) || 
                                                      (c.phone?.includes(customerSearch)) || 
                                                      (c.email?.toLowerCase().includes(customerSearch.toLowerCase()))
                                                  ).map((customer, index) => (
                                                      <tr key={customer.id} className="hover:bg-white transition-colors">
                                                          <td className="py-3 px-4 text-sm font-bold text-gray-400">{index + 1}</td>
                                                          <td className="py-3 px-4">
                                                              <div className="flex items-center gap-3">
                                                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-100">
                                                                      {customer.owner_name ? customer.owner_name.charAt(0).toUpperCase() : 'C'}
                                                                  </div>
                                                                  <span className="text-sm font-bold text-gray-800">{customer.owner_name || 'N/A'}</span>
                                                              </div>
                                                          </td>
                                                          <td className="py-3 px-4 whitespace-nowrap">
                                                              <p className="text-sm font-medium text-gray-700">{customer.phone}</p>
                                                              <p className="text-xs text-gray-500">{customer.email || 'N/A'}</p>
                                                          </td>
                                                          <td className="py-3 px-4 text-sm font-medium text-gray-600">
                                                              {new Date(customer.created_at).toLocaleDateString()}
                                                          </td>
                                                          <td className="py-3 px-4">
                                                              {customer.is_approved ? (
                                                                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">Active</span>
                                                              ) : (
                                                                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">Blocked</span>
                                                              )}
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      </div>
                                  ) : (
                                      <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                                          <div className="w-12 h-12 mx-auto rounded-full bg-gray-50 flex items-center justify-center text-gray-300 text-xl mb-3">
                                              <i className="fas fa-user-slash"></i>
                                          </div>
                                          <p className="text-gray-400 font-medium mt-1">No customers have registered with this company yet.</p>
                                      </div>
                                  )}
                              </div>
                          )}
                          
                          {activeDetailTab === 'products' && (
                              <div className="p-6 rounded-2xl bg-gray-50/50 border border-gray-100">
                                  <div className="flex items-center justify-between mb-4">
                                      <h5 className="font-bold text-gray-800">Products ({companyDetails.products ? companyDetails.products.length : 0})</h5>
                                      <div className="relative">
                                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                              <i className="fas fa-search text-xs"></i>
                                          </div>
                                          <input 
                                              type="text" 
                                              value={productSearch}
                                              onChange={(e) => setProductSearch(e.target.value)}
                                              placeholder="Search products..." 
                                              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all w-64"
                                          />
                                      </div>
                                  </div>

                                  {companyDetails.products && companyDetails.products.filter(p => 
                                      (p.name?.toLowerCase().includes(productSearch.toLowerCase())) ||
                                      (p.categories?.name?.toLowerCase().includes(productSearch.toLowerCase()))
                                  ).length > 0 ? (
                                      <div className="overflow-auto max-h-[600px] custom-scrollbar">
                                          <table className="w-full text-left">
                                              <thead className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur-sm shadow-sm">
                                                  <tr>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tl-lg w-16">S.No.</th>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product Name</th>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                                                      <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tr-lg">Added On</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100">
                                                  {companyDetails.products.filter(p => 
                                                      (p.name?.toLowerCase().includes(productSearch.toLowerCase())) ||
                                                      (p.categories?.name?.toLowerCase().includes(productSearch.toLowerCase()))
                                                  ).map((product, index) => (
                                                      <tr key={product.id} className="hover:bg-white transition-colors">
                                                          <td className="py-3 px-4 text-sm font-bold text-gray-400">{index + 1}</td>
                                                          <td className="py-3 px-4">
                                                              <div className="flex items-center gap-3">
                                                                  {product.image_url ? (
                                                                      <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                                                                  ) : (
                                                                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                                          <i className="fas fa-image"></i>
                                                                      </div>
                                                                  )}
                                                                  <span className="text-sm font-bold text-gray-800">{product.name || 'Unnamed Product'}</span>
                                                              </div>
                                                          </td>
                                                          <td className="py-3 px-4 whitespace-nowrap">
                                                              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">{product.categories?.name || 'Uncategorized'}</span>
                                                          </td>
                                                          <td className="py-3 px-4 whitespace-nowrap">
                                                              <span className="text-sm font-bold text-emerald-600">₹{product.price}</span>
                                                          </td>
                                                          <td className="py-3 px-4 text-sm font-medium text-gray-600">
                                                              {product.stock_quantity > 0 ? (
                                                                  <span>{product.stock_quantity} units</span>
                                                              ) : (
                                                                  <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">Out of Stock</span>
                                                              )}
                                                          </td>
                                                          <td className="py-3 px-4 text-sm font-medium text-gray-600">
                                                              {new Date(product.created_at).toLocaleDateString()}
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      </div>
                                  ) : (
                                      <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                                          <div className="w-12 h-12 mx-auto rounded-full bg-gray-50 flex items-center justify-center text-gray-300 text-xl mb-3">
                                              <i className="fas fa-box-open"></i>
                                          </div>
                                          <p className="text-gray-400 font-medium mt-1">No products added by this company yet.</p>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  ) : null}
              </div>
          </div>
      );
  }

  // Main List View
  return (
    <div className="space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Total Companies */}
            <div 
                className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" 
                style={{ animationDelay: '0.2s' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-sm">
                        <i className="fas fa-building"></i>
                    </div>
                    <div className="relative">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    </div>
                </div>
                <h3 className="text-4xl font-bold text-gray-800 mb-1 counter">
                    <AnimatedCounter target={totalCompanies} />
                </h3>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Companies</p>
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: '100%' }}></div>
                </div>
            </div>

            {/* Active Companies */}
            <div 
                className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" 
                style={{ animationDelay: '0.3s' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-sm">
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <i className="fas fa-arrow-up text-xs"></i> {totalCompanies ? Math.round((activeCompanies/totalCompanies)*100) : 0}%
                    </span>
                </div>
                <h3 className="text-4xl font-bold text-gray-800 mb-1 counter">
                    <AnimatedCounter target={activeCompanies} />
                </h3>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Active Companies</p>
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: totalCompanies ? `${(activeCompanies/totalCompanies)*100}%` : '0%' }}></div>
                </div>
            </div>

            {/* Deactivated Companies */}
            <div 
                className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in" 
                style={{ animationDelay: '0.4s' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-600 text-2xl shadow-sm">
                        <i className="fas fa-times-circle"></i>
                    </div>
                </div>
                <h3 className="text-4xl font-bold text-gray-800 mb-1 counter">
                    <AnimatedCounter target={deactivatedCompanies} />
                </h3>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Deactivated Companies</p>
                <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: totalCompanies ? `${(deactivatedCompanies/totalCompanies)*100}%` : '0%' }}></div>
                </div>
            </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between fade-in relative z-20" style={{ animationDelay: '0.5s' }}>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
                {/* Search */}
                <div className="relative flex-1 md:max-w-md">
                    <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input 
                        type="text" 
                        placeholder="Search companies..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all shadow-sm" 
                    />
                </div>
                {/* Status Filter */}
                <div className="relative shrink-0 sm:w-40" style={{ minWidth: '160px' }}>
                    <button 
                        type="button"
                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                        className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 focus:outline-none focus:border-red-500 hover:border-gray-300 transition-colors shadow-sm"
                    >
                        <span>{filterStatus}</span>
                        <i className={`fas fa-chevron-down text-xs transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    
                    {isStatusOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsStatusOpen(false)}></div>
                            <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden py-1">
                                {['All Status', 'Active', 'Deactivated'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => { setFilterStatus(status); setIsStatusOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filterStatus === status ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl p-1 shadow-inner flex-1 sm:flex-none justify-center shrink-0">
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`view-toggle flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'table' ? 'active' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fas fa-list"></i>
                        <span className="hidden sm:inline">List</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`view-toggle flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'active' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fas fa-th-large"></i>
                        <span className="hidden sm:inline">Grid</span>
                    </button>
                </div>
                
                {/* Add Button */}
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="add-btn flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg shadow-red-500/30 whitespace-nowrap shrink-0 flex-1 sm:flex-none"
                >
                    <i className="fas fa-plus"></i>
                    Add Company
                </button>
            </div>
        </div>

        {/* Content Views */}
        {viewMode === 'table' ? (
            <div className="glass-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-16">S.No</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined Date</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredCompanies.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="py-8 text-center text-gray-500">
                                    No companies found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredCompanies.map((company, index) => (
                                <tr key={company.id} className="table-row cursor-pointer" onClick={() => fetchCompanyDetails(company)}>
                                    <td className="py-5 px-6 text-sm font-bold text-gray-400">{index + 1}</td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`company-avatar w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-lg shadow-sm ${company.logo_url ? '' : getGradient(company.shop_name)} overflow-hidden`}>
                                                {company.logo_url ? (
                                                    <img src={company.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    company.shop_name ? company.shop_name.charAt(0).toUpperCase() : 'C'
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-800">{company.shop_name || 'Unnamed Company'}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">{company.owner_name || 'No Owner'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <i className="fas fa-envelope text-gray-400 text-xs w-4"></i>
                                                <span className="text-xs">{company.email || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <i className="fas fa-phone text-gray-400 text-xs w-4"></i>
                                                <span className="text-xs font-medium">{company.phone || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <i className="far fa-calendar-alt text-gray-400"></i>
                                            <span className="font-medium">{new Date(company.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        {company.is_approved ? (
                                            <span className="status-badge inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full border border-emerald-100">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                Active
                                            </span>
                                        ) : (
                                            <span className="status-badge inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-full border border-red-100">
                                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                Deactivated
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {company.is_approved ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleToggleApproval(company.id, true); }}
                                                    disabled={processingId === company.id}
                                                    className="deactivate-btn action-btn flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                                                >
                                                    {processingId === company.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-ban"></i>}
                                                    Deactivate
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleToggleApproval(company.id, false); }}
                                                    disabled={processingId === company.id}
                                                    className="action-btn flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200"
                                                >
                                                    {processingId === company.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                                                    Activate
                                                </button>
                                            )}
                                            
                                            <button 
                                                onClick={(e) => handleOpenEdit(company, e)}
                                                className="action-btn w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100"
                                            >
                                                <i className="fas fa-pen text-xs"></i>
                                            </button>
                                            

                                            
                                            <button 
                                                onClick={(e) => confirmDelete(company.id, e)}
                                                disabled={processingId === company.id}
                                                className="delete-btn action-btn w-9 h-9 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                {processingId === company.id ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-trash-alt text-xs"></i>}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination (Static for now) */}
            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <p className="text-sm text-gray-500">Showing <span className="font-bold text-gray-800">{filteredCompanies.length}</span> companies</p>
                <div className="flex items-center gap-2">
                    <button className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50" disabled>
                        <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <button className="w-9 h-9 rounded-lg bg-red-500 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-red-500/20">1</button>
                    <button className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50" disabled>
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in" style={{ animationDelay: '0.6s' }}>
                {filteredCompanies.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500 glass-card rounded-2xl border border-gray-100">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 text-3xl mb-4 border border-gray-100">
                            <i className="fas fa-building"></i>
                        </div>
                        <p className="font-bold text-gray-700 text-base">No companies found</p>
                        <p className="text-sm mt-1 font-medium text-gray-500">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    filteredCompanies.map((company) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={company.id} 
                            onClick={() => fetchCompanyDetails(company)}
                            className="company-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 bg-white cursor-pointer hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`company-avatar w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center font-bold text-2xl shadow-sm border ${company.logo_url ? '' : getGradient(company.shop_name)} overflow-hidden`}>
                                    {company.logo_url ? (
                                        <img src={company.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        company.shop_name ? company.shop_name.charAt(0).toUpperCase() : 'C'
                                    )}
                                </div>
                                {company.is_approved ? (
                                    <span className="status-badge inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        Active
                                    </span>
                                ) : (
                                    <span className="status-badge inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-full border border-red-100 shadow-sm">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                        Deactivated
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">{company.shop_name || 'Unnamed Company'}</h3>
                            <p className="text-xs text-gray-500 mb-5 font-medium">Owner: {company.owner_name || 'N/A'}</p>
                            
                            <div className="space-y-3 mb-5">
                                <div className="contact-chip flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-600 shadow-sm">
                                    <i className="fas fa-envelope text-red-400 text-xs w-4"></i>
                                    <span className="text-xs font-medium truncate">{company.email || 'N/A'}</span>
                                </div>
                                <div className="contact-chip flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-600 shadow-sm">
                                    <i className="fas fa-phone text-red-400 text-xs w-4"></i>
                                    <span className="text-xs font-bold">{company.phone || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                    <i className="far fa-calendar-alt"></i>
                                    <span>{new Date(company.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {company.is_approved ? (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleApproval(company.id, true); }}
                                            disabled={processingId === company.id}
                                            className="action-btn w-9 h-9 rounded-xl flex items-center justify-center shadow-sm border bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"
                                            title="Deactivate Company"
                                        >
                                            {processingId === company.id ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-ban text-xs"></i>}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleApproval(company.id, false); }}
                                            disabled={processingId === company.id}
                                            className="action-btn w-9 h-9 rounded-xl flex items-center justify-center shadow-sm border bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                            title="Activate Company"
                                        >
                                            {processingId === company.id ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-check text-xs"></i>}
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => handleOpenEdit(company, e)}
                                        className="action-btn w-9 h-9 rounded-xl flex items-center justify-center shadow-sm border bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                                        title="Edit Company"
                                    >
                                        <i className="fas fa-pen text-xs"></i>
                                    </button>
                                    <button 
                                        onClick={(e) => confirmDelete(company.id, e)}
                                        disabled={processingId === company.id}
                                        className="delete-btn action-btn w-9 h-9 rounded-xl bg-gray-50 text-gray-400 border border-gray-200 flex items-center justify-center shadow-sm hover:text-red-600 hover:bg-red-50 hover:border-red-100"
                                        title="Delete Company"
                                    >
                                        {processingId === company.id ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-trash-alt text-xs"></i>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        )}

        {/* Add Company Modal (Stays as popup) */}
        <AnimatePresence>
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
                        onClick={() => !isAdding && setIsAddModalOpen(false)}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white w-full max-w-lg rounded-[24px] overflow-hidden shadow-2xl relative z-10 border border-gray-100 max-h-[90vh] flex flex-col"
                    >
                        <div className="bg-gradient-to-r from-red-500 to-red-700 px-8 py-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <h3 className="text-2xl font-bold">Add New Company</h3>
                                    <p className="text-red-100 text-sm mt-1 font-medium">Register a new wholesale partner</p>
                                </div>
                                <button 
                                    onClick={() => !isAdding && setIsAddModalOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            {errorMsg && (
                                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-3">
                                    <i className="fas fa-exclamation-circle text-lg"></i>
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleAddCompany} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Company Logo</label>
                                    <div className="relative flex items-center gap-4">
                                        <div className="flex-1">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                id="admin-logo-upload"
                                                onChange={handleLogoChange}
                                                className="hidden"
                                            />
                                            <label htmlFor="admin-logo-upload" className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-400 hover:bg-red-50/50 cursor-pointer transition-all text-sm font-bold text-gray-600">
                                                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                                    <i className="fas fa-cloud-upload-alt"></i>
                                                </div>
                                                <span className="truncate">{logoFile ? logoFile.name : 'Choose a logo file...'}</span>
                                            </label>
                                        </div>
                                        {logoPreview && (
                                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 shadow-sm shrink-0 bg-gray-50">
                                                <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Company/Shop Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                            <i className="fas fa-store"></i>
                                        </div>
                                        <input 
                                            type="text" 
                                            required
                                            value={newCompany.shop_name}
                                            onChange={e => setNewCompany({...newCompany, shop_name: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium text-gray-800"
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Owner Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                            <i className="fas fa-user"></i>
                                        </div>
                                        <input 
                                            type="text" 
                                            required
                                            value={newCompany.owner_name}
                                            onChange={e => setNewCompany({...newCompany, owner_name: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium text-gray-800"
                                            placeholder="Enter owner name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                            <i className="fas fa-envelope"></i>
                                        </div>
                                        <input 
                                            type="email" 
                                            required
                                            value={newCompany.email}
                                            onChange={e => setNewCompany({...newCompany, email: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium text-gray-800"
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                                <i className="fas fa-lock"></i>
                                            </div>
                                            <input 
                                                type="password" 
                                                required
                                                value={newCompany.password}
                                                onChange={e => setNewCompany({...newCompany, password: e.target.value})}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium text-gray-800"
                                                placeholder="Min 6 chars"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                                <i className="fas fa-phone"></i>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={newCompany.phone}
                                                onChange={e => setNewCompany({...newCompany, phone: e.target.value})}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium text-gray-800"
                                                placeholder="Phone number"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button 
                                        type="submit"
                                        disabled={isAdding}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-lg shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isAdding ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Creating...</>
                                        ) : (
                                            'Create Company'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        {/* Edit Company Modal */}
        <AnimatePresence>
            {isEditModalOpen && editingCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
                        onClick={() => !isUpdating && setIsEditModalOpen(false)}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white w-full max-w-lg rounded-[24px] overflow-hidden shadow-2xl relative z-10 border border-gray-100 max-h-[90vh] flex flex-col"
                    >
                        <div className="bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <h3 className="text-2xl font-bold">Edit Company</h3>
                                    <p className="text-blue-100 text-sm mt-1 font-medium">Update wholesale partner details</p>
                                </div>
                                <button 
                                    onClick={() => !isUpdating && setIsEditModalOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            {errorMsg && (
                                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-3">
                                    <i className="fas fa-exclamation-circle text-lg"></i>
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleUpdateCompany} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Company Logo</label>
                                    <div className="relative flex items-center gap-4">
                                        <div className="flex-1">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                id="admin-edit-logo-upload"
                                                onChange={handleLogoChange}
                                                className="hidden"
                                            />
                                            <label htmlFor="admin-edit-logo-upload" className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all text-sm font-bold text-gray-600">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                    <i className="fas fa-cloud-upload-alt"></i>
                                                </div>
                                                <span className="truncate">{logoFile ? logoFile.name : 'Update logo file...'}</span>
                                            </label>
                                        </div>
                                        {logoPreview && (
                                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 shadow-sm shrink-0 bg-gray-50">
                                                <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Company/Shop Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                            <i className="fas fa-store"></i>
                                        </div>
                                        <input 
                                            type="text" 
                                            required
                                            value={editingCompany.shop_name}
                                            onChange={e => setEditingCompany({...editingCompany, shop_name: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-gray-800"
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Owner Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                            <i className="fas fa-user"></i>
                                        </div>
                                        <input 
                                            type="text" 
                                            required
                                            value={editingCompany.owner_name}
                                            onChange={e => setEditingCompany({...editingCompany, owner_name: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-gray-800"
                                            placeholder="Enter owner name"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                                <i className="fas fa-envelope"></i>
                                            </div>
                                            <input 
                                                type="email" 
                                                required
                                                value={editingCompany.email}
                                                onChange={e => setEditingCompany({...editingCompany, email: e.target.value})}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-gray-800"
                                                placeholder="Enter email address"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                                <i className="fas fa-phone"></i>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={editingCompany.phone}
                                                onChange={e => setEditingCompany({...editingCompany, phone: e.target.value})}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-gray-800"
                                                placeholder="Phone number"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none text-gray-400">
                                            <i className="fas fa-map-marker-alt"></i>
                                        </div>
                                        <textarea 
                                            value={editingCompany.address}
                                            onChange={e => setEditingCompany({...editingCompany, address: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-gray-800 resize-none h-24"
                                            placeholder="Enter full address"
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button 
                                        type="submit"
                                        disabled={isUpdating}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isUpdating ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Saving Changes...</>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
                        onClick={() => setDeleteConfirmId(null)}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl relative z-10 border border-gray-100 p-6 text-center"
                    >
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Company</h3>
                        <p className="text-gray-500 text-sm mb-6">
                            Are you sure you want to delete this company? This action cannot be undone.
                        </p>
                        {deleteError && (
                            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-start gap-2 text-left">
                                <i className="fas fa-info-circle shrink-0 mt-0.5"></i>
                                <span className="break-words">{deleteError}</span>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={executeDelete}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
}
