import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { getCurrentShift, openShift, calculateExpectedCash, closeShift, Shift } from '../lib/shiftQueries';
import { 
  Sun, Moon, LayoutDashboard, Smartphone, 
  Wrench, ArrowRightLeft, ShoppingCart, 
  Users, FileText, Settings as SettingsIcon, LogOut, Lock, Unlock, AlertCircle, Coins
} from 'lucide-react';
import { addExpense } from '../lib/expensesQueries';
import { Settings } from '../pages/Settings';
import toast from 'react-hot-toast';

export function MainLayout() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const location = useLocation();

  // Shift States
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [openingCash, setOpeningCash] = useState<number | ''>('');
  const [closingCash, setClosingCash] = useState<number | ''>('');
  const [expectedCash, setExpectedCash] = useState<number>(0);

  // Expense State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseDesc, setExpenseDesc] = useState('');

  useEffect(() => {
    if (user) {
      loadShift();
    }
  }, [user]);

  const loadShift = async () => {
    if (!user) return;
    try {
      const shift = await getCurrentShift(user.id);
      setCurrentShift(shift);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    if (currentShift) {
      toast.error('يجب تقفيل الوردية قبل تسجيل الخروج');
      return;
    }
    logout();
    navigate('/login');
  };

  const handleOpenShift = async () => {
    if (openingCash === '') return toast.error('أدخل رصيد بداية الوردية (الدرج)');
    try {
      await openShift(user!.id, Number(openingCash));
      toast.success('تم فتح الوردية بنجاح');
      setShowOpenShiftModal(false);
      setOpeningCash('');
      loadShift();
    } catch (error: any) {
      toast.error('خطأ: ' + error.message);
    }
  };

  const handlePrepareCloseShift = async () => {
    if (!currentShift) return;
    try {
      const expected = await calculateExpectedCash(currentShift.id, user!.id, currentShift.opening_cash);
      setExpectedCash(expected);
      setShowCloseShiftModal(true);
    } catch (error: any) {
      toast.error('خطأ: ' + error.message);
    }
  };

  const handleCloseShift = async () => {
    if (closingCash === '') return toast.error('أدخل رصيد الدرج الفعلي');
    try {
      await closeShift(currentShift!.id, expectedCash, Number(closingCash));
      toast.success('تم تقفيل الوردية بنجاح');
      setShowCloseShiftModal(false);
      setClosingCash('');
      setCurrentShift(null);
    } catch (error: any) {
      toast.error('خطأ: ' + error.message);
    }
  };

  const handleAddExpense = async () => {
    if (!user) return;
    if (expenseAmount === '' || expenseAmount <= 0) return toast.error('أدخل مبلغ صحيح');
    if (!expenseDesc.trim()) return toast.error('أدخل وصف المصروف');
    if (!currentShift) return toast.error('لا يمكن تسجيل مصروف بدون وردية مفتوحة');
    
    try {
      await addExpense(user.id, Number(expenseAmount), expenseDesc);
      toast.success('تم تسجيل المصروف بنجاح (سيتم خصمه من الدرج)');
      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseDesc('');
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    }
  };

  const navItems = [
    { name: 'الرئيسية', path: '/', icon: LayoutDashboard },
    { name: 'المخزون', path: '/inventory', icon: Smartphone },
    { name: 'الصيانة', path: '/maintenance', icon: Wrench },
    { name: 'الشحن والتحويلات', path: '/transfers', icon: ArrowRightLeft },
    { name: 'الكاشير', path: '/pos', icon: ShoppingCart },
    { name: 'العملاء والديون', path: '/customers', icon: Users },
    { name: 'التقارير', path: '/reports', icon: FileText },
  ];

  return (
    <div dir="rtl" className="flex h-screen bg-background text-foreground overflow-hidden transition-colors duration-300">
      
      {/* Sidebar - Kasher Style */}
      <aside className="w-64 bg-card border-l border-border flex flex-col justify-between shrink-0 z-50 shadow-sm">
        <div className="flex flex-col gap-6 py-6 h-full overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <span className="font-black text-xl text-foreground">كاشير موبايل</span>
          </div>
          
          <nav className="flex flex-col gap-2 w-full px-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm truncate">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 shadow-sm z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black text-foreground">
              {navItems.find(item => item.path === location.pathname)?.name || 'الرئيسية'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="تغيير المظهر"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="الإعدادات"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-border mx-2"></div>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 font-bold transition-colors text-sm"
              title="تسجيل مصروف"
            >
              <Coins className="w-4 h-4" /> مصروف
            </button>
            <div className="flex items-center mx-2 gap-2">
              {currentShift ? (
                <button 
                  onClick={handlePrepareCloseShift}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold transition-colors text-sm"
                >
                  <Lock className="w-4 h-4" /> تقفيل الوردية
                </button>
              ) : (
                <button 
                  onClick={() => setShowOpenShiftModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold transition-colors text-sm"
                >
                  <Unlock className="w-4 h-4" /> فتح وردية
                </button>
              )}
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-destructive/10 text-destructive font-bold transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">خروج</span>
            </button>
          </div>
        </header>
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-secondary/30">
          <Outlet />
        </div>
      </main>

      {/* Modals */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {/* Open Shift Modal */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Unlock className="w-6 h-6 text-primary" /> فتح وردية جديدة
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              يرجى إدخال المبلغ الموجود في درج الكاشير حالياً (الفكة) كبداية للوردية.
            </p>
            <input 
              type="number"
              value={openingCash}
              onChange={e => setOpeningCash(e.target.value ? Number(e.target.value) : '')}
              placeholder="المبلغ بالجنيه"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-lg mb-6"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowOpenShiftModal(false)} className="px-4 py-2 rounded-xl hover:bg-muted font-bold">إلغاء</button>
              <button onClick={handleOpenShift} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold">بدء الوردية</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-600">
              <Lock className="w-6 h-6" /> تقفيل الوردية
            </h3>
            
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl mb-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold mb-1">المبلغ المتوقع في الدرج:</p>
              <p className="text-3xl font-black text-emerald-600">{expectedCash} ج.م</p>
            </div>

            <label className="block text-sm font-bold mb-2">أدخل المبلغ الفعلي الموجود في الدرج:</label>
            <input 
              type="number"
              value={closingCash}
              onChange={e => setClosingCash(e.target.value ? Number(e.target.value) : '')}
              placeholder="المبلغ بالجنيه"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-lg mb-2"
            />
            
            {closingCash !== '' && Number(closingCash) !== expectedCash && (
              <div className="flex items-center gap-2 text-destructive text-sm mb-4 bg-destructive/10 p-3 rounded-lg font-bold">
                <AlertCircle className="w-5 h-5" /> 
                يوجد {Number(closingCash) > expectedCash ? 'زيادة' : 'عجز'} بقيمة {Math.abs(Number(closingCash) - expectedCash)} ج.م
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowCloseShiftModal(false)} className="px-4 py-2 rounded-xl hover:bg-muted font-bold">إلغاء</button>
              <button onClick={handleCloseShift} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">تقفيل واعتماد</button>
            </div>
          </div>
        </div>
      )}
      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600">
              <Coins className="w-6 h-6" /> تسجيل مصروف جديد
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              سيتم خصم هذا المبلغ من الدرج (الوردية الحالية).
            </p>
            <input 
              type="number"
              value={expenseAmount}
              onChange={e => setExpenseAmount(e.target.value ? Number(e.target.value) : '')}
              placeholder="المبلغ (مثال: 50)"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-lg mb-4"
            />
            <input 
              type="text"
              value={expenseDesc}
              onChange={e => setExpenseDesc(e.target.value)}
              placeholder="وصف المصروف (مثال: بوفيه، كهرباء...)"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold mb-6"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowExpenseModal(false)} className="px-4 py-2 rounded-xl hover:bg-muted font-bold">إلغاء</button>
              <button onClick={handleAddExpense} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-colors">حفظ المصروف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
