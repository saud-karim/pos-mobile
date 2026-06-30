import { useState, useEffect } from 'react';
import { TrendingUp, FileText, Download, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getReportsStats, getRecentInvoices } from '../lib/reportsQueries';
import { getTodayExpenses, Expense } from '../lib/expensesQueries';
import { Shift, getShiftsHistory, getShiftTransactions } from '../lib/shiftQueries';
import { returnInvoice, getInvoiceItems, returnInvoiceItem } from '../lib/posQueries';
import { useAuthStore } from '../store/authStore';
import { exportToExcel } from '../lib/exportUtils';
import toast from 'react-hot-toast';

export function Reports() {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState('profits');
  const [stats, setStats] = useState({ sales: 0, maintenance: 0, transfers: 0 });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [shiftsHistory, setShiftsHistory] = useState<(Shift & { user_name: string })[]>([]);
  const [selectedShiftDetails, setSelectedShiftDetails] = useState<any>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  
  // Partial Return States
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    loadStats();

    if (activeTab === 'invoices') {
      loadInvoices();
    }
    if (activeTab === 'shifts') {
      loadShiftsHistoryData();
    }
    if (activeTab === 'expenses') {
      loadExpensesData();
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

  const loadExpensesData = async () => {
    try {
      const data = await getTodayExpenses(); // get all expenses
      setExpensesList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadShiftsHistoryData = async () => {
    try {
      const data = await getShiftsHistory();
      setShiftsHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewShift = async (shift: any) => {
    try {
      const details = await getShiftTransactions(shift.user_id, shift.opened_at, shift.closed_at);
      setSelectedShiftDetails({ shift, ...details });
      setIsShiftModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء جلب تفاصيل الوردية');
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
      await returnInvoice(id, user!.id);
      toast.success('تم إرجاع الفاتورة بنجاح');
      loadInvoices();
      loadStats();
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  const handleOpenInvoiceDetails = async (invoice: any) => {
    try {
      const items = await getInvoiceItems(invoice.id);
      setInvoiceItems(items);
      setSelectedInvoice(invoice);
      setReturnQuantities({});
      setIsInvoiceModalOpen(true);
    } catch (err: any) {
      toast.error('حدث خطأ في تحميل تفاصيل الفاتورة');
    }
  };

  const handleReturnSingleItem = async (itemId: number, quantity: number) => {
    if (!selectedInvoice) return;
    if (!quantity || quantity <= 0) return toast.error('أدخل كمية صحيحة');
    const item = invoiceItems.find(i => i.id === itemId);
    if (!item) return;
    if (quantity > item.quantity) return toast.error('الكمية المرتجعة أكبر من المتاحة');

    if (!window.confirm(`هل أنت متأكد من إرجاع عدد ${quantity} من "${item.product_name || 'منتج غير معروف'}"؟`)) return;

    try {
      await returnInvoiceItem(selectedInvoice.id, itemId, quantity, user!.id);
      toast.success('تم استرجاع الصنف بنجاح');
      // Reload items and update totals
      const updatedItems = await getInvoiceItems(selectedInvoice.id);
      setInvoiceItems(updatedItems);
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
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 px-2 font-bold flex items-center gap-2 transition-colors ${activeTab === 'expenses' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <FileText className="w-4 h-4" /> سجل المصروفات
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
          <div className="max-w-4xl mx-auto py-8">
            {/* Shifts History Table */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" /> سجل الورديات السابق
              </h3>
              <div className="overflow-x-auto bg-card rounded-2xl border border-border shadow-sm">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                      <th className="py-3 px-4 font-medium">رقم الوردية</th>
                      <th className="py-3 px-4 font-medium">الكاشير</th>
                      <th className="py-3 px-4 font-medium">الفتح</th>
                      <th className="py-3 px-4 font-medium">الإغلاق</th>
                      <th className="py-3 px-4 font-medium">العهدة</th>
                      <th className="py-3 px-4 font-medium">المتوقع</th>
                      <th className="py-3 px-4 font-medium">الفعلي</th>
                      <th className="py-3 px-4 font-medium">الحالة</th>
                      <th className="py-3 px-4 font-medium text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftsHistory.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">لا يوجد ورديات مسجلة</td></tr>}
                    {shiftsHistory.map(shift => (
                      <tr key={shift.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-bold">#{shift.id}</td>
                        <td className="py-3 px-4 text-sm font-bold text-foreground">{shift.user_name}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(shift.opened_at).toLocaleString('ar-EG')}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{shift.closed_at ? new Date(shift.closed_at).toLocaleString('ar-EG') : '---'}</td>
                        <td className="py-3 px-4 text-sm font-bold">{shift.opening_cash} ج.م</td>
                        <td className="py-3 px-4 text-sm font-bold text-blue-600">{shift.expected_cash ?? '---'}</td>
                        <td className="py-3 px-4 text-sm font-black text-emerald-600">{shift.closing_cash ?? '---'}</td>
                        <td className="py-3 px-4 text-sm">
                          {shift.status === 'open' 
                            ? <span className="bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-md font-bold text-xs">مفتوحة</span> 
                            : <span className="bg-muted text-muted-foreground px-2 py-1 rounded-md font-bold text-xs">مغلقة</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            onClick={() => handleViewShift(shift)}
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          >
                            التفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenInvoiceDetails(inv)}
                          className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                          التفاصيل والإرجاع
                        </button>
                        <button 
                          onClick={() => handleReturnInvoice(inv.id)}
                          className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                          إرجاع كلي
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-4 px-4 font-medium">رقم</th>
                  <th className="py-4 px-4 font-medium">المبلغ</th>
                  <th className="py-4 px-4 font-medium">الوصف</th>
                  <th className="py-4 px-4 font-medium">الخزنة</th>
                  <th className="py-4 px-4 font-medium">المستخدم</th>
                  <th className="py-4 px-4 font-medium">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody>
                {expensesList.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد مصروفات مسجلة</td></tr>}
                {expensesList.map(exp => (
                  <tr key={exp.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4 font-black">#{exp.id}</td>
                    <td className="py-4 px-4 font-bold text-destructive">{exp.amount} ج.م</td>
                    <td className="py-4 px-4 text-foreground font-medium">{exp.description}</td>
                    <td className="py-4 px-4 text-sm font-bold">
                      {exp.capital_id === 1 ? 'البضاعة والجملة' : exp.capital_id === 2 ? 'التحويلات والشحن' : exp.capital_id === 3 ? 'الصيانة والمصنعية' : 'أخرى'}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">{exp.username || 'غير معروف'}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">{new Date(exp.created_at!).toLocaleString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shift Details Modal */}
      {isShiftModalOpen && selectedShiftDetails && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h2 className="text-xl font-bold">
                تفاصيل الوردية #{selectedShiftDetails.shift.id} - الكاشير: {selectedShiftDetails.shift.user_name}
              </h2>
              <button onClick={() => setIsShiftModalOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 p-4 rounded-xl border border-border text-center">
                  <p className="text-xs text-muted-foreground font-bold mb-1">عهدة البدء</p>
                  <p className="text-lg font-black">{selectedShiftDetails.shift.opening_cash} ج.م</p>
                </div>
                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-center text-blue-600 dark:text-blue-400">
                  <p className="text-xs font-bold mb-1">المتوقع</p>
                  <p className="text-lg font-black">{selectedShiftDetails.shift.expected_cash ?? '---'}</p>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center text-emerald-600 dark:text-emerald-400">
                  <p className="text-xs font-bold mb-1">الفعلي</p>
                  <p className="text-lg font-black">{selectedShiftDetails.shift.closing_cash ?? '---'}</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl border border-border text-center">
                  <p className="text-xs text-muted-foreground font-bold mb-1">الحالة</p>
                  <p className="text-lg font-black">{selectedShiftDetails.shift.status === 'open' ? 'مفتوحة' : 'مغلقة'}</p>
                </div>
              </div>

              {/* Invoices */}
              <section>
                <h3 className="font-bold text-primary mb-3">مبيعات الوردية ({selectedShiftDetails.invoices.length})</h3>
                {selectedShiftDetails.invoices.length > 0 ? (
                  <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-muted/50"><tr><th className="p-2">الفاتورة</th><th className="p-2">الوقت</th><th className="p-2">الإجمالي</th><th className="p-2">طريقة الدفع</th></tr></thead>
                      <tbody>
                        {selectedShiftDetails.invoices.map((inv: any) => (
                          <tr key={inv.id} className="border-t border-border">
                            <td className="p-2">#{inv.id}</td>
                            <td className="p-2">{new Date(inv.created_at).toLocaleTimeString('ar-EG')}</td>
                            <td className="p-2 font-bold text-emerald-600">{inv.paid_amount} ج.م</td>
                            <td className="p-2">{inv.payment_method === 'cash' ? 'كاش' : 'فيزا'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-muted-foreground text-sm">لا توجد مبيعات في هذه الوردية.</p>}
              </section>

              {/* Maintenance */}
              <section>
                <h3 className="font-bold text-primary mb-3">صيانة تم تسليمها ({selectedShiftDetails.maintenance.length})</h3>
                {selectedShiftDetails.maintenance.length > 0 ? (
                  <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-muted/50"><tr><th className="p-2">رقم</th><th className="p-2">الجهاز</th><th className="p-2">التكلفة النهائية</th></tr></thead>
                      <tbody>
                        {selectedShiftDetails.maintenance.map((m: any) => (
                          <tr key={m.id} className="border-t border-border">
                            <td className="p-2">#{m.id}</td>
                            <td className="p-2">{m.device_model}</td>
                            <td className="p-2 font-bold text-emerald-600">{m.final_cost} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-muted-foreground text-sm">لا توجد صيانة مُسلّمة.</p>}
              </section>

              {/* Expenses */}
              <section>
                <h3 className="font-bold text-destructive mb-3">المصروفات ({selectedShiftDetails.expenses.length})</h3>
                {selectedShiftDetails.expenses.length > 0 ? (
                  <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-muted/50"><tr><th className="p-2">الوقت</th><th className="p-2">الوصف</th><th className="p-2">المبلغ</th></tr></thead>
                      <tbody>
                        {selectedShiftDetails.expenses.map((e: any) => (
                          <tr key={e.id} className="border-t border-border">
                            <td className="p-2">{new Date(e.created_at).toLocaleTimeString('ar-EG')}</td>
                            <td className="p-2">{e.description}</td>
                            <td className="p-2 font-bold text-destructive">{e.amount} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-muted-foreground text-sm">لا توجد مصروفات.</p>}
              </section>

              {/* Transfers */}
              <section>
                <h3 className="font-bold text-purple-600 dark:text-purple-400 mb-3">تحويلات وشحن ({selectedShiftDetails.transfers.length})</h3>
                {selectedShiftDetails.transfers.length > 0 ? (
                  <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-muted/50"><tr><th className="p-2">النوع</th><th className="p-2">الوقت</th><th className="p-2">العمولة/المكسب</th></tr></thead>
                      <tbody>
                        {selectedShiftDetails.transfers.map((t: any) => (
                          <tr key={t.id} className="border-t border-border">
                            <td className="p-2">{t.type}</td>
                            <td className="p-2">{new Date(t.created_at).toLocaleTimeString('ar-EG')}</td>
                            <td className="p-2 font-bold text-purple-600 dark:text-purple-400">{t.commission} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-muted-foreground text-sm">لا توجد عمليات تحويلات.</p>}
              </section>

            </div>
          </div>
        </div>
      )}

      {/* Invoice Details & Partial Return Modal */}
      {isInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-border bg-muted/30">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> تفاصيل فاتورة #{selectedInvoice.id}
              </h2>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              {invoiceItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground font-bold">هذه الفاتورة فارغة تم استرجاع كل محتوياتها</div>
              ) : (
                <div className="space-y-4">
                  {invoiceItems.map((item) => (
                    <div key={item.id} className="bg-muted/20 border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-lg mb-1">{item.product_name || 'منتج محذوف'}</h4>
                        <div className="text-sm text-muted-foreground flex gap-4">
                          <span>الكمية: <strong className="text-foreground">{item.quantity}</strong></span>
                          <span>السعر: <strong className="text-foreground">{item.unit_price} ج.م</strong></span>
                          <span>الإجمالي: <strong className="text-primary">{item.quantity * item.unit_price} ج.م</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="1" 
                          max={item.quantity}
                          placeholder="الكمية"
                          className="w-20 px-3 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary bg-background text-center"
                          value={returnQuantities[item.id] || ''}
                          onChange={(e) => setReturnQuantities({ ...returnQuantities, [item.id]: Number(e.target.value) })}
                        />
                        <button 
                          onClick={() => handleReturnSingleItem(item.id, returnQuantities[item.id] || item.quantity)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                          إرجاع
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
