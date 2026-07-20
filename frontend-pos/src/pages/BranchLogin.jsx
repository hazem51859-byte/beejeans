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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loginMutation.isPending ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
  );
}
