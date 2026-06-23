import { getDb } from './db';

export async function getDashboardStats() {
  const db = await getDb();
  
  // Get total sales today
  const salesResult = await db.select<{total: number}[]>(
    `SELECT SUM(total_amount) as total FROM invoices WHERE date(created_at) = date('now')`
  );
  
  // Get maintenance profit today
  const maintenanceResult = await db.select<{total: number}[]>(
    `SELECT SUM(final_cost - spare_parts_cost) as total FROM maintenance WHERE status = 'delivered' AND date(created_at) = date('now')`
  );
  
  // Get transfers commission today
  const transfersResult = await db.select<{total: number}[]>(
    `SELECT SUM(commission) as total FROM money_transfers WHERE date(created_at) = date('now')`
  );

  return {
    sales: salesResult[0]?.total || 0,
    maintenance: maintenanceResult[0]?.total || 0,
    transfers: transfersResult[0]?.total || 0,
  };
}

export async function getRecentInvoices(limit = 10) {
  const db = await getDb();
  return await db.select<any[]>(
    `SELECT i.*, u.username as cashier_name 
     FROM invoices i
     LEFT JOIN users u ON i.user_id = u.id
     ORDER BY i.created_at DESC LIMIT $1`,
    [limit]
  );
}
