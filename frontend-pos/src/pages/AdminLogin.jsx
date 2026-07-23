import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { LogIn, Lock, User } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { setAuth, user } = useAuthStore();
  
  console.log('👔 === ADMIN LOGIN COMPONENT LOADED ===');
  console.log('Pathname:', window.location.pathname);
  console.log('Current user:', user?.username || 'none');
  console.log('=======================================');
  
  // إذا كان المستخدم admin مسجل دخول بالفعل، انقله للداشبورد
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data.data;
      
      // التحقق من أن المستخدم admin
      if (user.role !== 'ADMIN') {
        toast.error('هذه الصفحة مخصصة للمسؤول فقط');
        return;
      }
      
      setAuth(user, accessToken, refreshToken);
      toast.success(`مرحباً ${user.fullName}`);
      navigate('/');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'فشل تسجيل الدخول');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate(credentials);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="card max-w-md w-full">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/BISO.jpg" 
              alt="BISO Logo" 
              className="h-32 w-auto object-contain"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Biso & Gilan & Layan
            </h1>
            <p className="text-gray-600">لوحة تحكم المسؤول</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="input-field pr-10"
                  placeholder="admin"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loginMutation.isPending ? (
                'جاري تسجيل الدخول...'
              ) : (
                <>
                  <LogIn size={20} />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>
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
