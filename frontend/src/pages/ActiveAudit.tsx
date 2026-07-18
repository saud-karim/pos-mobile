import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuditItems, updateAuditItem, completeAudit, AuditItem } from '../lib/auditQueries';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Search, ArrowLeft, Barcode, CheckCircle2 } from 'lucide-react';

export function ActiveAudit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  
  const [items, setItems] = useState<AuditItem[]>([]);
  const [search, setSearch] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) loadItems(parseInt(id));
  }, [id]);

  const loadItems = async (auditId: number) => {
    try {
      const data = await getAuditItems(auditId);
      setItems(data);
    } catch (error: any) {
      toast.error('خطأ في جلب بيانات الجرد: ' + error.message);
    }
  };

  const handleQuantityChange = async (itemId: number, newValue: string) => {
    const numValue = newValue === '' ? 0 : parseInt(newValue);
    if (isNaN(numValue)) return;

    // Optimistic update
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, actual_quantity: numValue } : item
    ));

    try {
      await updateAuditItem(itemId, numValue);
    } catch (error: any) {
      toast.error('خطأ في حفظ الكمية: ' + error.message);
      // Revert if failed
      if (id) loadItems(parseInt(id));
    }
  };

  const handleComplete = async () => {
    if (!user || !id) return;
    
    try {
      await completeAudit(parseInt(id), user.id);
      toast.success('تم إنهاء الجرد وتحديث المخزن بنجاح!');
      setShowCompleteModal(false);
      navigate('/inventory-audits');
    } catch (error: any) {
      toast.error('حدث خطأ أثناء اعتماد الجرد: ' + error.message);
    }
  };

  const filteredItems = items.filter(item => 
    item.product_name?.toLowerCase().includes(search.toLowerCase()) || 
    item.product_barcode?.includes(search)
  );

  const totalExpected = items.reduce((sum, item) => sum + item.expected_quantity, 0);
  const totalActual = items.reduce((sum, item) => sum + item.actual_quantity, 0);
  const totalLossValue = items.reduce((sum, item) => {
    const diff = item.actual_quantity - item.expected_quantity;
    return diff < 0 ? sum + (Math.abs(diff) * item.cost_price) : sum;
  }, 0);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inventory-audits')}
            className="p-3 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground">جلسة جرد رقم #{id}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              الكمية المتوقعة: <span className="font-bold">{totalExpected}</span> | 
              الكمية المجرودة: <span className="font-bold text-primary">{totalActual}</span>
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          {totalLossValue > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl flex flex-col justify-center">
              <span className="text-xs text-rose-600 font-bold">قيمة الخسائر (نواقص)</span>
              <span className="font-black text-rose-700">{totalLossValue.toLocaleString()} ج.م</span>
            </div>
          )}
          <button 
            onClick={() => setShowCompleteModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5" /> اعتماد وإنهاء الجرد
          </button>
        </div>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center gap-3">
        <Barcode className="w-6 h-6 text-muted-foreground" />
        <div className="flex-1 relative">
          <input 
            ref={searchInputRef}
            type="text"
            placeholder="ابحث بالاسم أو الباركود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-primary text-foreground"
            autoFocus
          />
          <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-1">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted text-muted-foreground sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-bold">الصنف</th>
                <th className="p-4 font-bold">الباركود</th>
                <th className="p-4 font-bold text-center">الكمية المتوقعة</th>
                <th className="p-4 font-bold text-center">الكمية الفعلية</th>
                <th className="p-4 font-bold text-center">الفرق</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const diff = item.actual_quantity - item.expected_quantity;
                return (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-bold text-base">{item.product_name}</td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">{item.product_barcode || 'بدون باركود'}</td>
                    <td className="p-4 text-center font-mono text-lg bg-muted/20">
                      {item.expected_quantity}
                    </td>
                    <td className="p-4 text-center">
                      <input 
                        type="number"
                        min="0"
                        value={item.actual_quantity.toString()}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className="w-24 text-center bg-background border border-border rounded-lg px-2 py-2 font-mono text-lg font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary mx-auto block"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                    </td>
                    <td className="p-4 text-center font-bold text-lg" dir="ltr">
                      {diff === 0 ? (
                        <span className="text-muted-foreground">0</span>
                      ) : diff > 0 ? (
                        <span className="text-emerald-600">+{diff}</span>
                      ) : (
                        <span className="text-rose-600">{diff}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground text-lg">
                    لا يوجد نتائج للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCompleteModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-foreground">تأكيد إنهاء الجرد</h3>
            </div>
            
            <p className="text-muted-foreground mb-6 font-medium leading-relaxed">
              هل أنت متأكد من إنهاء الجرد واعتماده؟
              <br />
              <span className="text-rose-600 font-bold mt-2 inline-block">سيتم تحديث كميات المخزن تلقائياً وتسجيل أي خسائر إن وجدت. هذا الإجراء لا يمكن التراجع عنه.</span>
            </p>

            {totalLossValue > 0 && (
              <div className="bg-rose-500/10 p-4 rounded-xl mb-6">
                <p className="text-sm font-bold text-rose-600 mb-1">إجمالي الخسائر التي سيتم خصمها</p>
                <p className="text-2xl font-black text-rose-700">{totalLossValue.toLocaleString()} ج.م</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowCompleteModal(false)}
                className="px-6 py-2.5 rounded-xl hover:bg-muted font-bold transition-colors"
              >
                تراجع
              </button>
              <button 
                onClick={handleComplete}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
              >
                تأكيد واعتماد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
