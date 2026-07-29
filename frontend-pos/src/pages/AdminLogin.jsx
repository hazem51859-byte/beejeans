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
      // Clear password field for security
      setCredentials(prev => ({ ...prev, password: '' }));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate(credentials);
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))] flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl p-8 max-w-md w-full relative overflow-hidden">
          {/* Top Decorative Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-600/30 rounded-full blur-3xl pointer-events-none"></div>

          {/* Logo */}
          <div className="flex justify-center mb-6 relative z-10">
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
              <img 
                src="/BISO.jpg" 
                alt="BISO Logo" 
                className="h-28 w-auto object-contain rounded-xl"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          </div>
          
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
              Biso & Gilan & Layan
            </h1>
            <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              لوحة تحكم المسؤول الإداري
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                اسم المستخدم
              </label>
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
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder:text-slate-500 outline-none transition-all pr-11 text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full py-3 text-base shadow-lg shadow-emerald-600/40 disabled:opacity-50 mt-2"
            >
              {loginMutation.isPending ? (
                'جاري تسجيل الدخول...'
              ) : (
                <>
                  <LogIn size={20} />
                  <span>تسجيل الدخول للنظام</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* Fixed Footer - ZoTech - Full Width for Login Pages */}
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
