import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Mail, Lock, Store, User, Phone, Loader2, AlertCircle, MapPin, Briefcase, Eye, EyeOff, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

export default function CompanyRegister() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    shop_name: '',
    owner_name: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
  
  const signUp = useAuthStore(state => state.signUp);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { email, password, ...metadata } = formData;
      const authData = await signUp(email, password, { ...metadata, role: 'company' });
      
      if (authData?.user?.id) {
        // Ensure email is also saved to the profile
        await supabase.from('profiles').update({ email: email }).eq('id', authData.user.id);
      }

      if (logoFile && authData?.user?.id) {
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
          console.warn("Logo upload failed:", imgErr);
        }
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to register company account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 bg-bg-primary border border-border-light rounded-lg"
      >
        <div className="w-16 h-16 bg-brand-pistachio/20 text-brand-pistachio rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Company Registered!</h2>
        <p className="text-text-secondary mb-6">Your company account has been created successfully. You can now log in.</p>
        <Link to="/login" className="inline-block px-6 py-2 bg-brand-caramel text-brand-navy font-bold rounded-lg hover:bg-brand-caramel/90 transition-colors">
          Return to Login
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 bg-brand-caramel/20 text-brand-caramel rounded-full flex items-center justify-center mb-3">
          <Briefcase size={24} />
        </div>
        <h2 className="text-2xl font-bold text-text-primary text-center">Register Company</h2>
        <p className="text-text-secondary text-sm text-center mt-1">Create an account to manage your retail network</p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-brand-berry/10 border border-red-500/50 flex items-center gap-2 text-brand-berry text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#6B4226] mb-1">Company Logo</label>
          <div className="relative flex items-center gap-4">
              <div className="flex-1">
                  <input 
                      id="logo-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleLogoChange} 
                  />
                  <label htmlFor="logo-upload" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 border-dashed border-border-light hover:border-brand-caramel hover:bg-brand-caramel/5 cursor-pointer transition-all text-sm font-medium text-text-secondary">
                      <div className="w-8 h-8 rounded-md bg-brand-caramel/10 text-brand-caramel flex items-center justify-center shrink-0">
                          <Upload size={16} />
                      </div>
                      <span className="truncate">{logoFile ? logoFile.name : 'Upload logo file...'}</span>
                  </label>
              </div>
              {logoPreview && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-border-light shadow-sm shrink-0 bg-bg-secondary">
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
              )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6B4226] mb-1">Company / Shop Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Store className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="text"
              name="shop_name"
              required
              value={formData.shop_name}
              onChange={handleChange}
              className="w-full bg-bg-primary border border-border-light rounded-lg py-2 pl-10 pr-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 focus:border-brand-caramel transition-colors"
              placeholder="Mahadev Wholesale Inc."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6B4226] mb-1">Owner Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="text"
              name="owner_name"
              required
              value={formData.owner_name}
              onChange={handleChange}
              className="w-full bg-bg-primary border border-border-light rounded-lg py-2 pl-10 pr-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 focus:border-brand-caramel transition-colors"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6B4226] mb-1">Phone Number</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-bg-primary border border-border-light rounded-lg py-2 pl-10 pr-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 focus:border-brand-caramel transition-colors"
              placeholder="+91 9876543210"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6B4226] mb-1">Full Address</label>
          <div className="relative">
            <div className="absolute top-2.5 left-0 pl-3 flex items-start pointer-events-none">
              <MapPin className="h-5 w-5 text-text-secondary" />
            </div>
            <textarea
              name="address"
              required
              rows="2"
              value={formData.address}
              onChange={handleChange}
              className="w-full bg-bg-primary border border-border-light rounded-lg py-2 pl-10 pr-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 focus:border-brand-caramel transition-colors resize-none"
              placeholder="Office No, Street, City, State, Pincode"
            ></textarea>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6B4226] mb-1">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-bg-primary border border-border-light rounded-lg py-2 pl-10 pr-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 focus:border-brand-caramel transition-colors"
              placeholder="company@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6B4226] mb-1">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-bg-primary border border-border-light rounded-lg py-2 pl-10 pr-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-caramel/50 focus:border-brand-caramel transition-colors"
              placeholder="••••••••"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary"
              title={showPassword ? "Hide Password" : "Show Password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-gradient-to-r from-brand-caramel to-brand-caramel/80 hover:to-brand-caramel text-brand-navy font-bold py-2.5 px-4 rounded-lg shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Register Company'}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-center text-sm text-text-secondary">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="text-brand-caramel hover:text-brand-caramel/80 font-medium transition-colors">
            Sign In
          </Link>
        </p>
        <p>
          Are you a Retailer?{' '}
          <Link to="/register" className="text-brand-caramel hover:text-brand-caramel/80 font-medium transition-colors">
            Register Shop
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
