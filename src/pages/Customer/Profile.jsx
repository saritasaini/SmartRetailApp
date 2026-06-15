import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { User, Store, Phone, MapPin, Save, Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    shop_name: '',
    owner_name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        shop_name: profile.shop_name || '',
        owner_name: profile.owner_name || '',
        phone: profile.phone || '',
        address: profile.address || ''
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          shop_name: formData.shop_name,
          owner_name: formData.owner_name,
          phone: formData.phone,
          address: formData.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      await fetchProfile(user.id);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">My Profile</h1>
        <p className="text-sm text-text-secondary">Manage your shop details and account information.</p>
      </div>

      <GlassCard>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            
            {/* Shop Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Shop Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Store size={18} className="text-text-muted" />
                </div>
                <input
                  type="text"
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  className="w-full bg-bg-tertiary border border-border-light rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:outline-none focus:border-brand-caramel focus:ring-1 focus:ring-brand-caramel transition-colors"
                  placeholder="e.g. Sharma Sweets"
                  required
                />
              </div>
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Owner Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-text-muted" />
                </div>
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  className="w-full bg-bg-tertiary border border-border-light rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:outline-none focus:border-brand-caramel focus:ring-1 focus:ring-brand-caramel transition-colors"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={18} className="text-text-muted" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-bg-tertiary border border-border-light rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:outline-none focus:border-brand-caramel focus:ring-1 focus:ring-brand-caramel transition-colors"
                  placeholder="e.g. +91 9876543210"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Full Address</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <MapPin size={18} className="text-text-muted" />
                </div>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full bg-bg-tertiary border border-border-light rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:outline-none focus:border-brand-caramel focus:ring-1 focus:ring-brand-caramel transition-colors resize-none"
                  placeholder="Enter your complete shop address..."
                />
              </div>
            </div>
            
            {/* Account Email (Readonly) */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email Account</label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full bg-bg-primary/50 border border-border-light/50 rounded-lg px-4 py-2.5 text-text-muted cursor-not-allowed"
              />
              <p className="text-[10px] text-text-muted mt-1">Email cannot be changed directly.</p>
            </div>

          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm border ${
              message.type === 'success' 
                ? 'bg-brand-pistachio/10 text-brand-pistachio border-brand-pistachio/20' 
                : 'bg-brand-berry/10 text-brand-berry border-brand-berry/20'
            }`}>
              {message.text}
            </div>
          )}

          <div className="pt-4 border-t border-border-light flex justify-end">
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
