import { useState, useEffect } from 'react';
import { Smartphone, Wrench, ArrowRightLeft, DollarSign, Loader2 } from 'lucide-react';
import { getDashboardStats, getRecentInvoices, getReadyMaintenance, DashboardStats } from '../lib/dashboardQueries';

export function Dashboard() {
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [readyMaintenance, setReadyMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stats = await getDashboardStats();
        const invoices = await getRecentInvoices();
        const maintenance = await getReadyMaintenance();

        setStatsData(stats);
        setRecentInvoices(invoices);
        setReadyMaintenance(maintenance);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { title: 'مبيعات اليوم', value: `${statsData?.todaySales || 0} ج.م`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'إجمالي المبيعات (تراكمي)', value: `${statsData?.totalSalesAllTime || 0} ج.م`, icon: DollarSign, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'صافي الربح (تراكمي)', value: `${statsData?.totalProfitAllTime || 0} ج.م`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'أجهزة في الصيانة', value: `${statsData?.activeMaintenance || 0} جهاز`, icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'عمولات تحويلات اليوم', value: `${statsData?.todayTransfersComm || 0} ج.م`, icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'نواقص المخزون', value: `${statsData?.lowStockCount || 0} صنف`, icon: Smartphone, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">نظرة عامة</h2>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  );
}
