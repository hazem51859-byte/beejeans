import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { LogIn, Lock, User } from 'lucide-react';
import { authAPI } from '../services/api';
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
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/branches`);
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
      // استخدام axios مباشرة بدون interceptor
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/branches`);
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
      // Don't navigate away on error - stay on the same page
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <div className="flex justify-center mb-6">
              <img 
                src="/bee.jpg" 
                alt="Bee Logo" 
                className="h-24 w-auto object-contain"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
            
            <div className="text-center mb-8">
              <div className="bg-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="text-white" size={32} />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">Bee 🐝 JEANS</h1>
              <h2 className="text-xl font-semibold text-primary-600 mb-2">تسجيل دخول الفرع</h2>
              <p className="text-gray-600">اختر الفرع للمتابعة</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اختر الفرع</label>
                <select
                  value={selectedBranchCode}
                  onChange={(e) => setSelectedBranchCode(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">-- اختر الفرع --</option>
                  {allBranchesData.map((branch) => (
                    <option key={branch.id} value={branch.url}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        
      {/* Fixed Footer - ZoTech - Full Width for Login Pages */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 px-6 shadow-lg border-t border-gray-700" dir="rtl">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="card max-w-md w-full">
          {/* Admin Warning */}
          {user && user.role === 'ADMIN' && (
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600 flex-shrink-0">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900 mb-1">أنت مسجل دخول كمسؤول</h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    لا يمكنك تسجيل الدخول كموظف فرع وأنت مسجل كمسؤول. الرجاء تسجيل الخروج أولاً.
                  </p>
                  <button
                    onClick={() => {
                      logout();
                      toast.success('تم تسجيل الخروج');
                    }}
                    className="btn-secondary text-sm"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            </div>
          )}
        
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/bee.jpg" 
              alt="Bee Logo" 
              className="h-24 w-auto object-contain"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
          
          <div className="text-center mb-8">
            <div className="bg-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Bee 🐝 JEANS</h1>
            <h2 className="text-xl font-semibold text-primary-600 mb-2">{branchData.name}</h2>
            <p className="text-gray-600">سجل دخولك للمتابعة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" style={{ opacity: user?.role === 'ADMIN' ? 0.5 : 1, pointerEvents: user?.role === 'ADMIN' ? 'none' : 'auto' }}>
            <div>
              <label className="block text-sm font-medium mb-2">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="input-field pr-10"
                  placeholder="ادخل اسم المستخدم"
                  required
                  autoFocus
                  disabled={user?.role === 'ADMIN'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 text-gray-400" size={20} />
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="input-field pr-10"
                  placeholder="ادخل كلمة المرور"
                  required
                  disabled={user?.role === 'ADMIN'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending || user?.role === 'ADMIN'}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loginMutation.isPending ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
      
      {/* Fixed Footer - ZoTech */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 px-6 shadow-lg border-t border-gray-700" dir="rtl">
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
    </div>
  );
}
