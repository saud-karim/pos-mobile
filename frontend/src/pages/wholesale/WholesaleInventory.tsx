import { useEffect, useState } from 'react';
import { Store, Plus, Search, Box, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { getWholesaleInventory, addWholesaleProduct, updateWholesaleProduct, deleteWholesaleProduct } from '../../lib/wholesaleQueries';
import toast from 'react-hot-toast';

export function WholesaleInventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    quantity: '',
    cost_price: '',
    selling_price: '',
    retail_price: '',
    min_stock: '0'
  });

  const loadData = async () => {
    try {
      const { data, total, limit } = await getWholesaleInventory(search, page, 20);
      setProducts(data);
      setTotalPages(Math.ceil(total / limit) || 1);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل المخزون');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, page]);

  const injectWholesaleTestItems = async () => {
    try {
      const testItems = [
        { name: 'شاحن أصلي (قطعة)', barcode: 'W1001', quantity: 500, cost_price: 50, selling_price: 60, retail_price: 70, min_stock: 20 },
        { name: 'جراب سيليكون (قطعة)', barcode: 'W1002', quantity: 1000, cost_price: 15, selling_price: 18, retail_price: 25, min_stock: 50 },
        { name: 'وصلة Type-C (قطعة)', barcode: 'W1003', quantity: 2000, cost_price: 15, selling_price: 17.5, retail_price: 25, min_stock: 100 },
        { name: 'شاشة آيفون 13 برو', barcode: 'W1004', quantity: 50, cost_price: 1500, selling_price: 1650, retail_price: 1800, min_stock: 5 }
      ];
      for (const item of testItems) {
        await addWholesaleProduct({ ...item, category: 'أخرى' });
      }
      toast.success('تمت إضافة الأصناف التجريبية');
      loadData();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDeleteProduct = async (product: any) => {
    if (!window.confirm(`هل أنت متأكد من حذف الصنف "${product.name}"؟`)) return;
    try {
      await deleteWholesaleProduct(product.id);
      toast.success('تم الحذف بنجاح');
      loadData();
    } catch (error: any) {
      console.error(error);
      toast.error('خطأ: ' + (error.message || String(error)));
    }
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setFormData({ name: '', barcode: '', quantity: '', cost_price: '', selling_price: '', retail_price: '', min_stock: '0' });
    setShowModal(true);
  };

  const handleOpenEdit = (product: any) => {
    setEditMode(true);
    setSelectedProductId(product.id);
    setFormData({
      name: product.name,
      barcode: product.barcode || '',
      quantity: product.quantity.toString(),
      cost_price: product.cost_price.toString(),
      selling_price: product.selling_price.toString(),
      retail_price: product.retail_price?.toString() || product.selling_price.toString(),
      min_stock: product.min_stock.toString()
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return toast.error('أدخل اسم المنتج');
    if (!formData.cost_price || Number(formData.cost_price) < 0) return toast.error('سعر التكلفة غير صحيح');
    if (!formData.selling_price || Number(formData.selling_price) < 0) return toast.error('سعر الجملة غير صحيح');
    if (!formData.retail_price || Number(formData.retail_price) < 0) return toast.error('سعر القطاعي غير صحيح');

    try {
      if (editMode && selectedProductId) {
        await updateWholesaleProduct(selectedProductId, {
          name: formData.name,
          category: 'أخرى',
          barcode: formData.barcode || null,
          cost_price: Number(formData.cost_price),
          selling_price: Number(formData.selling_price),
          retail_price: Number(formData.retail_price),
          min_stock: Number(formData.min_stock)
        });
        toast.success('تم التعديل بنجاح');
      } else {
        if (!formData.quantity || Number(formData.quantity) < 0) return toast.error('الكمية غير صحيحة');
        await addWholesaleProduct({
          name: formData.name,
          category: 'أخرى',
          barcode: formData.barcode || null,
          quantity: Number(formData.quantity),
          cost_price: Number(formData.cost_price),
          selling_price: Number(formData.selling_price),
          retail_price: Number(formData.retail_price),
          min_stock: Number(formData.min_stock)
        });
        toast.success('تمت إضافة المنتج بنجاح');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Store className="w-6 h-6" />
          </div>
          مخزن الجملة
        </h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث في المخزن..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-4 pr-10 py-2.5 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 shrink-0 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" /> إضافة صنف
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-4 font-bold">الصنف</th>
                  <th className="p-4 font-bold">الباركود</th>
                  <th className="p-4 font-bold">الكمية المتاحة</th>
                  <th className="p-4 font-bold">سعر الشراء (عليك)</th>
                  <th className="p-4 font-bold text-amber-600">سعر البيع (للجملة)</th>
                  <th className="p-4 font-bold text-emerald-600">سعر البيع (قطاعي)</th>
                  <th className="p-4 font-bold">إجمالي التكلفة</th>
                  <th className="p-4 font-bold">تعديل</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">لا يوجد بضاعة في مخزن الجملة</td>
                  </tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4 font-bold">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-indigo-500" />
                          {p.name}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground font-mono">{p.barcode || '---'}</td>
                      <td className="p-4 font-bold">
                        <span className={p.quantity <= p.min_stock ? 'text-rose-500 flex items-center gap-1' : ''}>
                          {p.quantity <= p.min_stock && <AlertCircle className="w-4 h-4" />}
                          {p.quantity}
                        </span>
                      </td>
                      <td className="p-4 text-emerald-600 font-bold">{p.cost_price.toLocaleString()} ج.م</td>
                      <td className="p-4 text-amber-600 font-bold">{p.selling_price.toLocaleString()} ج.م</td>
                      <td className="p-4 text-emerald-600 font-bold">{p.retail_price?.toLocaleString() || p.selling_price.toLocaleString()} ج.م</td>
                      <td className="p-4 font-bold">{(p.quantity * p.cost_price).toLocaleString()} ج.م</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-2 text-blue-500 hover:bg-blue-500/10 transition-colors bg-muted rounded-lg"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-2 text-rose-500 hover:bg-rose-500/10 transition-colors bg-muted rounded-lg"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-center gap-2 bg-muted/20">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                السابق
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl font-bold border transition-colors ${page === p
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-card border-border hover:bg-muted text-foreground'
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg p-6 rounded-2xl border border-border shadow-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
              <Box className="w-6 h-6" /> {editMode ? 'تعديل صنف' : 'إضافة صنف جديد لمخزن الجملة'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold mb-2">اسم الصنف</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">الباركود (اختياري)</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">الكمية الابتدائية</label>
                <input
                  type="number"
                  disabled={editMode}
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  placeholder={editMode ? "لا يمكن تعديلها من هنا" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">سعر الشراء (التكلفة عليك)</label>
                <input
                  type="number"
                  value={formData.cost_price}
                  onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-amber-600">سعر البيع للجملة (للتجار/المحلات)</label>
                <input
                  type="number"
                  value={formData.selling_price}
                  onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-amber-500/30 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-emerald-600">سعر البيع القطاعي (للكاشير)</label>
                <input
                  type="number"
                  value={formData.retail_price}
                  onChange={e => setFormData({ ...formData, retail_price: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-emerald-500/30 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-600"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold mb-2">حد النواقص التنبيهي</label>
                <input
                  type="number"
                  value={formData.min_stock}
                  onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl hover:bg-muted font-bold">إلغاء</button>
              <button onClick={handleSubmit} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90">
                حفظ الصنف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
