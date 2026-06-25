import { useEffect, useState } from 'react';
import { Package, Banknote, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, History, Box } from 'lucide-react';
import { getWholesaleCapital, getWholesaleStats, getWholesaleCapitalTransactions, addWholesaleCapitalTransaction } from '../../lib/wholesaleQueries';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export function WholesaleDashboard() {
  const { user } = useAuthStore();
  const [capital, setCapital] = useState(0);
  const [stats, setStats] = useState({ inventoryValue: 0, owedToUs: 0, weOwe: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  const loadData = async () => {
    try {
      const cap = await getWholesaleCapital();
      const st = await getWholesaleStats();
      const trans = await getWholesaleCapitalTransactions();
      setCapital(cap);
      setStats(st);
      setTransactions(trans);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل بيانات الجملة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTransaction = async () => {
    if (!amount || amount <= 0) return toast.error('أدخل مبلغاً صحيحاً');
    if (!description.trim()) return toast.error('أدخل وصفاً للعملية');
    
    try {
      await addWholesaleCapitalTransaction(user!.id, Number(amount), modalType, description);
      toast.success('تم تسجيل العملية بنجاح');
      setShowModal(false);
      setAmount('');
      setDescription('');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء التسجيل');
    }
  };

  if (loading) return <div className="p-6">جاري التحميل...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          رئيسية الجملة
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setModalType('deposit'); setShowModal(true); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <ArrowDownRight className="w-4 h-4" /> إضافة رأس مال
          </button>
          <button 
            onClick={() => { setModalType('withdrawal'); setShowModal(true); }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" /> سحب أرباح / أموال
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Capital */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3 mb-2 opacity-90">
            <Banknote className="w-5 h-5" />
            <h3 className="font-bold">رأس المال النقدي الحالي</h3>
          </div>
          <p className="text-4xl font-black">{capital.toLocaleString()} ج.م</p>
        </div>

        {/* Inventory Value */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Box className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold">قيمة بضاعة المخزن</h3>
          </div>
          <p className="text-2xl font-black">{stats.inventoryValue.toLocaleString()} ج.م</p>
        </div>

        {/* Owed To Us */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold">ديون لنا (عند المحلات)</h3>
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.owedToUs.toLocaleString()} ج.م</p>
        </div>

        {/* We Owe */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <TrendingDown className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold">ديون علينا (للتجار)</h3>
          </div>
          <p className="text-2xl font-black text-rose-600">{stats.weOwe.toLocaleString()} ج.م</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">سجل حركات رأس المال</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-4 font-bold">التاريخ</th>
                <th className="p-4 font-bold">النوع</th>
                <th className="p-4 font-bold">المبلغ</th>
                <th className="p-4 font-bold">الوصف</th>
                <th className="p-4 font-bold">المستخدم</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد حركات مسجلة حتى الآن</td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4">{new Date(t.created_at).toLocaleString('ar-EG')}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                        {t.type === 'deposit' ? 'إيداع' : 'سحب'}
                      </span>
                    </td>
                    <td className="p-4 font-bold font-mono">{t.amount.toLocaleString()} ج.م</td>
                    <td className="p-4">{t.description}</td>
                    <td className="p-4">{t.user_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Deposit / Withdrawal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${modalType === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {modalType === 'deposit' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
              {modalType === 'deposit' ? 'إضافة رأس مال' : 'سحب من رأس المال'}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold mb-2">المبلغ (ج.م)</label>
                <input 
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                  placeholder="أدخل المبلغ..."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">الوصف</label>
                <input 
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="مثال: زيادة رأس المال، سحب أرباح الشهر..."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl hover:bg-muted font-bold">إلغاء</button>
              <button 
                onClick={handleTransaction} 
                className={`px-6 py-2 rounded-xl font-bold text-white ${modalType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
