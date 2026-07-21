import { useEffect, useState } from 'react';
import { PackageX, Plus, AlertTriangle, Box } from 'lucide-react';
import { getDamages, addDamage } from '../lib/damagesQueries';
import { getWholesaleInventory } from '../lib/wholesaleQueries';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function Damages() {
  const { user } = useAuthStore();
  const [damages, setDamages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('');

  const loadData = async () => {
    try {
      const data = await getDamages(page, 20);
      setDamages(data.data);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل سجل الهوالك');
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      const inv = await getWholesaleInventory('', 1, 1000);
      setInventory(inv.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadData();
    loadInventory();
  }, [page]);

  const handleOpenAdd = () => {
    setSelectedProductId('');
    setProductSearch('');
    setShowProductDropdown(false);
    setQuantity('');
    setReason('');
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedProductId) return toast.error('اختر الصنف');
    if (!quantity || quantity <= 0) return toast.error('أدخل كمية صحيحة');
    if (!reason.trim()) return toast.error('أدخل سبب الإهلاك');
    if (!user) return toast.error('غير مسجل الدخول');

    const product = inventory.find(p => p.id === Number(selectedProductId));
    if (!product) return toast.error('الصنف غير موجود');

    if (quantity > product.quantity) {
      return toast.error('الكمية المهلكة أكبر من الكمية المتاحة في المخزن!');
    }

    try {
      await addDamage(product.id, user.id, Number(quantity), product.cost_price, reason);
      toast.success('تم تسجيل الهالك وخصمه من المخزن بنجاح');
      setShowAddModal(false);
      loadData();
      loadInventory(); // Refresh available inventory
    } catch (error: any) {
      console.error("Damages Error: ", error);
      toast.error('خطأ: ' + (error.message || String(error)));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <PackageX className="w-6 h-6" />
          </div>
          سجل الهوالك والتوالف
        </h2>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> تسجيل صنف تالف
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-4 font-bold">التاريخ</th>
                  <th className="p-4 font-bold">الصنف</th>
                  <th className="p-4 font-bold">الكمية</th>
                  <th className="p-4 font-bold">قيمة الخسارة</th>
                  <th className="p-4 font-bold">السبب</th>
                  <th className="p-4 font-bold">المستخدم</th>
                </tr>
              </thead>
              <tbody>
                {damages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">لا يوجد سجلات للهوالك</td>
                  </tr>
                ) : (
                  damages.map(d => (
                    <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4 text-muted-foreground">{new Date(d.created_at).toLocaleString('ar-EG')}</td>
                      <td className="p-4 font-bold text-primary flex items-center gap-2">
                        <Box className="w-4 h-4 text-rose-500" />
                        {d.product_name}
                      </td>
                      <td className="p-4 font-bold text-rose-500">{d.quantity}</td>
                      <td className="p-4 font-black text-rose-600">{(d.quantity * d.cost_price).toLocaleString()} ج.م</td>
                      <td className="p-4">{d.reason}</td>
                      <td className="p-4 text-muted-foreground">{d.user_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex justify-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg disabled:opacity-50"
              >
                السابق
              </button>
              <span className="px-4 py-2 font-bold">{page} / {totalPages}</span>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" /> تسجيل صنف تالف
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="relative">
                <label className="block text-sm font-bold mb-2">الصنف</label>
                <input 
                  type="text"
                  placeholder="ابحث عن الصنف التالف..."
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setSelectedProductId(''); 
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                />
                {showProductDropdown && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                    {inventory.filter(p => p.quantity > 0 && p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                      <div 
                        key={p.id} 
                        onMouseDown={() => {
                          setSelectedProductId(p.id.toString());
                          setProductSearch(p.name);
                          setShowProductDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border last:border-0 font-medium"
                      >
                        {p.name} (المتاح: {p.quantity})
                      </div>
                    ))}
                    {inventory.filter(p => p.quantity > 0 && p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">لا توجد نتائج</div>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">الكمية التالفة</label>
                <input 
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value ? Number(e.target.value) : '')}
                  placeholder="عدد القطع التالفة"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">سبب الإهلاك</label>
                <input 
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="مثال: كسر الشاشة، عيب مصنع، مفقود..."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {selectedProductId && quantity && quantity > 0 && (
                <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
                  <p className="text-sm text-rose-600 font-bold mb-1">إجمالي الخسارة المتوقعة:</p>
                  <p className="text-2xl font-black text-rose-700">
                    {((inventory.find(p => p.id === Number(selectedProductId))?.cost_price || 0) * Number(quantity)).toLocaleString()} ج.م
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl hover:bg-muted font-bold">إلغاء</button>
              <button onClick={handleSubmit} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors">تأكيد وخصم</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
