import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Play, Trash2 } from 'lucide-react';
import { getAudits, createAudit, cancelAudit, InventoryAudit } from '../lib/auditQueries';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export function InventoryAudits() {
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    loadAudits();
  }, []);

  const loadAudits = async () => {
    try {
      const data = await getAudits();
      setAudits(data);
    } catch (error: any) {
      toast.error('خطأ في جلب جلسات الجرد: ' + error.message);
    }
  };

  const handleCreateAudit = async () => {
    if (!user) return;
    try {
      const auditId = await createAudit(user.id);
      toast.success('تم فتح جلسة جرد جديدة بنجاح');
      navigate(`/inventory-audits/${auditId}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCancelAudit = async () => {
    if (showCancelModal === null) return;
    
    try {
      await cancelAudit(showCancelModal);
      toast.success('تم الإلغاء');
      setShowCancelModal(null);
      loadAudits();
    } catch (error: any) {
      toast.error('خطأ: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-xl">
            <ClipboardList className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">جرد المخزن</h1>
            <p className="text-sm text-muted-foreground mt-1">إدارة ومراجعة جلسات جرد البضاعة</p>
          </div>
        </div>
        
        <button 
          onClick={handleCreateAudit}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95"
        >
          <Plus className="w-5 h-5" /> بدء جلسة جرد جديدة
        </button>
      </div>

      <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="p-4 font-bold">رقم الجرد</th>
                <th className="p-4 font-bold">المسؤول</th>
                <th className="p-4 font-bold">التاريخ</th>
                <th className="p-4 font-bold">الحالة</th>
                <th className="p-4 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground font-medium text-lg">
                    لا يوجد أي جلسات جرد سابقة.
                  </td>
                </tr>
              ) : (
                audits.map(audit => (
                  <tr key={audit.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="p-4 font-bold">#{audit.id}</td>
                    <td className="p-4">{audit.username}</td>
                    <td className="p-4" dir="ltr">
                      {new Date(audit.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="p-4">
                      {audit.status === 'pending' ? (
                        <span className="bg-orange-500/10 text-orange-600 px-3 py-1 rounded-lg font-bold text-xs">قيد التنفيذ (مفتوح)</span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-lg font-bold text-xs">مكتمل</span>
                      )}
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      {audit.status === 'pending' ? (
                        <>
                          <button 
                            onClick={() => navigate(`/inventory-audits/${audit.id}`)}
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-1 text-xs"
                          >
                            <Play className="w-4 h-4" /> استكمال الجرد
                          </button>
                          <button 
                            onClick={() => setShowCancelModal(audit.id)}
                            className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-1 text-xs"
                          >
                            <Trash2 className="w-4 h-4" /> إلغاء
                          </button>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs font-bold">تم إغلاق الجرد</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCancelModal !== null && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-foreground">إلغاء وحذف الجرد</h3>
            </div>
            
            <p className="text-muted-foreground mb-6 font-medium leading-relaxed">
              هل أنت متأكد من أنك تريد إلغاء جلسة الجرد هذه بالكامل؟ لن يتم تطبيق أي تعديلات على المخزن وسيتم حذف الجلسة بشكل نهائي.
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowCancelModal(null)}
                className="px-6 py-2.5 rounded-xl hover:bg-muted font-bold transition-colors"
              >
                تراجع
              </button>
              <button 
                onClick={handleCancelAudit}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors"
              >
                نعم، احذف الجرد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
