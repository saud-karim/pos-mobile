export interface PrintInvoiceData {
  invoiceId: number;
  date: string;
  cashierName: string;
  customerName?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subTotal: number;
  discount: number;
  finalTotal: number;
  paidAmount: number;
  paymentMethod: string;
}

export interface PrintMaintenanceData {
  jobId: number;
  date: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  issueDescription: string;
  estimatedCost: number;
}

export interface PrintDebtPaymentData {
  customerName: string;
  customerPhone?: string;
  date: string;
  paidAmount: number;
  remainingDebt: number;
  cashierName: string;
}

function getSettings() {
  const saved = localStorage.getItem('pos_settings');
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    shopName: 'SmartStore',
    phone: '',
    address: '',
    policy: 'البضاعة المباعة لا ترد ولا تستبدل إلا في حالة وجود عيب صناعة خلال 14 يوم.',
  };
}

export function printReceipt(data: PrintInvoiceData) {
  const settings = getSettings();
  
  const content = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة رقم ${data.invoiceId}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 10px; width: 80mm; font-size: 12px; color: #000; }
        .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .header h1 { font-size: 18px; margin: 0 0 5px 0; }
        .header p { margin: 2px 0; font-size: 12px; }
        .info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .info div { display: flex; justify-content: space-between; margin-bottom: 3px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { text-align: right; padding: 3px 0; }
        th { border-bottom: 1px solid #000; }
        .totals { border-top: 1px dashed #000; padding-top: 5px; margin-bottom: 10px; }
        .totals div { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .totals .final { font-size: 14px; font-weight: bold; }
        .footer { text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${settings.shopName}</h1>
        ${settings.phone ? `<p>تليفون: ${settings.phone}</p>` : ''}
        ${settings.address ? `<p>العنوان: ${settings.address}</p>` : ''}
      </div>

      <div class="info">
        <div><span>رقم الفاتورة:</span> <span>#${data.invoiceId}</span></div>
        <div><span>التاريخ:</span> <span>${data.date}</span></div>
        <div><span>الكاشير:</span> <span>${data.cashierName}</span></div>
        ${data.customerName ? `<div><span>العميل:</span> <span>${data.customerName}</span></div>` : ''}
        <div><span>طريقة الدفع:</span> <span>${data.paymentMethod === 'cash' ? 'كاش' : 'فيزا'}</span></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>الصنف</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${item.price}</td>
              <td>${item.quantity * item.price}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div><span>الإجمالي الفرعي:</span> <span>${data.subTotal} ج.م</span></div>
        ${data.discount > 0 ? `<div><span>الخصم:</span> <span>${data.discount} ج.م</span></div>` : ''}
        <div class="final"><span>الصافي للدفع:</span> <span>${data.finalTotal} ج.م</span></div>
        <div><span>المدفوع:</span> <span>${data.paidAmount} ج.م</span></div>
        ${data.paidAmount < data.finalTotal ? `<div><span>المتبقي (آجل):</span> <span>${data.finalTotal - data.paidAmount} ج.م</span></div>` : ''}
      </div>

      <div class="footer">
        <p>${settings.policy}</p>
        <p>شكراً لزيارتكم</p>
      </div>
    </body>
    </html>
  `;

  executePrint(content);
}

export function printMaintenanceTicket(data: PrintMaintenanceData) {
  const settings = getSettings();
  
  const content = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>إيصال صيانة #${data.jobId}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 10px; width: 80mm; font-size: 12px; color: #000; }
        .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .header h1 { font-size: 18px; margin: 0 0 5px 0; }
        .header p { margin: 2px 0; font-size: 12px; }
        .info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .info div { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .details { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .details h3 { margin: 0 0 5px 0; font-size: 14px; }
        .details p { margin: 3px 0; }
        .footer { text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${settings.shopName}</h1>
        ${settings.phone ? `<p>تليفون: ${settings.phone}</p>` : ''}
        ${settings.address ? `<p>العنوان: ${settings.address}</p>` : ''}
      </div>

      <div class="info">
        <div><span>رقم الإيصال:</span> <span>#${data.jobId}</span></div>
        <div><span>التاريخ:</span> <span>${data.date}</span></div>
        <div><span>العميل:</span> <span>${data.customerName}</span></div>
        <div><span>الموبايل:</span> <span>${data.customerPhone}</span></div>
      </div>

      <div class="details">
        <h3>تفاصيل الجهاز</h3>
        <p><strong>الموديل:</strong> ${data.deviceModel}</p>
        <p><strong>العطل:</strong> ${data.issueDescription}</p>
        <p><strong>التكلفة التقديرية:</strong> ${data.estimatedCost} ج.م</p>
      </div>

      <div class="footer">
        <p>يرجى إحضار هذا الإيصال عند الاستلام.</p>
        <p>المحل غير مسؤول عن الجهاز بعد 30 يوم من إبلاغ العميل.</p>
      </div>
    </body>
    </html>
  `;

  executePrint(content);
}

export function printDebtPaymentReceipt(data: PrintDebtPaymentData) {
  const settings = getSettings();
  
  const content = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>إيصال سداد مديونية</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 10px; width: 80mm; font-size: 12px; color: #000; }
        .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .header h1 { font-size: 18px; margin: 0 0 5px 0; }
        .header p { margin: 2px 0; font-size: 12px; }
        .info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .info div { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .details { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .details div { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; font-weight: bold; }
        .footer { text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${settings.shopName}</h1>
        ${settings.phone ? `<p>تليفون: ${settings.phone}</p>` : ''}
        ${settings.address ? `<p>العنوان: ${settings.address}</p>` : ''}
      </div>

      <div class="info">
        <div><span>نوع الإيصال:</span> <span>سداد دفعة (مديونية)</span></div>
        <div><span>التاريخ:</span> <span>${data.date}</span></div>
        <div><span>الكاشير:</span> <span>${data.cashierName}</span></div>
        <div><span>العميل:</span> <span>${data.customerName}</span></div>
        ${data.customerPhone ? `<div><span>هاتف العميل:</span> <span>${data.customerPhone}</span></div>` : ''}
      </div>

      <div class="details">
        <div><span>المبلغ المدفوع:</span> <span>${data.paidAmount} ج.م</span></div>
        <div>
          <span>الرصيد المتبقي:</span> 
          <span>
            ${data.remainingDebt > 0 ? `عليه ${data.remainingDebt} ج.م` : data.remainingDebt < 0 ? `له ${Math.abs(data.remainingDebt)} ج.م` : 'خالص (0)'}
          </span>
        </div>
      </div>

      <div class="footer">
        <p>تم استلام المبلغ نقداً</p>
        <p>شكراً لتعاملكم معنا</p>
      </div>
    </body>
    </html>
  `;

  executePrint(content);
}

export interface PrintCustomerStatementData {
  customerName: string;
  customerPhone?: string;
  date: string;
  creditBalance: number;
  cashierName: string;
}

export function printCustomerStatement(data: PrintCustomerStatementData) {
  const settings = getSettings();
  
  const content = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كشف حساب مديونية</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 10px; width: 80mm; font-size: 12px; color: #000; }
        .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .header h1 { font-size: 18px; margin: 0 0 5px 0; }
        .header p { margin: 2px 0; font-size: 12px; }
        .info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .info div { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .details { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .details div { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; font-weight: bold; }
        .footer { text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${settings.shopName}</h1>
        ${settings.phone ? `<p>تليفون: ${settings.phone}</p>` : ''}
        ${settings.address ? `<p>العنوان: ${settings.address}</p>` : ''}
      </div>

      <div class="info">
        <div><span>نوع الإيصال:</span> <span>كشف حساب مديونية</span></div>
        <div><span>التاريخ:</span> <span>${data.date}</span></div>
        <div><span>المسؤول:</span> <span>${data.cashierName}</span></div>
        <div><span>العميل:</span> <span>${data.customerName}</span></div>
        ${data.customerPhone ? `<div><span>هاتف العميل:</span> <span>${data.customerPhone}</span></div>` : ''}
      </div>

      <div class="details">
        <div>
          <span>الرصيد الحالي:</span> 
          <span>
            ${data.creditBalance > 0 ? `عليه ${data.creditBalance} ج.م` : data.creditBalance < 0 ? `له ${Math.abs(data.creditBalance)} ج.م` : 'خالص (0)'}
          </span>
        </div>
      </div>

      <div class="footer">
        <p>هذا كشف حساب بالمبلغ الإجمالي المطلوب من العميل حتى تاريخه.</p>
        <p>شكراً لتعاملكم معنا</p>
      </div>
    </body>
    </html>
  `;

  executePrint(content);
}

function executePrint(content: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(content);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }
}
