import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Warehouse, 
  BarChart3, 
  Settings, 
  LogOut,
  User,
  DollarSign,
  Truck,
  FileText,
  Award,
  Clock,
  RotateCcw
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    const currentRole = user?.role;
    
    try {
      await authAPI.logout();
      logout();
      
      // Redirect based on user role
      if (currentRole === 'ADMIN') {
        navigate('/admin-login');
      } else {
        navigate('/branch-login');
      }
      
      toast.success('تم تسجيل الخروج بنجاح');
    } catch (error) {
      logout();
      
      // Redirect based on user role
      if (currentRole === 'ADMIN') {
        navigate('/admin-login');
      } else {
        navigate('/branch-login');
      }
    }
  };

  const navigation = [
    { name: 'الرئيسية', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'نقطة البيع', path: '/pos', icon: ShoppingCart, roles: ['MANAGER', 'CASHIER'] },
    { name: 'منتجاتي', path: '/my-products', icon: Package, roles: ['CASHIER', 'MANAGER'] },
    { name: 'المخزون', path: '/inventory', icon: Warehouse, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'التوريدات', path: '/transfers', icon: Truck, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'الفواتير', path: '/invoices', icon: FileText, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'التقارير', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
    
    // Admin and Manager
    { name: 'الخزينة', path: '/vault', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
    { name: 'إدارة الشيفتات', path: '/shift-management', icon: Clock, roles: ['MANAGER'] },
    { name: 'إدارة المرتجعات', path: '/returns-management', icon: RotateCcw, roles: ['MANAGER'] },
    { name: 'المنتجات والسيريالات', path: '/admin-products', icon: Package, roles: ['ADMIN'] },
    { name: 'الفروع', path: '/branches', icon: DollarSign, roles: ['ADMIN'] },
    { name: 'المستخدمين', path: '/users', icon: User, roles: ['ADMIN'] },
    { name: 'تقييم الكاشيرات', path: '/cashier-performance', icon: Award, roles: ['ADMIN'] },
    { name: 'الأصناف', path: '/categories', icon: Package, roles: ['ADMIN'] },
    { name: 'الموردين', path: '/suppliers', icon: DollarSign, roles: ['ADMIN'] },
    { name: 'المصروفات', path: '/expenses', icon: DollarSign, roles: ['ADMIN'] },
    { name: 'العملاء', path: '/customers', icon: User, roles: ['ADMIN'] },
    { name: 'الشركاء', path: '/partners', icon: User, roles: ['ADMIN'] },
    { name: 'التقرير الشهري', path: '/monthly-report', icon: FileText, roles: ['ADMIN'] },
    
    { name: 'الإعدادات', path: '/settings', icon: Settings, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 w-10 h-10 rounded-lg flex items-center justify-center">
              <DollarSign className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {user?.role === 'ADMIN' ? 'Biso & Gilan & Layan' : 'Bee 🐝 JEANS'}
              </h1>
              <p className="text-sm text-gray-500">{user?.branch?.name || 'نظام نقاط البيع'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">{user?.fullName}</p>
              <p className="text-sm text-gray-500">{user?.role === 'ADMIN' ? 'مدير' : user?.role === 'MANAGER' ? 'مدير فرع' : 'كاشير'}</p>
            </div>
            <div className="bg-primary-100 w-10 h-10 rounded-full flex items-center justify-center">
              <User className="text-primary-600" size={20} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with Scroll */}
        <aside className="w-64 bg-white border-l shadow-sm flex flex-col">
          {/* Scrollable Navigation */}
          <nav className="p-4 space-y-2 overflow-y-auto flex-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Fixed Logout Button at Bottom */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer Removed Temporarily */}
    </div>
  );
}
