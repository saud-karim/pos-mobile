import { useEffect, useState } from 'react';
import { FileSpreadsheet, Search, Eye, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { 
  getWholesaleOrders, 
  getWholesaleOrderItems, 
  createWholesaleOrder, 
  getWholesaleMerchants, 
  getWholesaleInventory 
} from '../../lib/wholesaleQueries';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export function WholesaleOrders() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Merchants & Inventory for new order
  const [merchants, setMerchants] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  // View Order Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  // New Order Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [orderType, setOrderType] = useState<'sale' | 'purchase'>('sale');
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [merchantSearch, setMerchantSearch] = useState('');
  const [showMerchantDropdown, setShowMerchantDropdown] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  
  const [cart, setCart] = useState<{ product: any, quantity: number, unit_price: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number | ''>('');
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const loadData = async () => {
    try {
      const data = await getWholesaleOrders();
      setOrders(data);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل الفواتير');
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const m = await getWholesaleMerchants(undefined, 1, 1000); // load all for dropdown
      const i = await getWholesaleInventory('', 1, 1000); // load all for dropdown
      setMerchants(m.data);
      setInventory(i.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadData();
    loadDependencies();
  }, []);

  const handleOpenView = async (order: any) => {
    setSelectedOrder(order);
    try {
      const items = await getWholesaleOrderItems(order.id);
      setOrderItems(items);
      setShowViewModal(true);
    } catch (error) {
      toast.error('فشل في تحميل تفاصيل الفاتورة');
    }
  };

  const handleOpenAdd = (type: 'sale' | 'purchase') => {
    setOrderType(type);
    setSelectedMerchantId('');
    setMerchantSearch('');
    setShowMerchantDropdown(false);
    setPaidAmount('');
    setCart([]);
    setSelectedProductId('');
    setItemQuantity('');
    setItemPrice('');
    setProductSearch('');
    setShowProductDropdown(false);
    setShowAddModal(true);
  };

  const handleAddToCart = () => {
    if (!selectedProductId) return toast.error('اختر الصنف');
    if (!itemQuantity || itemQuantity <= 0) return toast.error('أدخل كمية صحيحة');
    if (!itemPrice || itemPrice <= 0) return toast.error('أدخل سعر صحيح');

    const product = inventory.find(p => p.id === Number(selectedProductId));
    if (!product) return;

    if (orderType === 'sale' && product.quantity < itemQuantity) {
      return toast.error('الكمية المتاحة في المخزن لا تكفي');
    }

    setCart([...cart, { product, quantity: Number(itemQuantity), unit_price: Number(itemPrice) }]);
    setSelectedProductId('');
    setItemQuantity('');
    setItemPrice('');
    setProductSearch('');
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const handleSubmitOrder = async () => {
    if (!selectedMerchantId) return toast.error('اختر التاجر/المحل');
    if (cart.length === 0) return toast.error('أضف أصنافاً للفاتورة');
    if (paidAmount === '' || paidAmount < 0) return toast.error('أدخل المبلغ المدفوع بشكل صحيح');
    if (paidAmount > totalAmount) return toast.error('المبلغ المدفوع أكبر من إجمالي الفاتورة!');

    const items = cart.map(item => ({
      id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.product.cost_price // Snapshot of cost
    }));

    try {
      await createWholesaleOrder(
        Number(selectedMerchantId),
        user!.id,
        orderType,
        items,
        totalAmount,
        Number(paidAmount)
      );
      toast.success('تم حفظ الفاتورة بنجاح');
      setShowAddModal(false);
      loadData();
      loadDependencies(); // refresh inventory
    } catch (error: any) {
      console.error(error);
      toast.error('خطأ: ' + error.message);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.merchant_name.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toString().includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          فواتير الجملة
        </h2>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="بحث برقم الفاتورة أو اسم التاجر..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button 
            onClick={() => handleOpenAdd('sale')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shrink-0 transition-colors"
          >
            <ArrowUpRight className="w-5 h-5" /> فاتورة بيع
          </button>
          <button 
            onClick={() => handleOpenAdd('purchase')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 shrink-0 transition-colors"
          >
            <ArrowDownRight className="w-5 h-5" /> فاتورة شراء
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
                  <th className="p-4 font-bold">رقم</th>
                  <th className="p-4 font-bold">التاريخ</th>
                  <th className="p-4 font-bold">النوع</th>
                  <th className="p-4 font-bold">التاجر / المحل</th>
                  <th className="p-4 font-bold">الإجمالي</th>
                  <th className="p-4 font-bold">المدفوع</th>
                  <th className="p-4 font-bold">المتبقي (آجل)</th>
                  <th className="p-4 font-bold">المستخدم</th>
                  <th className="p-4 font-bold">عرض</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">لا توجد فواتير مسجلة</td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4 font-bold">#{order.id}</td>
                      <td className="p-4">{new Date(order.created_at).toLocaleString('ar-EG')}</td>
                      <td className="p-4">
                        <span className={"px-2 py-1 rounded-md text-xs font-bold " + (order.type === 'sale' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600')}>
                          {order.type === 'sale' ? 'بيع لمحلات' : 'شراء بضاعة'}
                        </span>
                      </td>
                      <td className="p-4 font-bold">{order.merchant_name}</td>
                      <td className="p-4 font-bold text-blue-600">{order.total_amount.toLocaleString()} ج.م</td>
                      <td className="p-4 text-emerald-600">{order.paid_amount.toLocaleString()} ج.م</td>
                      <td className="p-4 text-rose-600">{(order.total_amount - order.paid_amount).toLocaleString()} ج.م</td>
                      <td className="p-4">{order.user_name}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleOpenView(order)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors bg-muted rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl p-6 rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary">
              <FileSpreadsheet className="w-6 h-6" /> تفاصيل فاتورة #{selectedOrder.id}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6 bg-muted p-4 rounded-xl text-sm">
              <div><span className="text-muted-foreground">التاريخ:</span> <span className="font-bold">{new Date(selectedOrder.created_at).toLocaleString('ar-EG')}</span></div>
              <div><span className="text-muted-foreground">النوع:</span> <span className="font-bold">{selectedOrder.type === 'sale' ? 'بيع لمحلات' : 'شراء من مورد'}</span></div>
              <div><span className="text-muted-foreground">التاجر:</span> <span className="font-bold">{selectedOrder.merchant_name}</span></div>
              <div><span className="text-muted-foreground">المستخدم:</span> <span className="font-bold">{selectedOrder.user_name}</span></div>
            </div>

            <div className="flex-1 overflow-y-auto border border-border rounded-xl mb-4">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-3">الصنف</th>
                    <th className="p-3">الكمية</th>
                    <th className="p-3">سعر الوحدة</th>
                    <th className="p-3">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map(item => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="p-3 font-bold">{item.product_name}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">{item.unit_price.toLocaleString()}</td>
                      <td className="p-3 font-bold">{(item.quantity * item.unit_price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-500/10 p-4 rounded-xl text-center">
                <p className="text-xs text-blue-600 font-bold mb-1">الإجمالي</p>
                <p className="font-black text-blue-700 text-lg">{selectedOrder.total_amount.toLocaleString()} ج.م</p>
              </div>
              <div className="bg-emerald-500/10 p-4 rounded-xl text-center">
                <p className="text-xs text-emerald-600 font-bold mb-1">المدفوع</p>
                <p className="font-black text-emerald-700 text-lg">{selectedOrder.paid_amount.toLocaleString()} ج.م</p>
              </div>
              <div className="bg-rose-500/10 p-4 rounded-xl text-center">
                <p className="text-xs text-rose-600 font-bold mb-1">المتبقي (آجل)</p>
                <p className="font-black text-rose-700 text-lg">{(selectedOrder.total_amount - selectedOrder.paid_amount).toLocaleString()} ج.م</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setShowViewModal(false)} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-4xl p-6 rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
            <h3 className={"text-xl font-bold mb-6 flex items-center gap-2 shrink-0 " + (orderType === 'sale' ? 'text-emerald-600' : 'text-rose-600')}>
              {orderType === 'sale' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
              {orderType === 'sale' ? 'إنشاء فاتورة بيع جديدة' : 'إنشاء فاتورة شراء جديدة'}
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="col-span-1 border-l border-border pl-6">
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">اختر {orderType === 'sale' ? 'العميل (المحل)' : 'المورد'}</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="ابحث عن اسم التاجر/المحل..."
                      value={merchantSearch}
                      onChange={e => {
                        setMerchantSearch(e.target.value);
                        setSelectedMerchantId(''); 
                        setShowMerchantDropdown(true);
                      }}
                      onFocus={() => setShowMerchantDropdown(true)}
                      onBlur={() => setTimeout(() => setShowMerchantDropdown(false), 200)}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                    {showMerchantDropdown && (
                      <div className="absolute top-full right-0 left-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                        {merchants.filter(m => (orderType === 'sale' ? (m.type === 'client' || m.type === 'both') : (m.type === 'supplier' || m.type === 'both')) && m.name.toLowerCase().includes(merchantSearch.toLowerCase())).map(m => (
                          <div 
                            key={m.id} 
                            onMouseDown={() => {
                              setSelectedMerchantId(m.id.toString());
                              setMerchantSearch(m.name);
                              setShowMerchantDropdown(false);
                            }}
                            className="px-4 py-3 hover:bg-muted cursor-pointer text-sm border-b border-border last:border-0 font-medium"
                          >
                            {m.name}
                          </div>
                        ))}
                        {merchants.filter(m => (orderType === 'sale' ? (m.type === 'client' || m.type === 'both') : (m.type === 'supplier' || m.type === 'both')) && m.name.toLowerCase().includes(merchantSearch.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-sm text-muted-foreground text-center">لا توجد نتائج</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4 p-4 bg-muted rounded-xl space-y-3">
                  <label className="block text-sm font-bold text-primary border-b border-border pb-2">إضافة صنف للفاتورة</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="ابحث عن الصنف..."
                      value={productSearch}
                      onChange={e => {
                        setProductSearch(e.target.value);
                        setSelectedProductId(''); // reset selection if typing
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-sm"
                    />
                    {showProductDropdown && (
                      <div className="absolute top-full right-0 left-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                        {inventory.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                          <div 
                            key={p.id} 
                            onMouseDown={() => {
                              setSelectedProductId(p.id.toString());
                              setProductSearch(p.name);
                              setShowProductDropdown(false);
                              setItemPrice(orderType === 'sale' ? p.selling_price : p.cost_price);
                              setItemQuantity(1);
                            }}
                            className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border last:border-0"
                          >
                            {p.name} (المتاح: {p.quantity})
                          </div>
                        ))}
                        {inventory.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground text-center">لا توجد نتائج</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">الكمية</label>
                      <input 
                        type="number"
                        value={itemQuantity}
                        onChange={e => setItemQuantity(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">السعر</label>
                      <input 
                        type="number"
                        value={itemPrice}
                        onChange={e => setItemPrice(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-sm"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAddToCart}
                    className="w-full py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg font-bold transition-colors text-sm"
                  >
                    إضافة للقائمة
                  </button>
                </div>

                <div className="bg-blue-500/10 p-4 rounded-xl mb-4">
                  <label className="block text-sm font-bold text-blue-700 mb-2">إجمالي الفاتورة</label>
                  <p className="text-2xl font-black text-blue-700">{totalAmount.toLocaleString()} ج.م</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">المبلغ المدفوع الان</label>
                  <input 
                    type="number"
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-2">الباقي ({(totalAmount - Number(paidAmount)).toLocaleString()} ج.م) سيتم تسجيله كدين تلقائياً.</p>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex flex-col">
                <label className="block text-sm font-bold mb-2">أصناف الفاتورة ({cart.length})</label>
                <div className="flex-1 border border-border rounded-xl overflow-y-auto bg-muted/30">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-muted text-muted-foreground sticky top-0">
                      <tr>
                        <th className="p-3">الصنف</th>
                        <th className="p-3">الكمية</th>
                        <th className="p-3">السعر</th>
                        <th className="p-3">الإجمالي</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">لم يتم إضافة أصناف بعد</td>
                        </tr>
                      ) : (
                        cart.map((item, index) => (
                          <tr key={index} className="border-b border-border bg-card">
                            <td className="p-3 font-bold">{item.product.name}</td>
                            <td className="p-3 font-mono">{item.quantity}</td>
                            <td className="p-3 font-mono">{item.unit_price.toLocaleString()}</td>
                            <td className="p-3 font-bold text-primary">{(item.quantity * item.unit_price).toLocaleString()}</td>
                            <td className="p-3 text-left">
                              <button 
                                onClick={() => handleRemoveFromCart(index)}
                                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-border shrink-0 bg-card">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl hover:bg-muted font-bold">إلغاء</button>
              <button 
                onClick={handleSubmitOrder} 
                className={"px-8 py-2 rounded-xl font-bold text-white transition-colors " + (orderType === 'sale' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700')}
              >
                اعتماد وحفظ الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
