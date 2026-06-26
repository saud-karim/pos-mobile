import { useState, useEffect } from 'react';
import { TrendingUp, FileText, Download, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getReportsStats, getRecentInvoices } from '../lib/reportsQueries';
import { getCurrentShift, openShift, closeShift, calculateExpectedCash, Shift } from '../lib/shiftQueries';
import { returnInvoice } from '../lib/posQueries';
import { useAuthStore } from '../store/authStore';
import { exportToExcel } from '../lib/exportUtils';
import toast from 'react-hot-toast';

export function Reports() {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState('profits');
  const [stats, setStats] = useState({ sales: 0, maintenance: 0, transfers: 0 });
  const [invoices, setInvoices] = useState<any[]>([]);

  // Shifts State
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [openingCashInput, setOpeningCashInput] = useState<number | ''>('');
  const [closingCashInput, setClosingCashInput] = useState<number | ''>('');
  const [expectedCash, setExpectedCash] = useState<number>(0);

  useEffect(() => {
    loadStats();
    loadActiveShift();
    if (activeTab === 'invoices') {
      loadInvoices();
    }
  }, [activeTab]);

  const loadInvoices = async () => {
    try {
      const data = await getRecentInvoices(50);
      setInvoices(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadActiveShift = async () => {
    try {
      if (!user) return;
      const shift = await getCurrentShift(user.id);
      setActiveShift(shift);
      if (shift && shift.opened_at) {
        const expected = await calculateExpectedCash(shift.id!, user.id, shift.opening_cash);
        setExpectedCash(expected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenShift = async () => {
    if (!user) return toast.error('يرجى تسجيل الدخول');
    if (openingCashInput === '') return toast.error('أدخل مبلغ العهدة الافتتاحية');
    try {
      await openShift(user.id, Number(openingCashInput));
      toast.success('تم فتح الوردية بنجاح');
      loadActiveShift();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    if (closingCashInput === '') return toast.error('أدخل النقدية الفعلية في الدرج');
    try {
      await closeShift(activeShift.id!, Number(closingCashInput), expectedCash);
      toast.success('تم إغلاق الوردية بنجاح');
      setActiveShift(null);
      setClosingCashInput('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getReportsStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReturnInvoice = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من إرجاع هذه الفاتورة بالكامل؟ سيتم استرجاع الكميات للمخزن وحذف الفاتورة.')) return;
    try {
      await returnInvoice(id);
      toast.success('تم إرجاع الفاتورة بنجاح');
      loadInvoices();
      loadStats();
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  const handleExport = () => {
    if (activeTab === 'invoices') {
      if (invoices.length === 0) return toast.error('لا يوجد فواتير لتصديرها');
      const exportData = invoices.map(i => ({
        'رقم الفاتورة': i.id,
        'الوقت': new Date(i.created_at).toLocaleString('ar-EG'),
        'الإجمالي (ج.م)': i.total_amount,
        'الخصم (ج.م)': i.discount,
        'الصافي (ج.م)': i.total_amount - i.discount,
        'المدفوع (ج.م)': i.paid_amount,
        'طريقة الدفع': i.payment_method === 'cash' ? 'كاش' : 'فيزا',
        'الكاشير': i.cashier_name
      }));
      exportToExcel(exportData, 'تقرير_الفواتير');
      toast.success('تم تصدير الفواتير بنجاح');
    } else {
      toast.error('قم باختيار تبويب الفواتير أولاً لتصديرها');
    }
  };

  const chartData = [
    { name: 'السبت', مبيعات: 4000, صيانة: 2400 },
    { name: 'الأحد', مبيعات: 3000, صيانة: 1398 },
    { name: 'الإثنين', مبيعات: 2000, صيانة: 9800 },
    { name: 'الثلاثاء', مبيعات: 2780, صيانة: 3908 },
    { name: 'الأربعاء', مبيعات: 1890, صيانة: 4800 },
    { name: 'الخميس', مبيعات: 2390, صيانة: 3800 },
    { name: 'الجمعة', مبيعات: stats.sales, صيانة: stats.maintenance },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">التقارير والأرباح</h2>
        <button 
          onClick={handleExport}
          className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-bold shadow-sm"
        >
          <Download className="w-5 h-5" />
          <span>تصدير Excel</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button 
          onClick={() => setActiveTab('profits')}
          className={`pb-3 px-2 font-bold flex items-center gap-2 transition-colors ${activeTab === 'profits' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <TrendingUp className="w-4 h-4" /> الأرباح والمبيعات
        </button>
        <button 
          onClick={() => setActiveTab('shifts')}
          className={`pb-3 px-2 font-bold flex items-center gap-2 transition-colors ${activeTab === 'shifts' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <FileText className="w-4 h-4" /> الورديات (حركة الدرج)
        </button>
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-2 font-bold flex items-center gap-2 transition-colors ${activeTab === 'invoices' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <FileText className="w-4 h-4" /> الفواتير والمرتجعات
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm min-h-[500px]">
        {activeTab === 'profits' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-muted/30 rounded-2xl border border-border text-center">
                <p className="text-muted-foreground mb-2 font-medium">إجمالي مبيعات اليوم</p>
                <p className="text-4xl font-black text-primary">{stats.sales} ج.م</p>
              </div>
              <div className="p-6 bg-muted/30 rounded-2xl border border-border text-center">
                <p className="text-muted-foreground mb-2 font-medium">صافي أرباح الصيانة</p>
                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{stats.maintenance} ج.م</p>
              </div>
              <div className="p-6 bg-muted/30 rounded-2xl border border-border text-center">
                <p className="text-muted-foreground mb-2 font-medium">عمولات الشحن والتحويلات</p>
                <p className="text-4xl font-black text-purple-600 dark:text-purple-400">{stats.transfers} ج.م</p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--foreground)" opacity={0.5} />
                  <YAxis stroke="var(--foreground)" opacity={0.5} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Area type="monotone" dataKey="مبيعات" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="صيانة" stroke="#10b981" fillOpacity={1} fill="url(#colorMain)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'shifts' && (
          <div className="max-w-2xl mx-auto py-8">
            {!activeShift ? (
              <div className="bg-muted/20 p-8 rounded-3xl border border-border text-center">
                <Unlock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-black mb-2 text-foreground">لا توجد وردية مفتوحة</h3>
                <p className="text-muted-foreground mb-8">يجب فتح وردية جديدة لبدء تسجيل المبيعات وحركة الدرج.</p>
                
                <div className="max-w-xs mx-auto text-right">
                  <label className="block text-sm font-bold mb-2">العهدة الافتتاحية (النقدية الموجودة بالدرج حالياً)</label>
                  <input 
                    type="number" 
                    value={openingCashInput}
                    onChange={e => setOpeningCashInput(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl mb-4 focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                    placeholder="مثال: 500 ج.م"
                  />
                  <button onClick={handleOpenShift} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-t border-blue-400/30 py-3 rounded-xl font-bold transition-all active:scale-95">
                    فتح الوردية
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/20 p-8 rounded-3xl border border-border">
                <div className="flex items-center gap-4 mb-6 border-b border-border pb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-foreground">الوردية الحالية مفتوحة</h3>
                    <p className="text-muted-foreground text-sm font-medium">بدأت في: {new Date(activeShift.opened_at!).toLocaleString('ar-EG')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8 text-center">
                  <div className="p-6 bg-background rounded-2xl border border-border shadow-sm">
                    <p className="text-muted-foreground font-medium mb-2">العهدة الافتتاحية</p>
                    <p className="text-3xl font-black">{activeShift.opening_cash} ج.م</p>
                  </div>
                  <div className="p-6 bg-background rounded-2xl border border-border shadow-sm">
                    <p className="text-muted-foreground font-medium mb-2">إجمالي المتوقع في الدرج</p>
                    <p className="text-3xl font-black text-primary">{expectedCash} ج.م</p>
                  </div>
                </div>

                <div className="border-t border-border pt-8">
                  <h4 className="font-black mb-4 text-destructive flex items-center gap-2 text-lg">
                    <AlertTriangle className="w-6 h-6" /> إغلاق الوردية (تسليم الدرج)
                  </h4>
                  <label className="block text-sm font-bold mb-2">قم بعد النقدية الفعلية في الدرج الآن وأدخلها هنا:</label>
                  <input 
                    type="number" 
                    value={closingCashInput}
                    onChange={e => setClosingCashInput(Number(e.target.value))}
                    className="w-full px-4 py-4 bg-background border border-border rounded-xl mb-4 focus:ring-2 focus:ring-destructive outline-none transition-all text-lg font-black"
                    placeholder="المبلغ الفعلي الموجود..."
                  />
                  
                  {closingCashInput !== '' && (
                    <div className={`p-4 rounded-xl mb-6 font-bold text-center ${Number(closingCashInput) === expectedCash ? 'bg-emerald-500/10 text-emerald-600' : Number(closingCashInput) < expectedCash ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-600'}`}>
                      {Number(closingCashInput) === expectedCash && 'الدرج مظبوط! لا يوجد عجز أو زيادة.'}
                      {Number(closingCashInput) < expectedCash && `هناك عجز بقيمة: ${expectedCash - Number(closingCashInput)} ج.م`}
                      {Number(closingCashInput) > expectedCash && `هناك زيادة بقيمة: ${Number(closingCashInput) - expectedCash} ج.م`}
                    </div>
                  )}

                  <button onClick={handleCloseShift} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground py-4 rounded-xl font-black transition-colors shadow-md text-lg">
                    إنهاء وإغلاق الوردية
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-4 px-4 font-medium">رقم الفاتورة</th>
                  <th className="py-4 px-4 font-medium">الوقت</th>
                  <th className="py-4 px-4 font-medium">الإجمالي</th>
                  <th className="py-4 px-4 font-medium">الخصم</th>
                  <th className="py-4 px-4 font-medium">الكاشير</th>
                  <th className="py-4 px-4 font-medium text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد فواتير</td></tr>}
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4 font-black">#{inv.id}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">{new Date(inv.created_at).toLocaleString('ar-EG')}</td>
                    <td className="py-4 px-4 font-bold text-primary">{inv.total_amount} ج.م</td>
                    <td className="py-4 px-4 text-destructive">{inv.discount > 0 ? `-${inv.discount}` : '0'} ج.م</td>
                    <td className="py-4 px-4 text-sm">{inv.cashier_name}</td>
                    <td className="py-4 px-4 text-center">
                      <button 
                        onClick={() => handleReturnInvoice(inv.id)}
                        className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                      >
                        إرجاع الفاتورة
                      </button>
                    </td>
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
