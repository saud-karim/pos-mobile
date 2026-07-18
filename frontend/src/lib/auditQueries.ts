import { getDb } from './db';

export interface InventoryAudit {
  id: number;
  user_id: number;
  status: 'pending' | 'completed';
  created_at: string;
  completed_at: string | null;
  username?: string; // from join
}

export interface AuditItem {
  id: number;
  audit_id: number;
  inventory_id: number;
  expected_quantity: number;
  actual_quantity: number;
  cost_price: number;
  // joined from inventory
  product_name?: string;
  product_barcode?: string;
  product_category?: string;
}

// 1. Get all audits
export async function getAudits() {
  const db = await getDb();
  return await db.select<InventoryAudit[]>(
    `SELECT a.*, u.username 
     FROM inventory_audits a 
     LEFT JOIN users u ON a.user_id = u.id 
     ORDER BY a.created_at DESC`
  );
}

// 2. Start a new audit (Snapshot)
export async function createAudit(userId: number) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  
  try {
    // Check if there is an open audit
    const openAudits = await db.select<any[]>('SELECT id FROM inventory_audits WHERE status = "pending"');
    if (openAudits.length > 0) {
      throw new Error('هناك جرد مفتوح حالياً ولم يتم استكماله.');
    }

    // Insert new audit
    const result = await db.execute(
      `INSERT INTO inventory_audits (user_id, status) VALUES ($1, 'pending')`,
      [userId]
    );
    const auditId = result.lastInsertId;

    // Get all inventory
    const items = await db.select<any[]>('SELECT id, quantity, cost_price FROM inventory');
    
    for (const item of items) {
      await db.execute(
        `INSERT INTO inventory_audit_items (audit_id, inventory_id, expected_quantity, actual_quantity, cost_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [auditId, item.id, item.quantity, 0, item.cost_price] // Start actual_quantity with 0
      );
    }
    
    await db.execute('COMMIT');
    return auditId;
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

// 3. Get active audit items
export async function getAuditItems(auditId: number) {
  const db = await getDb();
  return await db.select<AuditItem[]>(
    `SELECT ai.*, i.name as product_name, i.barcode as product_barcode, i.category as product_category 
     FROM inventory_audit_items ai
     JOIN inventory i ON ai.inventory_id = i.id
     WHERE ai.audit_id = $1`,
    [auditId]
  );
}

// 4. Update an item's actual quantity during the audit process
export async function updateAuditItem(itemId: number, actualQuantity: number) {
  const db = await getDb();
  await db.execute(
    `UPDATE inventory_audit_items SET actual_quantity = $1 WHERE id = $2`,
    [actualQuantity, itemId]
  );
}

// 5. Complete Audit and process financial / inventory adjustments
export async function completeAudit(auditId: number, userId: number) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');

  try {
    const items = await db.select<AuditItem[]>(
      `SELECT * FROM inventory_audit_items WHERE audit_id = $1`,
      [auditId]
    );

    let totalLoss = 0;

    for (const item of items) {
      const difference = item.actual_quantity - item.expected_quantity;
      
      // Update inventory to match actual_quantity
      if (difference !== 0) {
        await db.execute(
          `UPDATE inventory SET quantity = $1 WHERE id = $2`,
          [item.actual_quantity, item.inventory_id]
        );
      }

      // If there's a deficit (عجز), log it as an expense (خسائر جرد)
      if (difference < 0) {
        const lossValue = Math.abs(difference) * item.cost_price;
        totalLoss += lossValue;
      }
      
      // Note: If surplus (difference > 0), the user requested ONLY updating the quantity, without logging financial gain.
    }

    if (totalLoss > 0) {
      // capital_id = 1 for goods
      await db.execute(
        `INSERT INTO expenses (user_id, capital_id, amount, description) 
         VALUES ($1, 1, $2, $3)`,
        [userId, totalLoss, `تسوية نواقص جرد مخزن رقم #${auditId}`]
      );
    }

    // Close the audit
    await db.execute(
      `UPDATE inventory_audits SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [auditId]
    );

    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

// 6. Delete pending audit (Cancel)
export async function cancelAudit(auditId: number) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    await db.execute('DELETE FROM inventory_audit_items WHERE audit_id = $1', [auditId]);
    await db.execute('DELETE FROM inventory_audits WHERE id = $1', [auditId]);
    await db.execute('COMMIT');
  } catch(error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}
