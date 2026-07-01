import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import CompanyLayout from './layouts/CompanyLayout';
import CustomerLayout from './layouts/CustomerLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import CompanyRegister from './pages/Auth/CompanyRegister';
import ResetPassword from './pages/Auth/ResetPassword';

// Super Admin Pages
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import SuperAdminCompanies from './pages/SuperAdmin/Companies';
import SuperAdminCustomers from './pages/SuperAdmin/Customers';
import SuperAdminOrders from './pages/SuperAdmin/Orders';
import SuperAdminInvoices from './pages/SuperAdmin/Invoices';
import SuperAdminAnalytics from './pages/SuperAdmin/Analytics';
import SuperAdminAuditTrail from './pages/SuperAdmin/AuditTrail';
import SuperAdminOrderDetail from './pages/SuperAdmin/OrderDetail';
import SuperAdminSettings from './pages/SuperAdmin/Settings';

// Company Pages
import CompanyDashboard from './pages/Company/Dashboard';
import ProductManagement from './pages/Company/Products';
import OrderManagement from './pages/Company/Orders';
import CustomerManagement from './pages/Company/Customers';
import CustomerDetail from './pages/Company/CustomerDetail';
import PaymentManagement from './pages/Company/Payments';
import CompanyLogs from './pages/Company/Logs';
import CompanySettings from './pages/Company/Settings';
import CompanyNotifications from './pages/Company/Notifications';

// Customer Pages
import CustomerDashboard from './pages/Customer/Dashboard';
import ProductCatalog from './pages/Customer/Catalog';
import CartPage from './pages/Customer/Cart';
import MyOrders from './pages/Customer/Orders';
import Profile from './pages/Customer/Profile';
import CustomerPayments from './pages/Customer/Payments';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-brand-caramel border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Deep Security Fix 1: Block deactivated users from ghost sessions
  if (profile && !profile.is_approved && profile.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 text-center">
        <div className="max-w-md bg-bg-secondary border border-border-light rounded-xl p-8 shadow-xl animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-brand-berry/10 text-brand-berry rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Account Inactive</h2>
          <p className="text-text-secondary mb-8">Your account is either pending approval or has been deactivated by the company admin.</p>
          <button 
            onClick={() => { useAuthStore.getState().signOut(); window.location.href='/login'; }}
            className="px-6 py-3 bg-gradient-to-r from-brand-berry to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg w-full"
          >
            Log Out & Return
          </button>
        </div>
      </div>
    );
  }

  if (profile && profile.role !== allowedRole) {
    if (profile.role === 'super_admin') return <Navigate to="/admin" replace />;
    return <Navigate to={profile.role === 'company' ? '/company' : '/customer'} replace />;
  }

  return children;
};

function App() {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/company" element={<CompanyRegister />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Super Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="super_admin"><SuperAdminLayout /></ProtectedRoute>}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="companies" element={<SuperAdminCompanies />} />
          <Route path="customers" element={<SuperAdminCustomers />} />
          <Route path="orders" element={<SuperAdminOrders />} />
          <Route path="orders/:id" element={<SuperAdminOrderDetail />} />
          <Route path="invoices" element={<SuperAdminInvoices />} />
          <Route path="analytics" element={<SuperAdminAnalytics />} />
          <Route path="notifications" element={<CompanyNotifications recipientType="super_admin" />} />
          <Route path="audit" element={<SuperAdminAuditTrail />} />
          <Route path="settings" element={<SuperAdminSettings />} />
        </Route>

        {/* Company Routes */}
        <Route path="/company" element={<ProtectedRoute allowedRole="company"><CompanyLayout /></ProtectedRoute>}>
          <Route index element={<CompanyDashboard />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="customers/:id" element={<ErrorBoundary><CustomerDetail /></ErrorBoundary>} />
          <Route path="payments" element={<PaymentManagement />} />
          <Route path="notifications" element={<CompanyNotifications />} />
          <Route path="logs" element={<CompanyLogs />} />
          <Route path="settings" element={<CompanySettings />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/customer" element={<ProtectedRoute allowedRole="customer"><CustomerLayout /></ProtectedRoute>}>
          <Route index element={<CustomerDashboard />} />
          <Route path="catalog" element={<ProductCatalog />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="orders" element={<MyOrders />} />
          <Route path="profile" element={<Profile />} />
          <Route path="payments" element={<CustomerPayments />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
