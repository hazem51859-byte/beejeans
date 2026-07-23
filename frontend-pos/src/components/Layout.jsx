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
    { name: 'المرتجعات', path: '/returns-management', icon: RotateCcw, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    
    // Admin Only - Production System
    { name: '--- إدارة الإنتاج ---', path: '#production-header', icon: Package, roles: ['ADMIN'], isHeader: true },
    { name: 'لوحة الإنتاج', path: '/production-dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
    { name: 'الأصناف (Master)', path: '/product-master', icon: Package, roles: ['ADMIN'] },
    { name: 'أنواع الخامات', path: '/fabric-types', icon: Package, roles: ['ADMIN'] },
    { name: 'مخزن القماش', path: '/fabric-warehouse', icon: Warehouse, roles: ['ADMIN'] },
    { name: 'أوامر التصنيع', path: '/manufacturing', icon: Truck, roles: ['ADMIN'] },
    { name: 'أوامر الغسيل', path: '/washing-orders', icon: RotateCcw, roles: ['ADMIN'] },
    
    { name: '--- الإدارة العامة ---', path: '#admin-header', icon: Settings, roles: ['ADMIN'], isHeader: true },
    { name: 'الفروع', path: '/branches', icon: DollarSign, roles: ['ADMIN'] },
    { name: 'المستخدمين', path: '/users', icon: User, roles: ['ADMIN'] },
    { name: 'تقييم الكاشيرات', path: '/cashier-performance', icon: Award, roles: ['ADMIN'] },
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
              // Header items (non-clickable section titles)
              if (item.isHeader) {
                return (
                  <div key={item.path} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {item.name}
                  </div>
                );
              }

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
                  {Icon && <Icon size={20} />}
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
        <main className="flex-1 overflow-auto">
          <div className="p-6 pb-16">
            <Outlet />
          </div>
          
          {/* Fixed Footer - ZoTech */}
          <div className="fixed bottom-0 right-64 left-0 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 px-6 shadow-lg border-t border-gray-700 z-40" dir="rtl">
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="text-gray-400 text-xs">
                © 2026 جميع الحقوق محفوظة
              </div>
              
              <div className="h-4 w-px bg-gray-600"></div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <a href="tel:01139395961" className="hover:text-blue-400 transition-colors font-medium">
                  01139395961
                </a>
              </div>
              
              <div className="h-4 w-px bg-gray-600"></div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-300">تصميم وتطوير</span>
                <div className="bg-blue-600 px-3 py-1 rounded-full font-bold text-xs">
                  ZoTech
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer Removed Temporarily */}
    </div>
  );
}
