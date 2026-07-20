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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-4">
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
  );
}
