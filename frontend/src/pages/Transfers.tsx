import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Phone, Plus, History } from 'lucide-react';
import { addTransfer, getTransfers, getTodayCommissions, Transfer } from '../lib/transfersQueries';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function Transfers() {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState('new_transfer');
  
  // State
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [todayCommission, setTodayCommission] = useState(0);
  
  // Form State
  const [type, setType] = useState('إيداع');
  const [service, setService] = useState('فودافون كاش');
  const [commission, setCommission] = useState<number | ''>(10);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      const comm = await getTodayCommissions();
      setTodayCommission(comm);
      if (activeTab === 'history') {
        const h = await getTransfers();
        setTransfers(h);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('خطأ في جلب البيانات: ' + (err.message || String(err)));
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول');
      return;
    }
    if (commission === '') {
      toast.error('يرجى تعبئة حقل العمولة');
      return;
    }

    try {
      await addTransfer({
        user_id: user.id,
        type: `${type} ${service}`,
        commission: Number(commission)
      });
      toast.success('تم تسجيل العمولة بنجاح');
      setCommission(10);
      loadData();
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">الشحن وتحويل الأموال (العمولات)</h2>
        <div className="text-lg font-bold text-slate-600 dark:text-slate-300">
          إجمالي عمولات اليوم: <span className="text-green-600">{todayCommission} ج.م</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--border)]">
        <button 
          onClick={() => setActiveTab('new_transfer')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'new_transfer' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
        >
          <Plus className="w-4 h-4" /> تسجيل عمولة جديدة
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
        >
          <History className="w-4 h-4" /> سجل العمولات
        </button>
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 shadow-sm min-h-[500px]">
        {activeTab === 'new_transfer' && (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => setType('إيداع')} className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${type === 'إيداع' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-transparent hover:border-[var(--border)] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <ArrowUpRight className="w-8 h-8 mb-2" />
                <span className="font-bold">إيداع (تحويل لعميل)</span>
              </button>
              <button onClick={() => setType('سحب')} className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${type === 'سحب' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-transparent hover:border-[var(--border)] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <ArrowDownLeft className="w-8 h-8 mb-2" />
                <span className="font-bold">سحب (استلام من عميل)</span>
              </button>
              <button onClick={() => setType('رصيد')} className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${type === 'رصيد' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-transparent hover:border-[var(--border)] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                <Phone className="w-8 h-8 mb-2" />
                <span className="font-bold">كروت شحن ورصيد</span>
              </button>
            </div>

            {/* Form */}
            <div className="space-y-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-[var(--border)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">الخدمة / الشبكة</label>
                  <select value={service} onChange={e => setService(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-blue-500 outline-none">
                    <option>فودافون كاش</option>
                    <option>اتصالات كاش</option>
                    <option>أورانج كاش</option>
                    <option>وي باي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">عمولة المحل (الربح)</label>
                  <input type="number" value={commission} onChange={e => setCommission(Number(e.target.value))} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-blue-500 outline-none" placeholder="العمولة" />
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border)] flex items-center justify-end">
                <button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors">
                  تأكيد العمولة
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-[var(--border)] text-slate-500">
                  <th className="py-3 px-4 font-medium">الوقت</th>
                  <th className="py-3 px-4 font-medium">الخدمة</th>
                  <th className="py-3 px-4 font-medium">العمولة</th>
                  <th className="py-3 px-4 font-medium">الكاشير</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-500">لا يوجد عمليات بعد</td></tr>}
                {transfers.map(t => (
                  <tr key={t.id} className="border-b border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 text-sm">{new Date(t.created_at!).toLocaleTimeString('ar-EG')}</td>
                    <td className="py-3 px-4"><span className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 px-2 py-1 rounded text-xs">{t.type}</span></td>
                    <td className="py-3 px-4 text-green-600 font-bold">+{t.commission} ج.م</td>
                    <td className="py-3 px-4 text-sm text-slate-500">{t.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
