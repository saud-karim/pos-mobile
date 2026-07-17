import { getDb } from './db';
import toast from 'react-hot-toast';

export async function exportDatabase() {
  try {
    const db = await getDb();
    const backup: Record<string, any[]> = {};
    
    // Get all tables dynamically
    const tableNamesRes = await db.select<{name: string}[]>(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
    const tables = tableNamesRes.map((t: {name: string}) => t.name);
    
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
        
        // Get all tables dynamically
        const tableNamesRes = await db.select<{name: string}[]>(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
        const tables = tableNamesRes.map((t: {name: string}) => t.name);

        // Build dependency graph using foreign keys
        const graph: Record<string, string[]> = {};
        for (const table of tables) {
          graph[table] = [];
          const fks = await db.select<any[]>(`PRAGMA foreign_key_list(${table})`);
          for (const fk of fks) {
            graph[table].push(fk.table);
          }
        }

        // Topological Sort
        const insertTables: string[] = [];
        const visited = new Set<string>();

        function visit(node: string) {
          if (visited.has(node)) return;
          visited.add(node);
          for (const dep of graph[node] || []) {
            visit(dep);
          }
          insertTables.push(node);
        }

        for (const table of tables) {
          visit(table);
        }

        const deleteTables = [...insertTables].reverse();
        
        // Clear tables in reverse dependency order
        for (const table of deleteTables) {
          await db.execute(`DELETE FROM ${table}`);
        }
        
        // Insert data in dependency order
        
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
