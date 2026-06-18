import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import CompanyLayout from './layouts/CompanyLayout';
import CustomerLayout from './layouts/CustomerLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';

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
      <Routes>
        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/company" element={<CompanyRegister />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Super Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="super_admin">
            <SuperAdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="companies" element={<SuperAdminCompanies />} />
          <Route path="customers" element={<SuperAdminCustomers />} />
          <Route path="orders" element={<SuperAdminOrders />} />
          <Route path="orders/:id" element={<SuperAdminOrderDetail />} />
          <Route path="invoices" element={<SuperAdminInvoices />} />
          <Route path="analytics" element={<SuperAdminAnalytics />} />
          <Route path="audit-logs" element={<SuperAdminAuditTrail />} />
          <Route path="settings" element={<SuperAdminSettings />} />
        </Route>

        {/* Company Routes */}
        <Route path="/company" element={
          <ProtectedRoute allowedRole="company">
            <CompanyLayout />
          </ProtectedRoute>
        }>
          <Route index element={<CompanyDashboard />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="payments" element={<PaymentManagement />} />
          <Route path="logs" element={<CompanyLogs />} />
          <Route path="settings" element={<CompanySettings />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/customer" element={
          <ProtectedRoute allowedRole="customer">
            <CustomerLayout />
          </ProtectedRoute>
        }>
          <Route index element={<CustomerDashboard />} />
          <Route path="catalog" element={<ProductCatalog />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="orders" element={<MyOrders />} />
          <Route path="payments" element={<CustomerPayments />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
