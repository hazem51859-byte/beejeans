import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { LogIn, Lock, User } from 'lucide-react';
import { authAPI, branchAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

export default function BranchLogin() {
  const navigate = useNavigate();
  const { branchCode } = useParams();
  const { setAuth, user, logout } = useAuthStore();
  const [selectedBranchCode, setSelectedBranchCode] = useState(branchCode || '');
  
  console.log('🐝 === BRANCH LOGIN COMPONENT LOADED ===');
  console.log('Branch Code from URL:', branchCode);
  console.log('Full pathname:', window.location.pathname);
  console.log('Current user:', user?.username || 'none');
  console.log('=========================================');
  
  // إذا كان المستخدم مسجل دخول بالفعل لهذا الفرع، انقله للداشبورد
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.branch?.url === branchCode) {
      navigate('/', { replace: true });
    }
    
    // إذا كان Admin مسجل دخول، اعرض رسالة تنبيه
    if (user && user.role === 'ADMIN' && branchCode) {
      toast.error('لا يمكن للمسؤول تسجيل الدخول من صفحة الفرع. الرجاء عمل Logout أولاً أو فتح اللينك في نافذة خاصة.', {
        duration: 5000
      });
    }
  }, [user, branchCode, navigate]);
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  // جلب كل الفروع (إذا لم يكن هناك branch code في URL) - exclude main warehouse
  const { data: allBranchesData } = useQuery({
    queryKey: ['all-branches'],
    queryFn: async () => {
      const response = await branchAPI.getAll();
      const branches = response.data.data?.data || response.data.data || [];
      // Filter out main warehouse (code === 'MAIN')
      return branches.filter(b => b.code !== 'MAIN');
    },
    enabled: !branchCode,
  });

  // جلب معلومات الفرع (بدون authentication) إذا كان هناك branch code
  const { data: branchData, isLoading, error } = useQuery({
    queryKey: ['branch', branchCode || selectedBranchCode],
    queryFn: async () => {
      const response = await branchAPI.getAll();
      console.log('Branches API Response:', response.data);
      
      // البحث في المكان الصحيح
      const branches = response.data.data?.data || response.data.data || [];
      console.log('Branches array:', branches);
      
      const code = branchCode || selectedBranchCode;
      const branch = branches.find(b => b.url === code);
      console.log('Found branch:', branch);
      
      if (!branch) {
        throw new Error('الفرع غير موجود');
      }
      return branch;
    },
    enabled: !!(branchCode || selectedBranchCode),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data.data;
      
      const code = branchCode || selectedBranchCode;
      
      // التحقق من أن المستخدم ليس Admin
      if (user.role === 'ADMIN') {
        toast.error('المسؤول يجب عليه الدخول من صفحة المسؤول');
        logout();
        return;
      }
      
      // التحقق من أن المستخدم ينتمي لهذا الفرع
      if (user.branch?.url !== code) {
        toast.error('هذا المستخدم لا ينتمي لهذا الفرع');
        logout();
        return;
      }
      
      setAuth(user, accessToken, refreshToken);
      toast.success(`مرحباً ${user.fullName}`);
      navigate('/');
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'فشل تسجيل الدخول';
      toast.error(errorMsg);
      // Stay on the login page - don't navigate away or reset state
      // Just clear the password field for security
      setCredentials(prev => ({ ...prev, password: '' }));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate(credentials);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error || (!branchData && !allBranchesData)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="card max-w-md w-full text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="text-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">الفرع غير موجود</h1>
          <p className="text-gray-600 mb-4">الرجاء التحقق من الرابط والمحاولة مرة أخرى</p>
          <p className="text-sm text-gray-500 mb-2">URL المطلوب: /branch/{branchCode}</p>
          <p className="text-xs text-gray-400 mb-6">Error: {error?.message || 'Branch not found'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // If no branch code in URL, show branch selector
  if (!branchCode && !selectedBranchCode && allBranchesData) {
    return (
      <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))] flex flex-col justify-between">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl p-8 max-w-md w-full relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/30 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex justify-center mb-6 relative z-10">
              <div className="p-2 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
                <img 
                  src="/bee.jpg" 
                  alt="Bee Logo" 
                  className="h-20 w-auto object-contain rounded-xl"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            </div>
            
            <div className="text-center mb-8 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/20">
                <LogIn className="text-white" size={28} />
              </div>
              <h1 className="text-2xl font-extrabold text-white mb-1 tracking-tight">Bee 🐝 JEANS</h1>
              <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                اختيار الفرع والمتابعة
              </span>
            </div>

            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">اختر الفرع</label>
                <select
                  value={selectedBranchCode}
                  onChange={(e) => setSelectedBranchCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white outline-none transition-all text-sm font-medium"
                  required
                >
                  <option value="" className="bg-slate-900 text-slate-400">-- اختر الفرع --</option>
                  {allBranchesData.map((branch) => (
                    <option key={branch.id} value={branch.url} className="bg-slate-900 text-white">
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fixed Footer - ZoTech */}
        <div className="bg-slate-900/90 backdrop-blur-md text-white py-3 px-6 border-t border-slate-800" dir="rtl">
          <div className="flex items-center justify-center gap-8 text-xs">
            <div className="text-slate-400 font-medium">
              © 2026 جميع الحقوق محفوظة
            </div>
            
            <div className="h-3.5 w-px bg-slate-700"></div>
            
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-pink-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <a href="https://instagram.com/zo__tech" target="_blank" rel="noopener noreferrer" className="hover:text-pink-300 transition-colors font-semibold">
                @zo__tech
              </a>
            </div>
            
            <div className="h-3.5 w-px bg-slate-700"></div>
            
            <div className="flex items-center gap-2">
              <span className="text-slate-400">تصميم وتطوير</span>
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-0.5 rounded-full font-bold text-[11px] text-white shadow-sm shadow-emerald-500/30">
                ZoTech
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))] flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl p-8 max-w-md w-full relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/30 rounded-full blur-3xl pointer-events-none"></div>

          {/* Admin Warning */}
          {user && user.role === 'ADMIN' && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="text-amber-400 flex-shrink-0 text-lg">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-300 mb-1 text-sm">أنت مسجل دخول كمسؤول</h3>
                  <p className="text-xs text-amber-200/80 mb-3">
                    لا يمكنك تسجيل الدخول كموظف فرع وأنت مسجل كمسؤول. الرجاء تسجيل الخروج أولاً.
                  </p>
                  <button
                    onClick={() => {
                      logout();
                      toast.success('تم تسجيل الخروج');
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/30"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            </div>
          )}
        
          {/* Logo */}
          <div className="flex justify-center mb-6 relative z-10">
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
              <img 
                src="/bee.jpg" 
                alt="Bee Logo" 
                className="h-20 w-auto object-contain rounded-xl"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          </div>
          
          <div className="text-center mb-8 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/20">
              <LogIn className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-1 tracking-tight">Bee 🐝 JEANS</h1>
            <h2 className="text-base font-bold text-emerald-400 mb-1">{branchData.name}</h2>
            <p className="text-xs font-medium text-slate-400">سجل دخولك لمتابعة أعمال الفرع</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10" style={{ opacity: user?.role === 'ADMIN' ? 0.5 : 1, pointerEvents: user?.role === 'ADMIN' ? 'none' : 'auto' }}>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder:text-slate-500 outline-none transition-all pr-11 text-sm font-medium"
                  placeholder="ادخل اسم المستخدم"
                  required
                  autoFocus
                  disabled={user?.role === 'ADMIN'}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder:text-slate-500 outline-none transition-all pr-11 text-sm font-medium"
                  placeholder="ادخل كلمة المرور"
                  required
                  disabled={user?.role === 'ADMIN'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending || user?.role === 'ADMIN'}
              className="w-full btn-primary py-3 text-base shadow-lg shadow-emerald-600/40 disabled:opacity-50 mt-2"
            >
              {loginMutation.isPending ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
      
      {/* Fixed Footer - ZoTech */}
      <div className="bg-slate-900/90 backdrop-blur-md text-white py-3 px-6 border-t border-slate-800" dir="rtl">
        <div className="flex items-center justify-center gap-8 text-xs">
          <div className="text-slate-400 font-medium">
            © 2026 جميع الحقوق محفوظة
          </div>
          
          <div className="h-3.5 w-px bg-slate-700"></div>
          
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-pink-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <a href="https://instagram.com/zo__tech" target="_blank" rel="noopener noreferrer" className="hover:text-pink-300 transition-colors font-semibold">
              @zo__tech
            </a>
          </div>
          
          <div className="h-3.5 w-px bg-slate-700"></div>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-400">تصميم وتطوير</span>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-0.5 rounded-full font-bold text-[11px] text-white shadow-sm shadow-emerald-500/30">
              ZoTech
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
