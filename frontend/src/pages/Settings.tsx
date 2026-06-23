import React, { useState, useEffect } from 'react';
import { Save, Store, X, Settings2, Printer, Users, Plus, Trash2, Database, Download, Upload } from 'lucide-react';
import { getUsers, addUser, deleteUser } from '../lib/usersQueries';
import { exportDatabase, importDatabase } from '../lib/backupUtils';
import { injectDummyData } from '../lib/dummyData';
import { User } from '../store/authStore';
import toast from 'react-hot-toast';

export function Settings({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'store' | 'printer' | 'users' | 'backup'>('store');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('cashier');

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsersList(data);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    try {
      await addUser(newUsername, newPassword, newRole);
      toast.success('تم إضافة المستخدم بنجاح');
      setNewUsername('');
      setNewPassword('');
      loadUsers();
    } catch (error) {
      toast.error('اسم المستخدم موجود مسبقاً أو حدث خطأ');
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (username === 'admin') {
      toast.error('لا يمكن حذف حساب المدير الأساسي');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await deleteUser(id);
        toast.success('تم حذف المستخدم بنجاح');
        loadUsers();
      } catch (error) {
        toast.error('حدث خطأ أثناء الحذف');
      }
    }
  };

  const handleInjectData = async () => {
    alert('الزرار شغال! هيتم حقن البيانات دلوقتي...');
    toast.loading('جاري حقن البيانات... برجاء الانتظار', { id: 'dummy-data' });
    try {
      await injectDummyData();
      toast.success('تم حقن البيانات التجريبية بنجاح! يرجى إعادة تحديث التطبيق لرؤية التغييرات.', { id: 'dummy-data' });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast.error(error?.message || String(error), { id: 'dummy-data' });
      console.error('Injection Error:', error);
    }
  };

  const [settings, setSettings] = useState({
    shopName: 'كاشير بوس',
    phone: '',
    address: '',
    policy: 'البضاعة المباعة لا ترد ولا تستبدل إلا في حالة وجود عيب صناعة خلال 14 يوم.',
    printerType: 'thermal' // thermal, a4
  });

  useEffect(() => {
    const saved = localStorage.getItem('pos_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    localStorage.setItem('pos_settings', JSON.stringify(settings));

    toast.success('تم حفظ الإعدادات بنجاح');
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Settings2 size={18} />
            </div>
            <h2 className="text-lg font-bold text-foreground">الإعدادات والطباعة</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 bg-muted/10 border-l border-border p-4 flex flex-col gap-1 overflow-y-auto shrink-0">
            <button type="button" onClick={() => setActiveTab('store')} className={`flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'store' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Store size={18} /> المتجر والفواتير
            </button>
            <button type="button" onClick={() => setActiveTab('printer')} className={`flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'printer' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Printer size={18} /> الطابعة
            </button>

            <button type="button" onClick={() => setActiveTab('users')} className={`flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Users size={18} /> المستخدمين
            </button>
            <button type="button" onClick={() => setActiveTab('backup')} className={`flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'backup' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Database size={18} /> النسخ الاحتياطي
            </button>
          </div>
          
          {/* Form Content */}
          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Store Info */}
              {activeTab === 'store' && (
                <section>
                  <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                    <Store size={16} /> بيانات المتجر (تظهر في الفاتورة)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-muted-foreground mb-2">اسم المحل</label>
                      <input 
                        value={settings.shopName} 
                        onChange={e => setSettings({...settings, shopName: e.target.value})} 
                        required
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-foreground font-bold" 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-muted-foreground mb-2">أرقام الهواتف</label>
                      <input 
                        value={settings.phone} 
                        onChange={e => setSettings({...settings, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-foreground font-bold" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-muted-foreground mb-2">العنوان</label>
                      <input 
                        value={settings.address} 
                        onChange={e => setSettings({...settings, address: e.target.value})}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-foreground font-bold" 
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-muted-foreground mb-2">سياسة الاسترجاع (تُطبع أسفل الفاتورة)</label>
                      <textarea 
                        rows={4}
                        value={settings.policy}
                        onChange={e => setSettings({...settings, policy: e.target.value})}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all font-bold" 
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Printer Settings */}
              {activeTab === 'printer' && (
                <section>
                  <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                    <Printer size={16} /> إعدادات الطباعة الأساسية
                  </h3>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-muted-foreground mb-2">نوع الطابعة الافتراضية</label>
                      <select 
                        value={settings.printerType}
                        onChange={e => setSettings({...settings, printerType: e.target.value})}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-foreground font-bold"
                      >
                        <option value="thermal">طابعة ريسيت حرارية (80mm)</option>
                        <option value="a4">طابعة عادية (A4)</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-2">اختر الطابعة التي يتم إرسال الأوامر إليها.</p>
                    </div>
                  </div>
                </section>
              )}


              {/* Users Settings */}
              {activeTab === 'users' && (
                <section>
                  <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                    <Users size={16} /> إدارة المستخدمين
                  </h3>
                  
                  <div className="bg-muted/30 p-4 rounded-xl border border-border mb-6">
                    <h4 className="text-sm font-bold mb-3">إضافة مستخدم جديد</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input 
                        type="text"
                        placeholder="اسم المستخدم"
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        className="px-4 py-2 bg-background border border-border rounded-lg outline-none font-bold text-sm"
                      />
                      <input 
                        type="password"
                        placeholder="كلمة المرور (PIN)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="px-4 py-2 bg-background border border-border rounded-lg outline-none font-bold text-sm"
                      />
                      <select 
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                        className="px-4 py-2 bg-background border border-border rounded-lg outline-none font-bold text-sm"
                      >
                        <option value="cashier">كاشير</option>
                        <option value="technician">فني صيانة</option>
                        <option value="admin">مدير (Admin)</option>
                      </select>
                      <button 
                        type="button"
                        onClick={handleAddUser}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg flex items-center justify-center gap-2 py-2"
                      >
                        <Plus size={18} /> إضافة
                      </button>
                    </div>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-right">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="p-3 text-sm font-bold text-muted-foreground">اسم المستخدم</th>
                          <th className="p-3 text-sm font-bold text-muted-foreground">الصلاحية</th>
                          <th className="p-3 text-sm font-bold text-muted-foreground w-20">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((u: User) => (
                          <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="p-3 font-bold">{u.username}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                u.role === 'technician' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {u.role === 'admin' ? 'مدير' : u.role === 'technician' ? 'فني صيانة' : 'كاشير'}
                              </span>
                            </td>
                            <td className="p-3">
                              {u.username !== 'admin' && (
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Backup Settings */}
              {activeTab === 'backup' && (
                <section>
                  <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                    <Database size={16} /> النسخ الاحتياطي للبيانات
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-muted/20 border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <Download size={32} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-1">تصدير نسخة احتياطية</h4>
                        <p className="text-sm text-muted-foreground">احفظ نسخة من جميع بياناتك (المنتجات، الفواتير، العملاء) في ملف آمن.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={exportDatabase}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl w-full transition-colors mt-2"
                      >
                        تحميل النسخة الاحتياطية
                      </button>
                    </div>

                    <div className="bg-muted/20 border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <Upload size={32} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-1">استعادة نسخة احتياطية</h4>
                        <p className="text-sm text-muted-foreground">قم برفع ملف نسخة احتياطية سابق لاسترجاع بياناتك. (سيتم مسح البيانات الحالية).</p>
                      </div>
                      <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl w-full transition-colors mt-2 cursor-pointer">
                        اختيار ملف النسخة...
                        <input 
                          type="file" 
                          accept=".json"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              importDatabase(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-border">
                    <h4 className="font-bold text-lg mb-4 text-primary">بيانات تجريبية (للمطورين)</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      يمكنك حقن بيانات تجريبية (أصناف، عملاء، فواتير، ورديات) لاختبار النظام. 
                      <strong>تحذير:</strong> تعمل هذه الميزة فقط إذا كانت قاعدة البيانات فارغة تماماً من الأصناف.
                    </p>
                    <button 
                      type="button"
                      onClick={handleInjectData}
                      className="bg-primary/20 text-primary hover:bg-primary/30 font-bold py-2 px-6 rounded-xl transition-colors"
                    >
                      حقن بيانات تجريبية (Dummy Data)
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border bg-muted/30 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold hover:bg-muted transition-colors text-foreground"
              >
                إلغاء
              </button>
              <button 
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-t border-blue-400/30 px-8 py-3 rounded-xl flex items-center gap-2 transition-all font-bold active:scale-95"
              >
                <Save className="w-5 h-5" /> حفظ التغييرات
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
