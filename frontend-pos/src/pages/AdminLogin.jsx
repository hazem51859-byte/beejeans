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
            <svg className="w-3.5 h-3.5 text-emerald-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <a href="tel:01139395961" className="hover:text-emerald-300 transition-colors font-semibold">
              01139395961
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
