import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { User, Users, Mail, Phone, MapPin, Edit2, Trash2, Plus, X, Shield, Calendar, Store } from 'lucide-react';

import { supabase } from '../../lib/supabase';
export default function CompanySettings() {
  const { profile, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Members State
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: 'Staff', salary: '', status: 'active'
  });
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.id) return;

    setUploadingLogo(true);
    setLogoError('');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      useAuthStore.setState((state) => ({
        profile: { ...state.profile, logo_url: publicUrlData.publicUrl }
      }));
      
    } catch (err) {
      console.error("Logo upload failed:", err);
      setLogoError(err.message || 'Unknown error');
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchMembers();
    }
  }, [profile?.id]);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from('company_members')
        .select('*')
        .eq('company_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenModal = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name || '',
        email: member.email || '',
        phone: member.phone || '',
        role: member.role || 'Staff',
        salary: member.salary || '',
        status: member.status || 'active'
      });
    } else {
      setEditingMember(null);
      setFormData({ name: '', email: '', phone: '', role: 'Staff', salary: '', status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const payload = {
        ...formData,
        company_id: profile.id
      };

      if (editingMember) {
        const { error } = await supabase
          .from('company_members')
          .update(payload)
          .eq('id', editingMember.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_members')
          .insert([payload]);
        if (error) throw error;
      }

      await fetchMembers();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving member:', err);
      alert('Failed to save member.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (id) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        const { error } = await supabase
          .from('company_members')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setMembers(members.filter(m => m.id !== id));
      } catch (err) {
        console.error('Error deleting member:', err);
        alert('Failed to delete member.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Company Settings</h1>
        <p className="text-text-secondary">Manage your profile, company details, and staff members.</p>
      </div>

      {/* Segmented Control Tabs */}
      <div className="inline-flex bg-bg-secondary/60 p-1.5 rounded-xl border border-border-light/50 w-full sm:w-auto overflow-x-auto shadow-inner">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap ${
            activeTab === 'profile' 
              ? 'bg-bg-primary text-brand-caramel shadow-md scale-[1.02]' 
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'
          }`}
        >
          <Store size={18} />
          Company Profile
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap ${
            activeTab === 'members' 
              ? 'bg-bg-primary text-brand-caramel shadow-md scale-[1.02]' 
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'
          }`}
        >
          <Users size={18} />
          Staff & Members
          <span className="ml-1 bg-text-secondary/10 text-text-primary px-2 py-0.5 rounded-full text-xs">{members.length}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        
        {/* Profile Tab */}
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <GlassCard className="p-0 overflow-hidden shadow-lg border-t-4 border-t-brand-caramel flex flex-col">
              
              {/* Top Side: Company Summary */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 relative overflow-hidden bg-bg-secondary/30 border-b border-border-light/50">
                {/* Subtle Background glow */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-brand-caramel/10 blur-3xl rounded-full"></div>
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className="relative group w-24 h-24 shrink-0">
                    <div 
                      className="w-full h-full bg-gradient-to-br from-brand-caramel/20 to-bg-primary text-brand-caramel rounded-2xl shadow-inner flex items-center justify-center border border-brand-caramel/20 overflow-hidden transform transition-transform duration-300 group-hover:scale-105"
                    >
                      {uploadingLogo ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-caramel"></div>
                      ) : profile?.logo_url ? (
                        <img src={profile.logo_url} alt="Company Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Store size={36} />
                      )}
                    </div>
                    
                    {/* Camera Icon Overlay */}
                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-500 hover:text-brand-caramel hover:scale-110 transition-all cursor-pointer z-20">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                      <i className="fas fa-camera text-lg"></i>
                    </label>
                  </div>
                  
                  <div className="text-left">
                    <h2 className="text-2xl font-bold text-text-primary mb-1">{profile?.shop_name || 'Your Company'}</h2>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-pistachio px-2.5 py-1 bg-brand-pistachio/10 border border-brand-pistachio/20 rounded-full shadow-sm mb-2">
                      <Shield size={12} /> Verified Business
                    </div>
                    {logoError && (
                      <div className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1 mt-1 max-w-[250px]">
                        <AlertCircle size={12} className="shrink-0" />
                        <span className="truncate" title={logoError}>{logoError}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 sm:mt-0 relative z-10 flex items-center gap-4 bg-bg-primary/50 px-5 py-3 rounded-xl border border-border-light/50 shadow-sm">
                  <div className="flex items-center gap-2 text-text-secondary font-medium">
                    <Users size={18} className="text-brand-caramel" /> 
                    <span>Total Staff</span>
                  </div>
                  <div className="w-px h-8 bg-border-light/50 mx-1"></div>
                  <span className="font-bold text-brand-caramel text-2xl">
                    {members.length}
                  </span>
                </div>
              </div>

              {/* Bottom Side: Owner Details */}
              <div className="w-full bg-bg-primary">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-bg-secondary to-bg-tertiary/50 px-6 py-5 border-b border-border-light/50">
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <User size={20} className="text-brand-caramel" /> Owner Information
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">Primary account holder and contact details.</p>
                </div>
                
                <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="group">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-brand-caramel mb-2 uppercase tracking-wider">
                      Owner Name
                    </label>
                    <p className="text-base font-medium text-text-primary pb-2 border-b border-border-light group-hover:border-brand-caramel/40 transition-colors">
                      {profile?.owner_name || 'Not provided'}
                    </p>
                  </div>
                  
                  <div className="group">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-brand-caramel mb-2 uppercase tracking-wider">
                      Email Address
                    </label>
                    <p className="text-base font-medium text-text-primary pb-2 border-b border-border-light group-hover:border-brand-caramel/40 transition-colors flex items-center gap-2">
                      <Mail size={16} className="text-text-secondary" /> {user?.email || profile?.email || 'N/A'}
                    </p>
                  </div>
                  
                  <div className="group">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-brand-caramel mb-2 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <p className="text-base font-medium text-text-primary pb-2 border-b border-border-light group-hover:border-brand-caramel/40 transition-colors flex items-center gap-2">
                      <Phone size={16} className="text-text-secondary" /> {profile?.phone || 'N/A'}
                    </p>
                  </div>
                  
                  <div className="sm:col-span-2 group mt-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-brand-caramel mb-2 uppercase tracking-wider">
                       Shop Address
                    </label>
                    <p className="text-base font-medium text-text-primary pb-2 border-b border-border-light group-hover:border-brand-caramel/40 transition-colors flex items-start gap-2">
                      <MapPin size={16} className="text-text-secondary mt-0.5 shrink-0" /> 
                      <span className="leading-relaxed">{profile?.address || 'No address provided. Please update your profile.'}</span>
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <GlassCard className="p-0 overflow-hidden shadow-lg border-t-4 border-t-brand-caramel animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 md:p-6 border-b border-border-light/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-bg-secondary to-bg-tertiary/30">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Users size={20} className="text-brand-caramel" /> Team Members
                </h3>
                <p className="text-sm text-text-secondary mt-1">Manage staff roles, details, and access.</p>
              </div>
              <button 
                onClick={() => handleOpenModal()}
                className="bg-gradient-to-br from-red-600 to-red-800 text-white border-none py-3 px-6 rounded-xl text-[14px] font-[600] cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(220,38,38,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(220,38,38,0.4)] w-full md:w-auto"
              >
                <Plus size={16} strokeWidth={2.5} /> Add New Member
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-light bg-bg-tertiary/10">
                    <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Member Details</th>
                    <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Role & Salary</th>
                    <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMembers ? (
                    <tr>
                      <td colSpan="4" className="text-center py-12 text-text-secondary">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-caramel mx-auto mb-3"></div>
                        Loading team members...
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-12 text-text-secondary">
                        <Users className="mx-auto text-text-muted mb-3 opacity-50" size={32} />
                        No members found. Add your first team member!
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="border-b border-border-light/50 hover:bg-bg-primary/5">
                        <td className="py-3 px-4">
                          <p className="text-sm font-bold text-text-primary">{member.name}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                            <span className="text-xs text-text-secondary flex items-center gap-1"><Phone size={10} /> {member.phone}</span>
                            {member.email && <span className="text-xs text-text-secondary flex items-center gap-1"><Mail size={10} /> {member.email}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Shield size={14} className="text-brand-caramel" />
                            <p className="text-sm font-semibold text-text-primary">{member.role}</p>
                          </div>
                          <p className="text-xs text-text-secondary mt-1 font-mono">{member.salary || 'N/A'}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            member.status === 'active' ? 'bg-brand-pistachio/10 text-brand-pistachio' : 'bg-gray-500/10 text-gray-500'
                          }`}>
                            {member.status}
                          </span>
                          <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                            <Calendar size={10} /> Joined: {new Date(member.created_at || new Date()).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleOpenModal(member)}
                              className="p-1.5 rounded-md text-text-secondary hover:bg-brand-caramel/10 hover:text-brand-caramel transition-colors"
                              title="Edit Member"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-1.5 rounded-md text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Add/Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-text-secondary hover:text-text-primary bg-bg-secondary p-1 rounded-full border border-border-light transition-colors z-10"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-text-primary mb-6 pr-8">
              {editingMember ? 'Edit Team Member' : 'Add New Member'}
            </h2>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel focus:ring-1 focus:ring-brand-caramel"
                    placeholder="e.g. Ramesh Kumar"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    onBlur={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val && val.length !== 10) {
                        setPhoneError('Please enter a valid 10-digit phone number.');
                      } else {
                        setPhoneError('');
                        setFormData(prev => ({ ...prev, phone: val }));
                      }
                    }}
                    className={`w-full bg-bg-primary border ${phoneError ? 'border-red-500' : 'border-border-light'} rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel focus:ring-1 focus:ring-brand-caramel`}
                    placeholder="e.g. 9876543210"
                  />
                  {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel focus:ring-1 focus:ring-brand-caramel"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Role/Position *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel focus:ring-1 focus:ring-brand-caramel"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Salary (₹) (Optional)</label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    className="w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-brand-caramel focus:ring-1 focus:ring-brand-caramel"
                    placeholder="e.g. ₹15,000"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between p-3 bg-bg-primary rounded-lg border border-border-light mt-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Active Status</p>
                    <p className="text-xs text-text-muted">Is this member currently working?</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.status === 'active'}
                      onChange={(e) => setFormData({...formData, status: e.target.checked ? 'active' : 'inactive'})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-pistachio"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-border-light mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={isSaving}>
                  {editingMember ? 'Update Member' : 'Add Member'}
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
