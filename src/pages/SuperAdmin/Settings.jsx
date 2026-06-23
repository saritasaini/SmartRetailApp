import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';

export default function SuperAdminSettings() {
    const { user, profile } = useAuthStore();
    const [activeTab, setActiveTab] = useState('profile');
    
    // Profile State
    const [profileData, setProfileData] = useState({
        fullName: profile?.owner_name || profile?.full_name || 'Admin User',
        email: user?.email || 'admin@smartretail.com',
        phone: profile?.phone || '+91 98765 43210'
    });
    const [phoneError, setPhoneError] = useState('');

    useEffect(() => {
        if (profile || user) {
            setProfileData({
                fullName: profile?.owner_name || profile?.full_name || 'Admin User',
                email: user?.email || 'admin@smartretail.com',
                phone: profile?.phone || '+91 98765 43210'
            });
        }
    }, [profile, user]);

    // Helper to get initials
    const getInitials = (name) => {
        if (!name) return 'AU';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    // Password State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false
    });

    // Platform State
    const [platformData, setPlatformData] = useState({
        name: 'SmartRetail App',
        email: 'support@smartretail.com',
        currency: 'Indian Rupee (₹)',
        timezone: 'Asia/Kolkata (IST)',
        description: 'B2B Wholesale Platform for Retail Businesses'
    });

    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        orders: true,
        registrations: false,
        invoices: true
    });
    const [twoFactor, setTwoFactor] = useState(true);
    const [maintenance, setMaintenance] = useState(false);

    const [toastMessage, setToastMessage] = useState('');
    const [securityError, setSecurityError] = useState('');
    const [isSavingSecurity, setIsSavingSecurity] = useState(false);

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
    };

    const toggleNotification = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const handleSave = (section) => {
        showToast(`${section} settings saved successfully!`);
    };

    const handleSecuritySave = async () => {
        setSecurityError('');
        if (!passwords.current) {
            setSecurityError('Current password is required.');
            return;
        }
        if (passwords.new !== passwords.confirm) {
            setSecurityError('New passwords do not match.');
            return;
        }
        if (passwords.new.length < 8) {
            setSecurityError('New password must be at least 8 characters.');
            return;
        }

        setIsSavingSecurity(true);
        try {
            // Verify current password by attempting to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwords.current
            });

            if (signInError) {
                setSecurityError('Current password is incorrect.');
                setIsSavingSecurity(false);
                return;
            }

            // If correct, update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: passwords.new
            });

            if (updateError) {
                setSecurityError(updateError.message);
                setIsSavingSecurity(false);
                return;
            }

            showToast('Password updated successfully!');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            setSecurityError('An error occurred while updating the password.');
        } finally {
            setIsSavingSecurity(false);
        }
    };

    const handleCancel = () => {
        const confirmCancel = window.confirm("Are you sure you want to cancel your subscription?");
        if(confirmCancel) showToast("Subscription cancelled.");
    };

    const handleUpgrade = () => {
        showToast("Redirecting to plan upgrade page...");
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Platform <span className="gradient-text">Settings</span></h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your account and platform preferences</p>
                </div>
            </div>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 bg-white border-l-4 border-emerald-500 text-gray-800 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 transition-all duration-500 transform translate-y-0 opacity-100">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <i className="fas fa-check"></i>
                    </div>
                    <div>
                        <p className="font-bold text-sm">Success</p>
                        <p className="text-xs text-gray-500">{toastMessage}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Settings Navigation */}
                <div className="w-full lg:w-64 flex-shrink-0 fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="glass-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden bg-white">
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Settings</h3>
                        </div>
                        <nav className="py-2">
                            <div 
                                onClick={() => handleTabClick('profile')}
                                className={`settings-tab flex items-center gap-3 px-6 py-3.5 text-sm font-medium ${activeTab === 'profile' ? 'active' : 'text-gray-600'}`}
                            >
                                <i className="fas fa-user-circle w-5 text-center"></i>Profile
                            </div>
                            <div 
                                onClick={() => handleTabClick('account')}
                                className={`settings-tab flex items-center gap-3 px-6 py-3.5 text-sm font-medium ${activeTab === 'account' ? 'active' : 'text-gray-600'}`}
                            >
                                <i className="fas fa-lock w-5 text-center"></i>Account Security
                            </div>
                            <div 
                                onClick={() => handleTabClick('notifications')}
                                className={`settings-tab flex items-center gap-3 px-6 py-3.5 text-sm font-medium ${activeTab === 'notifications' ? 'active' : 'text-gray-600'}`}
                            >
                                <i className="fas fa-bell w-5 text-center"></i>Notifications
                            </div>
                            <div 
                                onClick={() => handleTabClick('platform')}
                                className={`settings-tab flex items-center gap-3 px-6 py-3.5 text-sm font-medium ${activeTab === 'platform' ? 'active' : 'text-gray-600'}`}
                            >
                                <i className="fas fa-sliders-h w-5 text-center"></i>Platform
                            </div>
                            <div 
                                onClick={() => handleTabClick('billing')}
                                className={`settings-tab flex items-center gap-3 px-6 py-3.5 text-sm font-medium ${activeTab === 'billing' ? 'active' : 'text-gray-600'}`}
                            >
                                <i className="fas fa-credit-card w-5 text-center"></i>Billing
                            </div>
                        </nav>
                    </div>
                </div>

                {/* Settings Content */}
                <div className="flex-1 space-y-6">
                    
                    {/* Profile Section */}
                    {activeTab === 'profile' && (
                        <div className="settings-section active bg-white">
                            <div className="glass-card rounded-2xl p-8 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.3s' }}>
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="relative">
                                        <div className="avatar-upload w-24 h-24 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-red-500/30 cursor-pointer">
                                            {getInitials(profileData.fullName)}
                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-white">
                                                <i className="fas fa-camera text-gray-500 text-xs"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">{profileData.fullName}</h3>
                                        <p className="text-sm text-gray-500">Super Administrator</p>
                                        <p className="text-xs text-gray-400 mt-1">{profileData.email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                        <input type="text" value={profileData.fullName} onChange={e => setProfileData({...profileData, fullName: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                        <input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                        <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} onBlur={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val && val.length !== 10) {
                                                setPhoneError('Please enter a valid 10-digit phone number.');
                                            } else {
                                                setPhoneError('');
                                                setProfileData(prev => ({ ...prev, phone: val }));
                                            }
                                        }} className={`input-field w-full px-4 py-3 rounded-xl border ${phoneError ? 'border-red-500' : 'border-gray-200'} bg-white text-sm focus:outline-none`} />
                                        {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                        <input type="text" value="Super Admin" disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-not-allowed" />
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                    <button onClick={() => handleSave('Profile')} className="save-btn px-8 py-3 rounded-xl text-white font-semibold shadow-lg shadow-red-500/30 flex items-center gap-2">
                                        <i className="fas fa-save"></i>Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Account Security Section */}
                    {activeTab === 'account' && (
                        <div className="settings-section active bg-white">
                            <div className="glass-card rounded-2xl p-8 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.3s' }}>
                                <h3 className="text-lg font-bold text-gray-800 mb-6">Change Password</h3>
                                
                                {securityError && (
                                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-exclamation-circle"></i>
                                            <p className="text-sm font-medium">{securityError}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6 max-w-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                        <div className="relative">
                                            <input type={showPassword.current ? "text" : "password"} value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} placeholder="Enter current password" className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none pr-12" />
                                            <button onClick={() => setShowPassword({...showPassword, current: !showPassword.current})} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                <i className={`fas ${showPassword.current ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                        <div className="relative">
                                            <input type={showPassword.new ? "text" : "password"} value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} placeholder="Enter new password" className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none pr-12" />
                                            <button onClick={() => setShowPassword({...showPassword, new: !showPassword.new})} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                <i className={`fas ${showPassword.new ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Minimum 8 characters with letters, numbers & symbols</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                        <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} placeholder="Confirm new password" className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none" />
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Two-Factor Authentication</h3>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 text-xl"><i className="fas fa-shield-alt"></i></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Authenticator App</p>
                                                <p className="text-xs text-gray-500">Secure your account with 2FA</p>
                                            </div>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${twoFactor ? 'active' : ''}`} 
                                            onClick={() => setTwoFactor(!twoFactor)}
                                        ></div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                    <button 
                                        onClick={handleSecuritySave} 
                                        disabled={isSavingSecurity}
                                        className={`save-btn px-8 py-3 rounded-xl text-white font-semibold shadow-lg shadow-red-500/30 flex items-center gap-2 ${isSavingSecurity ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isSavingSecurity ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Updating...</>
                                        ) : (
                                            <><i className="fas fa-save"></i>Update Security</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Section */}
                    {activeTab === 'notifications' && (
                        <div className="settings-section active bg-white">
                            <div className="glass-card rounded-2xl p-8 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.3s' }}>
                                <h3 className="text-lg font-bold text-gray-800 mb-6">Notification Preferences</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-600 text-xl"><i className="fas fa-envelope"></i></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Email Notifications</p>
                                                <p className="text-xs text-gray-500">Receive updates via email</p>
                                            </div>
                                        </div>
                                        <div className={`toggle-switch ${notifications.email ? 'active' : ''}`} onClick={() => toggleNotification('email')}></div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 text-xl"><i className="fas fa-bell"></i></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Push Notifications</p>
                                                <p className="text-xs text-gray-500">Browser push notifications</p>
                                            </div>
                                        </div>
                                        <div className={`toggle-switch ${notifications.push ? 'active' : ''}`} onClick={() => toggleNotification('push')}></div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 text-xl"><i className="fas fa-shopping-bag"></i></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Order Updates</p>
                                                <p className="text-xs text-gray-500">New orders and status changes</p>
                                            </div>
                                        </div>
                                        <div className={`toggle-switch ${notifications.orders ? 'active' : ''}`} onClick={() => toggleNotification('orders')}></div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600 text-xl"><i className="fas fa-users"></i></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">New Registrations</p>
                                                <p className="text-xs text-gray-500">Company and customer signups</p>
                                            </div>
                                        </div>
                                        <div className={`toggle-switch ${notifications.registrations ? 'active' : ''}`} onClick={() => toggleNotification('registrations')}></div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 text-xl"><i className="fas fa-file-invoice"></i></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Invoice Alerts</p>
                                                <p className="text-xs text-gray-500">Payment reminders and confirmations</p>
                                            </div>
                                        </div>
                                        <div className={`toggle-switch ${notifications.invoices ? 'active' : ''}`} onClick={() => toggleNotification('invoices')}></div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                    <button onClick={() => handleSave('Notification')} className="save-btn px-8 py-3 rounded-xl text-white font-semibold shadow-lg shadow-red-500/30 flex items-center gap-2">
                                        <i className="fas fa-save"></i>Save Preferences
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Platform Section */}
                    {activeTab === 'platform' && (
                        <div className="settings-section active bg-white">
                            <div className="glass-card rounded-2xl p-8 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.3s' }}>
                                <h3 className="text-lg font-bold text-gray-800 mb-6">Platform Configuration</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
                                        <input type="text" value={platformData.name} onChange={e => setPlatformData({...platformData, name: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                                        <input type="email" value={platformData.email} onChange={e => setPlatformData({...platformData, email: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                                        <select value={platformData.currency} onChange={e => setPlatformData({...platformData, currency: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none">
                                            <option>Indian Rupee (₹)</option>
                                            <option>US Dollar ($)</option>
                                            <option>Euro (€)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                                        <select value={platformData.timezone} onChange={e => setPlatformData({...platformData, timezone: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none">
                                            <option>Asia/Kolkata (IST)</option>
                                            <option>America/New_York (EST)</option>
                                            <option>Europe/London (GMT)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Platform Description</label>
                                        <textarea rows="3" value={platformData.description} onChange={e => setPlatformData({...platformData, description: e.target.value})} className="input-field w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none resize-none"></textarea>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Maintenance Mode</h3>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center text-red-600 text-xl"><i className="fas fa-exclamation-triangle"></i></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Enable Maintenance Mode</p>
                                                <p className="text-xs text-gray-500">Temporarily disable platform access</p>
                                            </div>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${maintenance ? 'active' : ''}`} 
                                            onClick={() => setMaintenance(!maintenance)}
                                        ></div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                    <button onClick={() => handleSave('Platform')} className="save-btn px-8 py-3 rounded-xl text-white font-semibold shadow-lg shadow-red-500/30 flex items-center gap-2">
                                        <i className="fas fa-save"></i>Save Configuration
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Billing Section */}
                    {activeTab === 'billing' && (
                        <div className="settings-section active bg-white">
                            <div className="glass-card rounded-2xl p-8 shadow-sm border border-gray-100 fade-in" style={{ animationDelay: '0.3s' }}>
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">Current Plan</h3>
                                        <p className="text-sm text-gray-500 mt-1">Manage your subscription</p>
                                    </div>
                                    <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20">Pro Plan</span>
                                </div>

                                <div className="p-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200 mb-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-3xl font-bold text-gray-800">₹2,999<span className="text-sm font-normal text-gray-500">/month</span></p>
                                            <p className="text-sm text-gray-500 mt-1">Billed annually</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-700">Next billing</p>
                                            <p className="text-lg font-bold text-red-600">Jun 28, 2026</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white rounded-full h-2 mb-4">
                                        <div className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500">12 days remaining in current billing cycle</p>
                                </div>

                                <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Method</h3>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-md flex items-center justify-center text-white text-xs font-bold">VISA</div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Visa ending in 4242</p>
                                            <p className="text-xs text-gray-500">Expires 12/2027</p>
                                        </div>
                                    </div>
                                    <button className="text-sm font-medium text-red-600 hover:text-red-700">Change</button>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                                    <button onClick={handleCancel} className="danger-btn px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm flex items-center gap-2">
                                        <i className="fas fa-times-circle"></i>Cancel Subscription
                                    </button>
                                    <button onClick={handleUpgrade} className="save-btn px-8 py-3 rounded-xl text-white font-semibold shadow-lg shadow-red-500/30 flex items-center gap-2">
                                        <i className="fas fa-arrow-up"></i>Upgrade Plan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
