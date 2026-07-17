import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { loginUser } from '../lib/usersQueries';
import toast from 'react-hot-toast';
import { LogIn, User, Lock, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUser(username, password);
      if (user) {
        login(user);
        toast.success(`أهلاً بك، ${user.username}!`);
        navigate('/');
      } else {
        toast.error('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-inner">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-2 shadow-sm">SmartStore</h1>
          <p className="text-blue-100 font-medium text-sm">نظام إدارة المحلات ونقاط البيع</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-slate-900 dark:text-white"
                  placeholder="admin"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                رمز الدخول (PIN / Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-slate-900 dark:text-white tracking-widest"
                  placeholder="••••"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-t border-blue-400/30 py-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-lg active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-4"
          >
            {loading ? (
              <span className="animate-pulse">جاري الدخول...</span>
            ) : (
              <>
                <LogIn size={20} /> تسجيل الدخول
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 text-slate-500 text-sm font-medium">
        © {new Date().getFullYear()} SmartStore. جميع الحقوق محفوظة.
      </p>
    </div>
  );
}
