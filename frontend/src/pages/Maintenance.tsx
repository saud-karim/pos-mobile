import React, { useState, useEffect } from 'react';
import { Plus, Search, Wrench, X } from 'lucide-react';
import { getMaintenanceJobs, addMaintenanceJob, updateMaintenanceStatus, MaintenanceJob } from '../lib/maintenanceQueries';
import { useAuthStore } from '../store/authStore';
import { printMaintenanceTicket } from '../lib/printUtils';
import toast from 'react-hot-toast';

export function Maintenance() {
  const user = useAuthStore(state => state.user);
  const [activeStatus, setActiveStatus] = useState('all');
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);

  
  // Add Job Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJob, setNewJob] = useState<Partial<MaintenanceJob>>({
    device_model: '', issue_description: '', estimated_cost: 0, status: 'pending'
  });

  const statuses = [
    { id: 'all', label: 'الكل' },
    { id: 'pending', label: 'قيد الانتظار' },
    { id: 'in_progress', label: 'جاري العمل' },
    { id: 'ready', label: 'جاهز للتسليم' },
    { id: 'delivered', label: 'تم التسليم' },
  ];

  useEffect(() => {
    loadJobs();
  }, [activeStatus]);

  const loadJobs = async () => {
    try {
      const data = await getMaintenanceJobs(activeStatus);
      setJobs(data);
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const id = await addMaintenanceJob({
        ...newJob,
        user_id: user.id,
        status: 'pending',
      } as MaintenanceJob);
      
      toast.success('تم تسجيل الجهاز بنجاح');
      
      // Print ticket
      printMaintenanceTicket({
        jobId: Number(id),
        date: new Date().toLocaleString('ar-EG'),
        customerName: 'عميل نقدي', // Would be real if we selected a customer in the form
        customerPhone: '-',
        deviceModel: newJob.device_model || '',
        issueDescription: newJob.issue_description || '',
        estimatedCost: newJob.estimated_cost || 0
      });

      setShowAddForm(false);
      setNewJob({ device_model: '', issue_description: '', estimated_cost: 0, status: 'pending' });
      loadJobs();
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  const handlePrint = (job: MaintenanceJob) => {
    printMaintenanceTicket({
      jobId: job.id!,
      date: new Date(job.created_at || '').toLocaleString('ar-EG') || new Date().toLocaleString('ar-EG'),
      customerName: job.customer_name || 'عميل نقدي',
      customerPhone: job.customer_phone || '-',
      deviceModel: job.device_model,
      issueDescription: job.issue_description,
      estimatedCost: job.estimated_cost
    });
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updateMaintenanceStatus(id, status);
      toast.success('تم تحديث الحالة');
      loadJobs();
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">قسم الصيانة</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{showAddForm ? 'إلغاء' : 'استلام جهاز جديد'}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <form onSubmit={handleAddJob} className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted/30">
              <h3 className="text-xl font-black text-primary flex items-center gap-2">
                <Wrench className="w-6 h-6" /> تسجيل استلام جهاز للصيانة
              </h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 font-medium">موديل الجهاز</label>
                <input required type="text" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newJob.device_model} onChange={e => setNewJob({...newJob, device_model: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">التكلفة التقديرية (ج.م)</label>
                <input required type="number" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newJob.estimated_cost} onChange={e => setNewJob({...newJob, estimated_cost: Number(e.target.value)})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-2 font-medium">وصف العطل / ملاحظات العميل</label>
                <textarea required rows={3} className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newJob.issue_description} onChange={e => setNewJob({...newJob, issue_description: e.target.value})} />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 rounded-xl font-bold hover:bg-muted transition-colors text-foreground">
                إلغاء
              </button>
              <button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-t border-blue-400/30 px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
                حفظ وطباعة الإيصال
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm min-h-[500px] flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-border flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute right-3 top-3 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="البحث برقم الهاتف أو الموديل..." 
              className="w-full pr-10 pl-4 py-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
            />
          </div>
          <div className="flex bg-muted rounded-xl p-1 overflow-x-auto">
            {statuses.map(status => (
              <button 
                key={status.id}
                onClick={() => setActiveStatus(status.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${activeStatus === status.id ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:bg-background/50'}`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Maintenance Jobs Table */}
        <div className="flex-1 overflow-x-auto p-2">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-4 px-4 font-medium">الإيصال</th>
                <th className="py-4 px-4 font-medium">العميل</th>
                <th className="py-4 px-4 font-medium">الموديل / العطل</th>
                <th className="py-4 px-4 font-medium">حالة الجهاز</th>
                <th className="py-4 px-4 font-medium">التكلفة (تقديري)</th>
                <th className="py-4 px-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد أجهزة</td></tr>}
              {jobs.map(job => (
                <tr key={job.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4 font-black text-muted-foreground">#{job.id}</td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-foreground">{job.customer_name || 'عميل نقدي'}</div>
                    <div className="text-sm text-muted-foreground">{job.customer_phone || '-'}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold">{job.device_model}</div>
                    <div className="text-sm text-destructive">{job.issue_description}</div>
                  </td>
                  <td className="py-4 px-4">
                    {job.status === 'pending' && <span className="text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-lg text-sm font-bold">قيد الانتظار</span>}
                    {job.status === 'in_progress' && <span className="text-blue-600 bg-blue-500/10 px-3 py-1.5 rounded-lg text-sm font-bold">جاري العمل</span>}
                    {job.status === 'ready' && <span className="text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg text-sm font-bold">جاهز للتسليم</span>}
                    {job.status === 'delivered' && <span className="text-muted-foreground bg-muted px-3 py-1.5 rounded-lg text-sm font-bold">تم التسليم</span>}
                  </td>
                  <td className="py-4 px-4 font-black text-primary">{job.estimated_cost} ج.م</td>
                  <td className="py-4 px-4 flex items-center justify-end gap-2">
                    <select 
                      className="border border-border rounded-lg px-3 py-2 bg-background text-sm font-bold focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                      value={job.status}
                      onChange={e => handleUpdateStatus(job.id!, e.target.value)}
                    >
                      <option value="pending">انتظار</option>
                      <option value="in_progress">بدء العمل</option>
                      <option value="ready">جاهز</option>
                      <option value="delivered">تسليم</option>
                    </select>
                    <button 
                      onClick={() => handlePrint(job)}
                      className="p-2 bg-muted hover:bg-muted-foreground/20 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                      title="طباعة إيصال"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
