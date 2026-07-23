import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import AdminLogin from './pages/AdminLogin';
import BranchLogin from './pages/BranchLogin';
import TestPage from './pages/TestPage';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ShiftManagement from './pages/ShiftManagement';
import Branches from './pages/Branches';
import Partners from './pages/Partners';
import Suppliers from './pages/Suppliers';
import Users from './pages/Users';
import Transfers from './pages/Transfers';
import MonthlyReport from './pages/MonthlyReport';
import Invoices from './pages/Invoices';
import Layout from './components/Layout';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import CashierPerformance from './pages/CashierPerformance';
import MyProducts from './pages/MyProducts';
import VaultManagement from './pages/VaultManagement';
import ReturnsManagement from './pages/ReturnsManagement';
import CreateReturn from './pages/CreateReturn';
import CustomerInvoicePrint from './pages/CustomerInvoicePrint';
import FabricTypes from './pages/FabricTypes';
import FabricWarehouse from './pages/FabricWarehouse';
import ProductMaster from './pages/ProductMaster';
import Manufacturing from './pages/Manufacturing';
import WashingOrders from './pages/WashingOrders';
import ProductionDashboard from './pages/ProductionDashboard';


function ProtectedRoute({ children }) {
  const { user } = useAuthStore();
  const location = useLocation();
  
  if (!user) {
    // Check if last logged in user was admin or branch user
    const lastRole = localStorage.getItem('lastRole');
    
    // Redirect based on last role or to branch login by default
    const loginPath = lastRole === 'ADMIN' ? '/admin-login' : '/branch-login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }
  
  // Save current role for future redirects
  if (user?.role) {
    localStorage.setItem('lastRole', user.role);
  }
  
  return children;
}

function App() {
  const { user } = useAuthStore();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  
  console.log('🚀 App.jsx - Location:', location.pathname, 'User:', user?.username || 'null');

  return (
    <Routes>
      {/* TEST ROUTE - NO REDIRECTS */}
      <Route path="/test" element={<TestPage />} />
      <Route path="/branch/:branchCode/test" element={<TestPage />} />
      
      {/* Print Routes - No Layout */}
      <Route path="/print/customer-invoice/:invoiceId" element={<CustomerInvoicePrint />} />
      
      {/* Public Login Routes */}
      <Route 
        path="/admin-login" 
        element={user?.role === 'ADMIN' ? <Navigate to="/" replace /> : <AdminLogin />} 
      />
      
      <Route 
        path="/branch-login" 
        element={user && user.role !== 'ADMIN' ? <Navigate to="/" replace /> : <BranchLogin />} 
      />
      
      {/* Branch login with code - for direct access */}
      <Route 
        path="/branch/:branchCode" 
        element={<BranchLogin />} 
      />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="transfers" element={<Transfers />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        
        {/* Cashier Routes */}
        <Route path="my-products" element={<MyProducts />} />
        
        {/* Admin and Manager Routes */}
        <Route path="vault" element={<VaultManagement />} />
        <Route path="shift-management" element={<ShiftManagement />} />
        <Route path="returns-management" element={<ReturnsManagement />} />
        <Route path="create-return" element={<CreateReturn />} />
        
        {/* Admin Only Routes */}
        {isAdmin && (
          <>
            <Route path="branches" element={<Branches />} />
            <Route path="users" element={<Users />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="partners" element={<Partners />} />
            <Route path="monthly-report" element={<MonthlyReport />} />
            <Route path="customers" element={<Customers />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="cashier-performance" element={<CashierPerformance />} />
            <Route path="fabric-types" element={<FabricTypes />} />
            <Route path="fabric-warehouse" element={<FabricWarehouse />} />
            <Route path="product-master" element={<ProductMaster />} />
            <Route path="manufacturing" element={<Manufacturing />} />
            <Route path="washing-orders" element={<WashingOrders />} />
            <Route path="production-dashboard" element={<ProductionDashboard />} />
          </>
        )}
      </Route>

      {/* Catch all - redirect to admin login */}
      <Route path="*" element={<Navigate to="/admin-login" replace />} />
    </Routes>
  );
}

export default App;
