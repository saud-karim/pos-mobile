import { useState, useEffect } from 'react';
import { ShoppingCart, Search, UserPlus, CreditCard, Banknote, Trash2, X } from 'lucide-react';
import { CartItem, createInvoice, searchProductsPos, getPosQuickItems, getProductByBarcode } from '../lib/posQueries';
import { Product } from '../lib/inventoryQueries';
import { getCustomers, Customer } from '../lib/customersQueries';
import { useAuthStore } from '../store/authStore';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { printReceipt } from '../lib/printUtils';
import { getCurrentShift } from '../lib/shiftQueries';
import toast from 'react-hot-toast';

export function POS() {
  const user = useAuthStore(state => state.user);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quickItems, setQuickItems] = useState<Product[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  // Customer State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);

  // Payment State
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState<number | ''>(''); // For partial payments / debt

  const total = cart.reduce((acc, item) => acc + item.selling_price * item.cart_quantity, 0);
  const finalTotal = total - discount;

  // Global Barcode Scanner listener
  useBarcodeScanner(async (barcode) => {
    try {
      const product = await getProductByBarcode(barcode);
      if (product) {
        addToCart(product);
      } else {
        toast.error('لم يتم العثور على منتج بهذا الباركود');
      }
    } catch (err) {
      console.error(err);
    }
  });

  useEffect(() => {
    loadQuickItems();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      searchProductsPos(searchQuery).then(setSearchResults).catch(console.error);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadQuickItems = async () => {
    try {
      const items = await getPosQuickItems();
      setQuickItems(items);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(c => c.id === product.id);
    if (existing) {
      if (existing.cart_quantity >= product.stock_quantity) {
        toast.error('الكمية المطلوبة أكبر من المخزون المتاح');
        return;
      }
      setCart(cart.map(c => c.id === product.id ? { ...c, cart_quantity: c.cart_quantity + 1 } : c));
    } else {
      if (product.stock_quantity <= 0) {
        toast.error('هذا المنتج غير متوفر في المخزن');
        return;
      }
      setCart([...cart, { ...product, cart_quantity: 1 }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQty = c.cart_quantity + delta;
        if (newQty > c.stock_quantity) {
          toast.error('الكمية غير متاحة في المخزن');
          return c;
        }
        if (newQty <= 0) return c;
        return { ...c, cart_quantity: newQty };
      }
      return c;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const handleCheckout = async (paymentMethod: string) => {
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    const actualPaid = paidAmount === '' ? finalTotal : Number(paidAmount);

    if (actualPaid < finalTotal && !selectedCustomer) {
      toast.error('لا يمكن عمل فاتورة آجلة (دين) بدون اختيار العميل أولاً');
      return;
    }

    try {
      // Check for open shift
      const shift = await getCurrentShift(user.id);
      if (!shift) {
        toast.error('يجب فتح وردية أولاً من القائمة العلوية قبل إجراء أي مبيعات');
        return;
      }

      const invoiceId = await createInvoice(
        selectedCustomer?.id || null,
        user.id,
        cart,
        total,
        discount,
        actualPaid,
        paymentMethod
      );

      // Print Receipt
      printReceipt({
        invoiceId: Number(invoiceId),
        date: new Date().toLocaleString('ar-EG'),
        cashierName: user.username,
        customerName: selectedCustomer?.name,
        items: cart.map(c => ({ name: c.name, quantity: c.cart_quantity, price: c.selling_price })),
        subTotal: total,
        discount: discount,
        finalTotal: finalTotal,
        paidAmount: actualPaid,
        paymentMethod
      });

      toast.success('تم إنشاء الفاتورة بنجاح');
      setCart([]);
      setDiscount(0);
      setPaidAmount('');
      setSelectedCustomer(null);
      loadQuickItems();
    } catch (error: any) {
      toast.error('حدث خطأ أثناء الدفع: ' + error.message);
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Products Grid (Left Side) */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="flex gap-4 relative">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث بالباركود أو الاسم السريع..."
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-3 text-lg bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-10 max-h-60 overflow-y-auto">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full text-right p-4 hover:bg-muted border-b border-border flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div className="font-bold text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.barcode || p.imei}</div>
                    </div>
                    <span className="text-primary font-black">{p.selling_price} ج.م</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Items Grid */}
        <div className="flex-1 bg-card rounded-2xl border border-border p-6 overflow-y-auto shadow-sm">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {quickItems.length === 0 && <div className="col-span-full text-center text-slate-500 py-10">المخزن فارغ أو تم بيع كافة المنتجات</div>}
            {quickItems.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="flex flex-col items-center justify-center p-4 border border-border rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all active:scale-95"
              >
                <div className="w-14 h-14 bg-muted rounded-full mb-3 flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7 text-muted-foreground" />
                </div>
                <span className="text-sm font-bold text-center line-clamp-2 leading-tight text-foreground">{item.name}</span>
                <span className="text-primary font-black mt-2 text-sm">{item.selling_price} ج.م</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart (Right Side) */}
      <div className="w-[400px] bg-card rounded-2xl border border-border flex flex-col shadow-sm">

        {/* Customer Select */}
        <div className="relative">
          <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <UserPlus className={`w-6 h-6 ${selectedCustomer ? 'text-emerald-500' : 'text-primary'}`} />
              <span className="font-bold text-base text-foreground">
                {selectedCustomer ? selectedCustomer.name : 'عميل نقدي (طياري)'}
              </span>
            </div>
            {selectedCustomer ? (
              <button onClick={() => setSelectedCustomer(null)} className="text-destructive hover:bg-destructive/10 p-1 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => setShowCustomerSelect(!showCustomerSelect)} className="text-sm font-bold text-primary hover:underline">
                تغيير العميل
              </button>
            )}
          </div>

          {showCustomerSelect && (
            <div className="absolute top-full left-0 right-0 bg-card border border-border shadow-2xl z-20 max-h-64 overflow-y-auto">
              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCustomer(c); setShowCustomerSelect(false); }}
                  className="w-full text-right px-5 py-3 hover:bg-muted border-b border-border transition-colors"
                >
                  <div className="font-bold text-sm text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone || 'بدون هاتف'}</div>
                </button>
              ))}
              <div className="p-3">
                <button onClick={() => window.location.hash = '#/customers'} className="w-full text-center font-bold text-primary py-3 hover:bg-primary/10 rounded-xl transition-colors">
                  + إضافة عميل جديد
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 && <div className="text-center text-muted-foreground font-bold py-10">السلة فارغة</div>}
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex-1">
                <h4 className="font-bold text-foreground line-clamp-1">{item.name}</h4>
                <div className="text-muted-foreground font-medium text-sm mt-1">{item.selling_price} ج.م</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-xl overflow-hidden bg-muted">
                  <button onClick={() => updateQuantity(item.id!, 1)} className="px-3 py-1.5 hover:bg-background transition-colors font-bold">+</button>
                  <span className="px-2 font-black w-8 text-center">{item.cart_quantity}</span>
                  <button onClick={() => updateQuantity(item.id!, -1)} className="px-3 py-1.5 hover:bg-background transition-colors font-bold">-</button>
                </div>
                <button onClick={() => removeFromCart(item.id!)} className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals & Payment */}
        <div className="p-5 border-t border-border bg-muted/30 rounded-b-2xl">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm font-bold text-muted-foreground">
              <span>الإجمالي الفرعي</span>
              <span>{total} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-muted-foreground">
              <span>الخصم</span>
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(Number(e.target.value))}
                className="w-24 text-center border border-border rounded-lg px-2 py-1 text-destructive font-black bg-background focus:ring-2 focus:ring-destructive outline-none transition-all"
              />
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <span className="font-black text-foreground">الإجمالي النهائي</span>
              <span className="font-black text-3xl text-emerald-600 dark:text-emerald-400">{finalTotal} ج.م</span>
            </div>

            {/* Payment Input (For partial payment / debt) */}
            <div className="flex justify-between items-center pt-2 mt-4 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
              <span className="text-sm font-black text-orange-600">المدفوع نقداً</span>
              <input
                type="number"
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={finalTotal.toString()}
                className="w-28 text-center border border-orange-500/30 rounded-lg px-2 py-1.5 bg-background font-black text-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
            {Number(paidAmount) < finalTotal && selectedCustomer && (
              <div className="text-sm text-destructive text-center font-black mt-2">
                سيتم إضافة {finalTotal - Number(paidAmount)} ج.م على حساب العميل
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleCheckout('cash')} className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-t border-blue-400/30 py-4 rounded-xl font-black transition-all active:scale-95">
              <Banknote className="w-6 h-6" /> دفع كاش وطباعة
            </button>
            <button onClick={() => handleCheckout('visa')} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black transition-colors shadow-md active:scale-95">
              <CreditCard className="w-6 h-6" /> فيزا / محفظة وطباعة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
