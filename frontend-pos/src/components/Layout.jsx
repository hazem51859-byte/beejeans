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

import { useQuery } from '@tanstack/react-query';
import { transferAPI } from '../services/api';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Fetch pending transfers count for notification badge
  const { data: pendingCountResponse } = useQuery({
    queryKey: ['pending-transfers-count'],
    queryFn: async () => {
      const res = await transferAPI.getPendingCount();
      return res.data;
    },
    refetchInterval: 15000, // Refresh every 15 seconds
    enabled: !!user,
  });

  const pendingCount = pendingCountResponse?.count || 0;

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
    { name: 'التوريدات', path: '/transfers', icon: Truck, roles: ['ADMIN', 'MANAGER', 'CASHIER'], badge: pendingCount },
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
    <div className="h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm z-30 relative min-h-[74px] flex items-center px-6 py-3">
        <div className="w-full flex items-center justify-between relative">
          {/* Right side (over sidebar in RTL): Dollar Icon + Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/25 ring-2 ring-emerald-100">
              <DollarSign className="text-white" size={22} />
            </div>
            <div className="flex items-center gap-2 bg-slate-100/80 px-3.5 py-1.5 rounded-xl border border-slate-200/60">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-600">نظام نقاط البيع</span>
            </div>
          </div>

          {/* Center: Main Brand & Branch Title (Prominent & Clean) */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/90 px-8 py-2.5 rounded-2xl border border-emerald-300/40 shadow-md shadow-emerald-500/10 ring-4 ring-emerald-500/5">
            <div className="text-center">
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
                {user?.role === 'ADMIN' ? 'Biso & Gilan & Layan' : 'Bee 🐝 JEANS'}
              </h1>
              <p className="text-xs font-extrabold text-emerald-700 mt-0.5 tracking-wide">
                {user?.branch?.name || (user?.role === 'ADMIN' ? 'المصنع الرئيسي' : 'نظام نقاط البيع الاحترافي')}
              </p>
            </div>
          </div>

          {/* Left side: User Profile */}
          <div className="flex items-center gap-3.5">
            <div className="text-left">
              <p className="font-bold text-slate-900 text-sm">{user?.fullName}</p>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {user?.role === 'ADMIN' ? 'مدير عام' : user?.role === 'MANAGER' ? 'مدير فرع' : 'كاشير'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-slate-100 border border-emerald-200/60 flex items-center justify-center shadow-sm">
              <User className="text-emerald-600" size={20} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Dark Luxury Sidebar with Scroll */}
        <aside className="w-64 bg-slate-900 text-slate-300 border-l border-slate-800 shadow-xl flex flex-col z-20">
          {/* Scrollable Navigation */}
          <nav className="p-3.5 space-y-1.5 overflow-y-auto flex-1 custom-sidebar-scroll">
            {filteredNavigation.map((item) => {
              // Header items (non-clickable section titles)
              if (item.isHeader) {
                return (
                  <div key={item.path} className="px-3 pt-4 pb-1 text-[11px] font-extrabold text-emerald-400/90 uppercase tracking-wider flex items-center gap-2">
                    <span className="h-px bg-emerald-500/20 flex-1"></span>
                    <span>{item.name.replace(/---/g, '').trim()}</span>
                    <span className="h-px bg-emerald-500/20 flex-1"></span>
                  </div>
                );
              }

              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                    active
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 hover:translate-x-[-2px]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {Icon && (
                      <Icon 
                        size={19} 
                        className={`transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} 
                      />
                    )}
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse shadow-sm shadow-rose-500/50">
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <span className="w-1.5 h-4 bg-white/90 rounded-full shadow-sm"></span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
          
          {/* Fixed Logout Button at Bottom */}
          <div className="p-3.5 border-t border-slate-800 bg-slate-900/95">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-all text-sm font-semibold group"
            >
              <LogOut size={19} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-slate-50/60 relative">
          <div className="p-6 pb-20 max-w-7xl mx-auto">
            <Outlet />
          </div>
          
          {/* Fixed Footer - ZoTech */}
          <div className="fixed bottom-0 right-64 left-0 bg-slate-900/95 backdrop-blur-md text-white py-2.5 px-6 shadow-2xl border-t border-slate-800 z-40" dir="rtl">
            <div className="flex items-center justify-center gap-8 text-xs">
              <div className="text-slate-400 font-medium">
                © 2026 جميع الحقوق محفوظة
              </div>
              
              <div className="h-3.5 w-px bg-slate-700"></div>
              
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-emerald-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <a href="tel:01139395961" className="hover:text-emerald-300 transition-colors font-semibold tracking-wide">
                  01139395961
                </a>
              </div>
              
              <div className="h-3.5 w-px bg-slate-700"></div>
              
              <div className="flex items-center gap-2">
                <span className="text-slate-400">تصميم وتطوير</span>
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-0.5 rounded-full font-bold text-[11px] shadow-sm shadow-emerald-500/30 tracking-wide text-white">
                  ZoTech
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
