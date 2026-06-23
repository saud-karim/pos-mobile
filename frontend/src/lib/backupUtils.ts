import { getDb } from './db';
import toast from 'react-hot-toast';

export async function exportDatabase() {
  try {
    const db = await getDb();
    const backup: Record<string, any[]> = {};
    
    // List all tables
    const tables = ['users', 'categories', 'products', 'customers', 'maintenance', 'money_transfers', 'invoices', 'invoice_items', 'shifts'];
    
    for (const table of tables) {
      backup[table] = await db.select(`SELECT * FROM ${table}`);
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `pos_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    toast.success('تم تصدير النسخة الاحتياطية بنجاح');
  } catch (err: any) {
    console.error(err);
    toast.error('حدث خطأ أثناء التصدير: ' + err.message);
  }
}

export async function importDatabase(file: File) {
  return new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        const db = await getDb();
        
        // This is a destructive operation. We clear existing tables first.
        const tables = ['invoice_items', 'invoices', 'shifts', 'maintenance', 'money_transfers', 'products', 'categories', 'customers', 'users'];
        
        // Wrap in transaction if possible, but Tauri SQL doesn't fully support manual transactions yet easily.
        // We'll just delete and insert.
        for (const table of tables) {
          await db.execute(`DELETE FROM ${table}`);
        }
        
        // Insert data back
        // Need to reverse the table order for insertion so foreign keys don't fail, 
        // actually users, categories, customers first.
        const insertTables = ['users', 'categories', 'customers', 'products', 'maintenance', 'money_transfers', 'invoices', 'invoice_items', 'shifts'];
        
        for (const table of insertTables) {
          const rows = backup[table] || [];
          for (const row of rows) {
            const keys = Object.keys(row);
            const values = Object.values(row);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            
            await db.execute(
              `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
              values
            );
          }
        }
        
        toast.success('تم استعادة النسخة الاحتياطية بنجاح. سيتم إعادة تشغيل التطبيق.');
        setTimeout(() => window.location.reload(), 2000);
        resolve();
      } catch (err: any) {
        console.error(err);
        toast.error('حدث خطأ أثناء الاستعادة. تأكد من صحة الملف.');
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
