import { useState, useEffect } from 'react';
import { Smartphone, Wrench, ArrowRightLeft, DollarSign, Loader2, Banknote, Calendar, Wallet, PackageX, AlertTriangle } from 'lucide-react';
import { getDashboardStats, getRecentInvoices, getReadyMaintenance, getLowStockItems, DashboardStats } from '../lib/dashboardQueries';

export function Dashboard() {
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [readyMaintenance, setReadyMaintenance] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today'); // default today

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let startDate: string | undefined = undefined;
        let endDate: string | undefined = undefined;
        
        const end = new Date();
        const start = new Date();

        if (period !== 'all') {
          if (period === 'today') {
            start.setHours(0, 0, 0, 0);
          } else if (period === 'week') {
            start.setDate(start.getDate() - 7);
          } else if (period === 'month') {
            start.setMonth(start.getMonth() - 1);
          } else if (period === '3month') {
            start.setMonth(start.getMonth() - 3);
          } else if (period === '6month') {
            start.setMonth(start.getMonth() - 6);
          } else if (period === 'year') {
            start.setFullYear(start.getFullYear() - 1);
          }
          
          startDate = start.toISOString().replace('T', ' ').substring(0, 19);
          endDate = end.toISOString().replace('T', ' ').substring(0, 19);
        }

        const stats = await getDashboardStats(startDate, endDate);
        const invoices = await getRecentInvoices();
        const maintenance = await getReadyMaintenance();
        const lowStock = await getLowStockItems();

        setStatsData(stats);
        setRecentInvoices(invoices);
        setReadyMaintenance(maintenance);
        setLowStockItems(lowStock);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [period]);

  const stats = [
    { title: 'المبيعات', value: `${statsData?.periodSales || 0} ج.م`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'أرباح الصيانة', value: `${statsData?.periodMaintenance || 0} ج.م`, icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'صافي الربح', value: `${statsData?.periodProfit || 0} ج.م`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'عمولات تحويلات', value: `${statsData?.periodTransfersComm || 0} ج.م`, icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'ديون محصلة', value: `${statsData?.periodPayments || 0} ج.م`, icon: Banknote, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { title: 'أجهزة في الصيانة', value: `${statsData?.activeMaintenance || 0} جهاز`, icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'نواقص المخزون', value: `${statsData?.lowStockCount || 0} صنف`, icon: Smartphone, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'خسائر الهوالك', value: `${statsData?.periodDamages || 0} ج.م`, icon: PackageX, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const getCapitalIcon = (id: number) => {
    switch (id) {
      case 1: return <Smartphone className="w-8 h-8 text-amber-500" />;
      case 2: return <ArrowRightLeft className="w-8 h-8 text-blue-500" />;
      case 3: return <Wrench className="w-8 h-8 text-emerald-500" />;
      default: return <Wallet className="w-8 h-8 text-slate-500" />;
    }
  };

  const getCapitalBg = (id: number) => {
    switch (id) {
      case 1: return 'bg-amber-500/10';
      case 2: return 'bg-blue-500/10';
      case 3: return 'bg-emerald-500/10';
      default: return 'bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">نظرة عامة</h2>
        
        <div className="flex items-center gap-2 bg-[var(--card)] px-4 py-2 rounded-xl border border-[var(--border)] shadow-sm">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-transparent border-none outline-none text-foreground font-bold"
          >
            <option value="today">اليوم</option>
            <option value="week">آخر أسبوع</option>
            <option value="month">آخر شهر</option>
            <option value="3month">آخر 3 شهور</option>
            <option value="6month">آخر 6 شهور</option>
            <option value="year">آخر سنة</option>
            <option value="all">كل الأوقات</option>
          </select>
        </div>
      </div>

      {loading && !statsData ? (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Capitals Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statsData?.capitals.map((capital) => (
              <div key={capital.id} className="bg-[var(--card)] p-6 rounded-2xl border-2 border-[var(--border)] shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between items-center text-center">
                <div className={`p-5 rounded-full ${getCapitalBg(capital.id)} mb-4`}>
                  {getCapitalIcon(capital.id)}
                </div>
                <h3 className="text-lg font-bold text-muted-foreground mb-2">{capital.name}</h3>
                <p className="text-3xl font-black text-foreground">{capital.balance} ج.م</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-[var(--card)] p-6 rounded-xl border border-[var(--border)] flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className={`p-4 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[var(--card)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
              <h3 className="text-lg font-semibold mb-4">أحدث المبيعات</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 px-2 font-medium">رقم</th>
                      <th className="py-2 px-2 font-medium">العميل</th>
                      <th className="py-2 px-2 font-medium">الوقت</th>
                      <th className="py-2 px-2 font-medium">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">لا يوجد مبيعات بعد</td></tr>
                    ) : (
                      recentInvoices.map(inv => (
                        <tr key={inv.id + inv.type} className="border-b border-border hover:bg-muted/30">
                          <td className="py-3 px-2 font-bold flex items-center gap-1">
                            #{inv.id}
                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{inv.type}</span>
                          </td>
                          <td className="py-3 px-2">{inv.customer_name || 'عميل نقدي'}</td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">{new Date(inv.created_at).toLocaleTimeString('ar-EG')}</td>
                          <td className="py-3 px-2 font-bold text-primary">{inv.total_amount} ج.م</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[var(--card)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
              <h3 className="text-lg font-semibold mb-4">أجهزة جاهزة للتسليم (صيانة)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 px-2 font-medium">رقم</th>
                      <th className="py-2 px-2 font-medium">الموديل</th>
                      <th className="py-2 px-2 font-medium">العميل</th>
                      <th className="py-2 px-2 font-medium">التكلفة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readyMaintenance.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">لا يوجد أجهزة جاهزة للتسليم</td></tr>
                    ) : (
                      readyMaintenance.map(m => (
                        <tr key={m.id} className="border-b border-border hover:bg-muted/30">
                          <td className="py-3 px-2 font-bold">#{m.id}</td>
                          <td className="py-3 px-2">{m.device_model}</td>
                          <td className="py-3 px-2 text-sm">{m.customer_name} ({m.phone})</td>
                          <td className="py-3 px-2 font-bold text-emerald-600">{m.final_cost} ج.م</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[var(--card)] p-6 rounded-xl border border-rose-500/30 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-rose-500"></div>
              <h3 className="text-lg font-semibold mb-4 text-rose-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> تنبيهات النواقص
              </h3>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card">
                      <th className="py-2 px-2 font-medium">الصنف</th>
                      <th className="py-2 px-2 font-medium">المتاح</th>
                      <th className="py-2 px-2 font-medium">الحد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-4 text-emerald-600 font-bold">لا يوجد أي نواقص! المخزن ممتلئ</td></tr>
                    ) : (
                      lowStockItems.map(item => (
                        <tr key={item.id} className="border-b border-border hover:bg-rose-500/5 transition-colors">
                          <td className="py-3 px-2 font-bold flex items-center gap-2">
                            {item.quantity === 0 && <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>}
                            {item.name}
                          </td>
                          <td className="py-3 px-2 font-black text-rose-600">{item.quantity}</td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">{item.min_stock}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
