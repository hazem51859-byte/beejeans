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
  DollarSign
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      logout();
      navigate('/login');
      toast.success('تم تسجيل الخروج بنجاح');
    } catch (error) {
      logout();
      navigate('/login');
    }
  };

  const navigation = [
    { name: 'الرئيسية', path: '/', icon: LayoutDashboard },
    { name: 'نقطة البيع', path: '/pos', icon: ShoppingCart },
    { name: 'المنتجات', path: '/products', icon: Package },
    { name: 'المخزون', path: '/inventory', icon: Warehouse },
    { name: 'التقارير', path: '/reports', icon: BarChart3 },
    { name: 'الإعدادات', path: '/settings', icon: Settings },
  ];

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
              <h1 className="text-xl font-bold text-gray-800">Bee 🐝 JEANS</h1>
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
        {/* Sidebar */}
        <aside className="w-64 bg-white border-l shadow-sm">
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
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

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-8"
            >
              <LogOut size={20} />
              <span className="font-medium">تسجيل الخروج</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
