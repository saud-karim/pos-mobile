import { useEffect, useState } from 'react';
import { Truck, Plus, Search, HandCoins, User } from 'lucide-react';
import { getWholesaleMerchants, addWholesaleMerchant, addMerchantPayment } from '../../lib/wholesaleQueries';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export function WholesaleMerchants() {
  const { user } = useAuthStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Merchant Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', phone: '', type: 'client' });

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');

  const loadData = async () => {
    try {
      const data = await getWholesaleMerchants();
      setMerchants(data);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل التجار');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMerchant = async () => {
    if (!newMerchant.name.trim()) return toast.error('أدخل اسم التاجر أو المحل');
    try {
      await addWholesaleMerchant(newMerchant);
      toast.success('تمت الإضافة بنجاح');
      setShowAddModal(false);
      setNewMerchant({ name: '', phone: '', type: 'client' });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) return toast.error('أدخل مبلغاً صحيحاً');
    
    // Determine payment type based on balance
    // Positive balance = they owe us (client), so we 'receive' money
    // Negative balance = we owe them (supplier), so we 'pay' money
    const paymentType = selectedMerchant.balance > 0 ? 'receive' : 'pay';

    try {
      await addMerchantPayment(selectedMerchant.id, user!.id, Number(paymentAmount), paymentType);
      toast.success('تم تسجيل الدفعة بنجاح');
      setShowPaymentModal(false);
      setPaymentAmount('');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    }
  };

  const filteredMerchants = merchants.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.phone && m.phone.includes(search))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          التجار والمحلات
        </h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="بحث بالاسم أو الهاتف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 shrink-0 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" /> إضافة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMerchants.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-card rounded-2xl border border-border text-muted-foreground">
              لا يوجد تجار أو محلات مسجلة.
            </div>
          ) : (
            filteredMerchants.map(merchant => (
              <div key={merchant.id} className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{merchant.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                          merchant.type === 'supplier' ? 'bg-rose-500/10 text-rose-600' :
                          merchant.type === 'client' ? 'bg-emerald-500/10 text-emerald-600' :
                          'bg-blue-500/10 text-blue-600'
                        }`}>
                          {merchant.type === 'supplier' ? 'مورد (تاجر كبير)' : merchant.type === 'client' ? 'عميل (محل)' : 'مورد وعميل'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {merchant.phone && (
                    <p className="text-sm text-muted-foreground mb-4 font-mono">{merchant.phone}</p>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الحساب المالي</p>
                    {merchant.balance === 0 ? (
                      <p className="text-lg font-bold text-muted-foreground">خالص (0 ج.م)</p>
                    ) : merchant.balance > 0 ? (
                      <p className="text-lg font-black text-emerald-600 flex flex-col">
                        <span>{merchant.balance.toLocaleString()} ج.م</span>
                        <span className="text-xs font-normal">لنا (ديون عليه)</span>
                      </p>
                    ) : (
                      <p className="text-lg font-black text-rose-600 flex flex-col">
                        <span>{Math.abs(merchant.balance).toLocaleString()} ج.م</span>
                        <span className="text-xs font-normal">علينا (ديون له)</span>
                      </p>
                    )}
                  </div>
                  {merchant.balance !== 0 && (
                    <button 
                      onClick={() => { setSelectedMerchant(merchant); setShowPaymentModal(true); }}
                      className={`p-2.5 rounded-xl transition-colors ${
                        merchant.balance > 0 
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600'
                      }`}
                      title={merchant.balance > 0 ? 'تحصيل دفعة' : 'تسديد دفعة'}
                    >
                      <HandCoins className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Merchant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" /> إضافة تاجر / محل
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold mb-2">اسم التاجر أو المحل</label>
                <input 
                  type="text"
                  value={newMerchant.name}
                  onChange={e => setNewMerchant({ ...newMerchant, name: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">رقم الهاتف (اختياري)</label>
                <input 
                  type="text"
                  value={newMerchant.phone}
                  onChange={e => setNewMerchant({ ...newMerchant, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">نوع التاجر</label>
                <select 
                  value={newMerchant.type}
                  onChange={e => setNewMerchant({ ...newMerchant, type: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="client">عميل (محل نبيع له)</option>
                  <option value="supplier">مورد (تاجر نشتري منه)</option>
                  <option value="both">مورد وعميل</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl hover:bg-muted font-bold">إلغاء</button>
              <button onClick={handleAddMerchant} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90">
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedMerchant && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${selectedMerchant.balance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <HandCoins className="w-6 h-6" /> 
              {selectedMerchant.balance > 0 ? 'تحصيل دفعة من محل' : 'تسديد دفعة لمورد'}
            </h3>
            
            <p className="text-sm mb-4">
              التاجر: <span className="font-bold text-primary">{selectedMerchant.name}</span>
              <br />
              إجمالي المبلغ المطلوب: <span className="font-bold">{Math.abs(selectedMerchant.balance).toLocaleString()} ج.م</span>
            </p>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">المبلغ (ج.م)</label>
              <input 
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="أدخل المبلغ..."
                max={Math.abs(selectedMerchant.balance)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-lg"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 rounded-xl hover:bg-muted font-bold">إلغاء</button>
              <button 
                onClick={handlePayment} 
                className={`px-6 py-2 rounded-xl font-bold text-white ${selectedMerchant.balance > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                تأكيد {selectedMerchant.balance > 0 ? 'التحصيل' : 'التسديد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
