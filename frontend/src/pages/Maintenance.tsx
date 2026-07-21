import React, { useState, useEffect } from 'react';
import { Plus, Search, Wrench, X, Trash2 } from 'lucide-react';
import { getMaintenanceJobs, addMaintenanceJob, updateMaintenanceStatus, MaintenanceJob, getMaintenanceParts, addMaintenancePart, removeMaintenancePart, MaintenancePart, getSpareParts, deleteMaintenanceJob } from '../lib/maintenanceQueries';
import { getCustomers } from '../lib/customersQueries';
import { useAuthStore } from '../store/authStore';
import { printMaintenanceTicket } from '../lib/printUtils';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

export function Maintenance() {
  const user = useAuthStore(state => state.user);
  const [activeStatus, setActiveStatus] = useState('all');
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);

  
  // Add Job Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJob, setNewJob] = useState<Partial<MaintenanceJob>>({
    device_model: '', issue_description: '', estimated_cost: 0, status: 'pending', customer_id: undefined
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);

  // Details Modal State
  const [showDetails, setShowDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<MaintenanceJob | null>(null);
  const [jobParts, setJobParts] = useState<MaintenancePart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [laborFee, setLaborFee] = useState<number>(0);
  const [partQuantity, setPartQuantity] = useState<number>(1);
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [isAlreadyDelivered, setIsAlreadyDelivered] = useState(false);

  const statuses = [
    { id: 'all', label: 'الكل' },
    { id: 'pending', label: 'قيد الانتظار' },
    { id: 'in_progress', label: 'جاري العمل' },
    { id: 'ready', label: 'جاهز للتسليم' },
    { id: 'delivered', label: 'تم التسليم' },
  ];

  useEffect(() => {
    loadJobs();
    loadCustomersAndParts();
  }, [activeStatus]);

  const loadCustomersAndParts = async () => {
    try {
      const { data } = await getCustomers();
      setCustomers(data);
      const parts = await getSpareParts();
      setSpareParts(parts);
    } catch (err) {}
  };

  const loadJobs = async () => {
    try {
      const data = await getMaintenanceJobs(activeStatus);
      setJobs(data);
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const id = await addMaintenanceJob({
        ...newJob,
        user_id: user.id,
        status: 'pending',
      } as MaintenanceJob);
      
      toast.success('تم تسجيل الجهاز بنجاح');
      
      // Print ticket
      const customer = customers.find(c => c.id === Number(newJob.customer_id));
      printMaintenanceTicket({
        jobId: Number(id),
        date: new Date().toLocaleString('ar-EG'),
        customerName: customer ? customer.name : 'عميل نقدي',
        customerPhone: customer ? (customer.phone || '-') : '-',
        deviceModel: newJob.device_model || '',
        issueDescription: newJob.issue_description || '',
        estimatedCost: newJob.estimated_cost || 0
      });

      setShowAddForm(false);
      setNewJob({ device_model: '', issue_description: '', estimated_cost: 0, status: 'pending', customer_id: undefined });
      setCustomerSearch('');
      setShowCustomerDropdown(false);
      loadJobs();
    } catch (err: any) {
      toast.error('حدث خطأ: ' + err.message);
    }
  };

  const handlePrint = (job: MaintenanceJob) => {
    printMaintenanceTicket({
      jobId: job.id!,
      date: new Date(job.created_at || '').toLocaleString('ar-EG') || new Date().toLocaleString('ar-EG'),
      customerName: job.customer_name || 'عميل نقدي',
      customerPhone: job.customer_phone || '-',
      deviceModel: job.device_model,
      issueDescription: job.issue_description,
      estimatedCost: job.estimated_cost
    });
  };

  const handleOpenDetails = async (job: MaintenanceJob) => {
    setSelectedJob(job);
    setLaborFee((job.final_cost || 0) - (job.spare_parts_cost || 0));
    setPaidAmount('');
    setIsAlreadyDelivered(job.status === 'delivered');
    try {
      const parts = await getMaintenanceParts(job.id!);
      setJobParts(parts);
      setShowDetails(true);
    } catch (error) {
      toast.error('فشل في تحميل تفاصيل الجهاز');
    }
  };

  const handleAddPartToJob = async () => {
    if (!selectedJob || !selectedPartId) return;
    const part = spareParts.find(p => p.id === Number(selectedPartId));
    if (!part) return;
    if (part.stock_quantity < partQuantity) return toast.error('الكمية المطلوبة غير متوفرة في المخزن');

    try {
      await addMaintenancePart(selectedJob.id!, part.id, partQuantity, part.selling_price);
      toast.success('تمت إضافة القطعة بنجاح');
      
      const parts = await getMaintenanceParts(selectedJob.id!);
      setJobParts(parts);
      setSelectedPartId('');
      setProductSearch('');
      setPartQuantity(1);
      
      loadCustomersAndParts();
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة القطعة');
    }
  };

  const handleRemovePart = async (partId: number, productId: number, qty: number) => {
    try {
      await removeMaintenancePart(partId, productId, qty);
      toast.success('تم إزالة القطعة');
      const parts = await getMaintenanceParts(selectedJob!.id!);
      setJobParts(parts);
      loadCustomersAndParts();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedJob || !user) return;
    try {
      const totalPartsCost = jobParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
      const finalCost = totalPartsCost + Number(laborFee);
      
      let actualPaid = paidAmount === '' ? finalCost : Number(paidAmount);

      if (selectedJob.status === 'delivered') {
        if (actualPaid < finalCost && !selectedJob.customer_id) {
          toast.error('لا يمكن تسجيل دين على عميل نقدي. يرجى سداد كامل المبلغ أو ربط الجهاز بعميل مسجل.');
          return;
        }
      }
      
      await updateMaintenanceStatus(
        selectedJob.id!, 
        selectedJob.status, 
        user.id,
        finalCost, 
        totalPartsCost,
        actualPaid,
        selectedJob.customer_id
      );
      toast.success('تم حفظ التعديلات');
      setShowDetails(false);
      loadJobs();
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDeleteJob = async (job: MaintenanceJob) => {
    const result = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم حذف هذا الجهاز بشكل نهائي وإرجاع أي قطع غيار مسحوبة تلقائياً إلى المخزن.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      try {
        await deleteMaintenanceJob(job.id!);
        toast.success('تم الحذف بنجاح');
        loadJobs();
        loadCustomersAndParts();
      } catch (err: any) {
        toast.error('حدث خطأ أثناء الحذف: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">قسم الصيانة</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{showAddForm ? 'إلغاء' : 'استلام جهاز جديد'}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <form onSubmit={handleAddJob} className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted/30">
              <h3 className="text-xl font-black text-primary flex items-center gap-2">
                <Wrench className="w-6 h-6" /> تسجيل استلام جهاز للصيانة
              </h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 relative">
                <label className="block text-sm mb-2 font-medium">العميل (اختياري)</label>
                <input 
                  type="text"
                  placeholder="ابحث عن اسم أو هاتف العميل..."
                  value={customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    setNewJob({...newJob, customer_id: undefined}); 
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                />
                {showCustomerDropdown && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    <div 
                      onMouseDown={() => {
                        setNewJob({...newJob, customer_id: undefined});
                        setCustomerSearch('عميل نقدي (بدون تسجيل)');
                        setShowCustomerDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-muted cursor-pointer text-sm border-b border-border font-bold text-muted-foreground"
                    >
                      عميل نقدي (بدون تسجيل)
                    </div>
                    {customers.filter(c => (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone || '').includes(customerSearch)).map(c => (
                      <div 
                        key={c.id} 
                        onMouseDown={() => {
                          setNewJob({...newJob, customer_id: c.id});
                          setCustomerSearch(`${c.name} ${c.phone ? `(${c.phone})` : ''}`);
                          setShowCustomerDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-muted cursor-pointer text-sm border-b border-border last:border-0 font-medium"
                      >
                        {c.name} {c.phone ? <span className="text-muted-foreground mr-2">({c.phone})</span> : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">موديل الجهاز</label>
                <input required type="text" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newJob.device_model} onChange={e => setNewJob({...newJob, device_model: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">التكلفة التقديرية (ج.م)</label>
                <input required type="number" className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newJob.estimated_cost} onChange={e => setNewJob({...newJob, estimated_cost: Number(e.target.value)})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-2 font-medium">وصف العطل / ملاحظات العميل</label>
                <textarea required rows={3} className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  value={newJob.issue_description} onChange={e => setNewJob({...newJob, issue_description: e.target.value})} />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 rounded-xl font-bold hover:bg-muted transition-colors text-foreground">
                إلغاء
              </button>
              <button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-t border-blue-400/30 px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
                حفظ وطباعة الإيصال
              </button>
            </div>
          </form>
        </div>
      )}

      {showDetails && selectedJob && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-4xl rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted/30">
              <h3 className="text-xl font-black text-primary flex items-center gap-2">
                <Wrench className="w-6 h-6" /> {isAlreadyDelivered ? `تفاصيل جهاز الصيانة (#${selectedJob.id})` : `تفاصيل وتعديل جهاز صيانة (#${selectedJob.id})`}
              </h3>
              <button type="button" onClick={() => setShowDetails(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold mb-4 pb-2 border-b border-border">معلومات الجهاز</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground block">العميل</span>
                      <strong className="text-sm">{selectedJob.customer_name || 'عميل نقدي'}</strong>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground block">الهاتف</span>
                      <strong className="text-sm">{selectedJob.customer_phone || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground block">الموديل</span>
                      <strong className="text-sm">{selectedJob.device_model}</strong>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground block">التكلفة التقديرية</span>
                      <strong className="text-sm text-primary">{selectedJob.estimated_cost} ج.م</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold mb-4 pb-2 border-b border-border">قطع الغيار المسحوبة</h4>
                  {!isAlreadyDelivered && (
                    <div className="mb-4 p-4 bg-muted rounded-xl space-y-3">
                      <label className="block text-sm font-bold text-primary border-b border-border pb-2">إضافة قطعة غيار</label>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="ابحث عن قطعة غيار..."
                          value={productSearch}
                          onChange={e => {
                            setProductSearch(e.target.value);
                            setSelectedPartId(''); 
                            setShowProductDropdown(true);
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-sm"
                        />
                        {showProductDropdown && (
                          <div className="absolute top-full right-0 left-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                            {spareParts.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                              <div 
                                key={p.id} 
                                onMouseDown={() => {
                                  setSelectedPartId(p.id.toString());
                                  setProductSearch(p.name);
                                  setShowProductDropdown(false);
                                  setPartQuantity(1);
                                }}
                                className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border last:border-0"
                              >
                                {p.name} (المتاح: {p.stock_quantity})
                              </div>
                            ))}
                            {spareParts.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground text-center">لا توجد نتائج</div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">الكمية</label>
                          <input 
                            type="number" min="1" 
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-sm"
                            value={partQuantity}
                            onChange={e => setPartQuantity(Number(e.target.value))}
                          />
                        </div>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={handleAddPartToJob}
                        className="w-full py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg font-bold transition-colors text-sm"
                      >
                        إضافة للقائمة
                      </button>
                    </div>
                  )}

                  <div className="bg-muted/30 rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                          <th className="py-2 px-3">القطعة</th>
                          <th className="py-2 px-3">الكمية</th>
                          <th className="py-2 px-3">السعر</th>
                          <th className="py-2 px-3">إلغاء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobParts.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">لم يتم إضافة قطع غيار</td></tr>}
                        {jobParts.map(p => (
                          <tr key={p.id} className="border-b border-border last:border-0">
                            <td className="py-2 px-3 font-medium">{p.product_name}</td>
                            <td className="py-2 px-3">{p.quantity}</td>
                            <td className="py-2 px-3">{p.unit_price} ج.م</td>
                            <td className="py-2 px-3">
                              {!isAlreadyDelivered && (
                                <button onClick={() => handleRemovePart(p.id!, p.inventory_id, p.quantity)} className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
                                  <Trash2 className="w-4 h-4" />
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

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold mb-4 pb-2 border-b border-border">تحديث الحالة والتكلفة</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm mb-2 font-medium">حالة الجهاز</label>
                      <select 
                        disabled={isAlreadyDelivered}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        value={selectedJob.status}
                        onChange={e => setSelectedJob({...selectedJob, status: e.target.value as any})}
                      >
                        <option value="pending">قيد الانتظار</option>
                        <option value="in_progress">جاري العمل</option>
                        <option value="ready">جاهز للتسليم</option>
                        <option value="delivered">تم التسليم</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm mb-2 font-medium">المصنعية / حق التصليح (ج.م)</label>
                      <input 
                        type="number" min="0" disabled={isAlreadyDelivered}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        value={laborFee}
                        onChange={e => setLaborFee(Number(e.target.value))}
                      />
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">إجمالي تكلفة القطع:</span>
                        <span className="font-bold">{jobParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0)} ج.م</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">المصنعية:</span>
                        <span className="font-bold">{laborFee} ج.م</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-primary/20 mt-2 text-lg">
                        <span className="font-black text-primary">السعر النهائي للعميل:</span>
                        <span className="font-black text-primary">
                          {jobParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0) + laborFee} ج.م
                        </span>
                      </div>
                    </div>

                    {selectedJob.status === 'delivered' && !isAlreadyDelivered && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 animate-in fade-in zoom-in duration-300">
                        <label className="block text-sm mb-2 font-bold text-amber-700">المبلغ المدفوع (ج.م)</label>
                        <input 
                          type="number" min="0" max={jobParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0) + laborFee}
                          className="w-full px-4 py-3 border border-amber-500/30 rounded-xl bg-background focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-lg"
                          value={paidAmount}
                          placeholder={`الإجمالي: ${jobParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0) + laborFee}`}
                          onChange={e => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <p className="text-xs text-amber-600 mt-2 font-bold">
                          المبلغ المتبقي سيُسجل كدين على حساب العميل.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button type="button" onClick={() => setShowDetails(false)} className="px-6 py-3 rounded-xl font-bold hover:bg-muted transition-colors text-foreground">
                {isAlreadyDelivered ? 'إغلاق' : 'إلغاء'}
              </button>
              {!isAlreadyDelivered && (
                <button type="button" onClick={handleSaveDetails} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-t border-blue-400/30 px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
                  حفظ التعديلات
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm min-h-[500px] flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-border flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute right-3 top-3 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="البحث برقم الهاتف أو الموديل..." 
              className="w-full pr-10 pl-4 py-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
            />
          </div>
          <div className="flex bg-muted rounded-xl p-1 overflow-x-auto">
            {statuses.map(status => (
              <button 
                key={status.id}
                onClick={() => setActiveStatus(status.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${activeStatus === status.id ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:bg-background/50'}`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Maintenance Jobs Table */}
        <div className="flex-1 overflow-x-auto p-2">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-4 px-4 font-medium">الإيصال</th>
                <th className="py-4 px-4 font-medium">العميل</th>
                <th className="py-4 px-4 font-medium">الموديل / العطل</th>
                <th className="py-4 px-4 font-medium">حالة الجهاز</th>
                <th className="py-4 px-4 font-medium">التكلفة</th>
                <th className="py-4 px-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد أجهزة</td></tr>}
              {jobs.map(job => (
                <tr key={job.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4 font-black text-muted-foreground">#{job.id}</td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-foreground">{job.customer_name || 'عميل نقدي'}</div>
                    <div className="text-sm text-muted-foreground">{job.customer_phone || '-'}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold">{job.device_model}</div>
                    <div className="text-sm text-destructive">{job.issue_description}</div>
                  </td>
                  <td className="py-4 px-4">
                    {job.status === 'pending' && <span className="text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-lg text-sm font-bold">قيد الانتظار</span>}
                    {job.status === 'in_progress' && <span className="text-blue-600 bg-blue-500/10 px-3 py-1.5 rounded-lg text-sm font-bold">جاري العمل</span>}
                    {job.status === 'ready' && <span className="text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg text-sm font-bold">جاهز للتسليم</span>}
                    {job.status === 'delivered' && <span className="text-muted-foreground bg-muted px-3 py-1.5 rounded-lg text-sm font-bold">تم التسليم</span>}
                  </td>
                  <td className="py-4 px-4 font-black text-primary">{job.final_cost || job.estimated_cost} ج.م</td>
                  <td className="py-4 px-4 flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleOpenDetails(job)}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-bold transition-colors text-sm"
                    >
                      {job.status === 'delivered' ? 'عرض التفاصيل' : 'التفاصيل / التعديل'}
                    </button>
                    <button 
                      onClick={() => handlePrint(job)}
                      className="p-2 bg-muted hover:bg-muted-foreground/20 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                      title="طباعة إيصال"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteJob(job)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                      title="حذف الجهاز"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
