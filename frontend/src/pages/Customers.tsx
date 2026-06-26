import { useState, useEffect } from 'react';
import { Search, User, CreditCard, UserPlus, X } from 'lucide-react';
import { getCustomers, addCustomer, addCustomerPayment, Customer } from '../lib/customersQueries';
import { useAuthStore } from '../store/authStore';
import { printDebtPaymentReceipt } from '../lib/printUtils';
import toast from 'react-hot-toast';

export function Customers() {
  const user = useAuthStore(state => state.user);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');


  // Add Customer State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ name: '', phone: '', national_id: '', credit_balance: 0 });

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  const loadCustomers = async () => {
    try {
      const data = await getCustomers(searchQuery);
      setCustomers(data);
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تحميل العملاء');
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCustomer(newCustomer as Customer);
      toast.success('تمت إضافة العميل بنجاح');
      setShowAddForm(false);
      setNewCustomer({ name: '', phone: '', national_id: '', credit_balance: 0 });
      loadCustomers();
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  const handlePayment = async (customer: Customer) => {
    if (!user) return toast.error('يرجى تسجيل الدخول');
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('أدخل مبلغاً صحيحاً');
      return;
    }
    try {
      await addCustomerPayment(customer.id!, user.id, Number(paymentAmount));
      
      printDebtPaymentReceipt({
        customerName: customer.name,
        customerPhone: customer.phone || undefined,
        date: new Date().toLocaleString('ar-EG'),
        paidAmount: Number(paymentAmount),
        remainingDebt: customer.credit_balance - Number(paymentAmount),
        cashierName: user.username,
      });

      toast.success('تم تسديد الدفعة بنجاح وإضافتها للدرج');
      setSelectedCustomerId(null);
      setPaymentAmount('');
      loadCustomers();
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">العملاء والمديونيات</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          {showAddForm ? <User className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          <span>{showAddForm ? 'إلغاء' : 'إضافة عميل'}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <form onSubmit={handleAddCustomer} className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted/30">
              <h3 className="text-xl font-black text-primary flex items-center gap-2">
                <UserPlus className="w-6 h-6" /> تسجيل عميل جديد
              </h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm mb-2 font-medium">اسم العميل</label>
                <input required type="text" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">رقم الهاتف</label>
                <input type="text" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newCustomer.phone || ''} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">الرقم القومي (اختياري)</label>
                <input type="text" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newCustomer.national_id || ''} onChange={e => setNewCustomer({...newCustomer, national_id: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-2 font-medium">مديونية سابقة (رصيد افتتاحي)</label>
                <input type="number" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newCustomer.credit_balance} onChange={e => setNewCustomer({...newCustomer, credit_balance: Number(e.target.value)})} />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 rounded-xl font-bold hover:bg-muted transition-colors text-foreground">
                إلغاء
              </button>
              <button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-t border-blue-400/30 px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
                حفظ بيانات العميل
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
              placeholder="البحث بالاسم أو رقم الهاتف أو الرقم القومي..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
            />
          </div>
        </div>

        {/* Customers Table */}
        <div className="flex-1 overflow-x-auto p-2">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-4 px-4 font-medium">الاسم</th>
                <th className="py-4 px-4 font-medium">الهاتف</th>
                <th className="py-4 px-4 font-medium">الرقم القومي</th>
                <th className="py-4 px-4 font-medium">رصيد المديونية</th>
                <th className="py-4 px-4 font-medium">تاريخ التسجيل</th>
                <th className="py-4 px-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد عملاء</td></tr>}
              {customers.map(customer => (
                <tr key={customer.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4 font-black text-foreground">{customer.name}</td>
                  <td className="py-4 px-4 text-muted-foreground">{customer.phone || '-'}</td>
                  <td className="py-4 px-4 text-muted-foreground text-sm font-mono">{customer.national_id || '-'}</td>
                  <td className="py-4 px-4">
                    {customer.credit_balance > 0 ? (
                      <span className="text-destructive font-black bg-destructive/10 px-3 py-1.5 rounded-lg text-sm">
                        عليه {customer.credit_balance} ج.م
                      </span>
                    ) : customer.credit_balance < 0 ? (
                      <span className="text-emerald-600 font-black bg-emerald-500/10 px-3 py-1.5 rounded-lg text-sm">
                        له {Math.abs(customer.credit_balance)} ج.م
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-bold">خالص (0)</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground font-medium">{new Date(customer.created_at!).toLocaleDateString('ar-EG')}</td>
                  <td className="py-4 px-4">
                    {selectedCustomerId === customer.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          placeholder="المبلغ المدفوع" 
                          className="w-28 px-3 py-1.5 border border-border rounded-lg bg-background text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(Number(e.target.value))}
                        />
                        <button onClick={() => handlePayment(customer)} className="text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">تسديد</button>
                        <button onClick={() => setSelectedCustomerId(null)} className="text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-lg text-sm font-bold">إلغاء</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setSelectedCustomerId(customer.id!)}
                        className="flex items-center gap-2 text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
                      >
                        <CreditCard className="w-4 h-4" /> دفع دفعة
                      </button>
                    )}
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
