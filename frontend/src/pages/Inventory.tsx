import React, { useState, useEffect } from 'react';
import { Plus, Search, Tag, Smartphone, AlertTriangle, RefreshCw, X, Package } from 'lucide-react';
import { getProducts, getCategories, addProduct, Product, Category } from '../lib/inventoryQueries';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { exportToExcel } from '../lib/exportUtils';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

export function Inventory() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Product Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', category_id: 3, barcode: '', imei: '', cost_price: 0, selling_price: 0, stock_quantity: 0, min_stock: 0
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const cats = await getCategories();
      setCategories(cats);
      
      const prods = await getProducts(undefined, searchQuery);
      setProducts(prods);
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  // Global Barcode Scanner listener
  useBarcodeScanner((barcode) => {
    if (showAddForm) {
      setNewProduct(prev => ({ ...prev, barcode }));
      toast.success('تم لقط الباركود');
    } else {
      setSearchQuery(barcode);
    }
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addProduct(newProduct as Product);
      toast.success('تمت إضافة المنتج بنجاح');
      setShowAddForm(false);
      setNewProduct({ name: '', category_id: 3, barcode: '', imei: '', cost_price: 0, selling_price: 0, stock_quantity: 0, min_stock: 0 });
      loadData();
    } catch (error: any) {
      toast.error('حدث خطأ: ' + error.message);
    }
  };

  const handleExport = () => {
    if (products.length === 0) return toast.error('لا يوجد منتجات لتصديرها');
    const exportData = products.map(p => ({
      'الباركود': p.barcode || '-',
      'الاسم': p.name,
      'الفئة': p.category_name || '-',
      'سعر التكلفة': p.cost_price,
      'سعر البيع': p.selling_price,
      'الكمية المتاحة': p.stock_quantity,
      'الحد الأدنى': p.min_stock
    }));
    exportToExcel(exportData, 'جرد_المخزن');
    toast.success('تم تصدير المخزن بنجاح');
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">إدارة المخزون</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-sm"
          >
            <Download className="w-5 h-5" />
            <span>تصدير جرد Excel</span>
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>{showAddForm ? 'إلغاء الإضافة' : 'إضافة منتج'}</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <form onSubmit={handleAddProduct} className="bg-card w-full max-w-3xl rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted/30">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" /> إضافة منتج جديد
              </h2>
              <button type="button" onClick={() => setShowAddForm(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 font-medium">اسم المنتج</label>
                <input required type="text" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">الفئة</label>
                <select className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={newProduct.category_id} onChange={e => setNewProduct({...newProduct, category_id: Number(e.target.value)})}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">الباركود</label>
                <input type="text" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newProduct.barcode || ''} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm mb-2 font-medium">الكمية في المخزن</label>
                <input required type="number" min="0" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newProduct.stock_quantity} onChange={e => setNewProduct({...newProduct, stock_quantity: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">سعر التكلفة (شراء)</label>
                <input required type="number" min="0" step="0.01" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newProduct.cost_price} onChange={e => setNewProduct({...newProduct, cost_price: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">سعر البيع</label>
                <input required type="number" min="0" step="0.01" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newProduct.selling_price} onChange={e => setNewProduct({...newProduct, selling_price: Number(e.target.value)})} />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3 mt-auto">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 rounded-xl font-bold hover:bg-muted transition-colors text-foreground">
                إلغاء
              </button>
              <button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-t border-blue-400/30 px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
                حفظ في المخزن
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--border)]">
        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'products' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
        >
          <Tag className="w-4 h-4" /> الأصناف والإكسسوارات
        </button>
        <button 
          onClick={() => setActiveTab('used_phones')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'used_phones' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
        >
          <Smartphone className="w-4 h-4" /> شراء الهواتف المستعملة
        </button>
        <button 
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'alerts' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
        >
          <AlertTriangle className="w-4 h-4" /> تنبيهات النواقص
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm min-h-[500px]">
        {/* Toolbar */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute right-3 top-3 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="البحث بالاسم أو الباركود أو الـ IMEI..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
            />
          </div>
          <button onClick={loadData} className="p-2.5 border border-border rounded-xl hover:bg-muted text-muted-foreground">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-4 px-4 font-medium">الباركود/IMEI</th>
                  <th className="py-4 px-4 font-medium">اسم المنتج</th>
                  <th className="py-4 px-4 font-medium">الفئة</th>
                  <th className="py-4 px-4 font-medium">الكمية</th>
                  <th className="py-4 px-4 font-medium">سعر التكلفة</th>
                  <th className="py-4 px-4 font-medium">سعر البيع</th>
                  <th className="py-4 px-4 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد منتجات في المخزن</td></tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground text-sm font-mono">{p.barcode || p.imei || '-'}</td>
                      <td className="py-3 px-4 font-bold">{p.name}</td>
                      <td className="py-3 px-4"><span className="bg-muted text-foreground px-2 py-1 rounded-md text-xs">{p.category_name}</span></td>
                      <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">{p.stock_quantity}</td>
                      <td className="py-3 px-4 text-muted-foreground font-medium">{p.cost_price} ج.م</td>
                      <td className="py-3 px-4 font-black text-primary">{p.selling_price} ج.م</td>
                      <td className="py-3 px-4">
                        <button className="text-blue-500 hover:text-blue-600 hover:underline font-medium">تعديل</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
