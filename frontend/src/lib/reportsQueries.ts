import { getDb } from './db';

export async function getReportsStats() {
  const db = await getDb();
  
  // Today's boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString().replace('T', ' ').substring(0, 19);
  
  // Get total sales today (Invoices)
  const salesResult = await db.select<{total: number}[]>(
    `SELECT SUM(total_amount) as total FROM invoices WHERE created_at >= $1`,
    [startOfDay]
  );
  
  // Get maintenance profit today
  // Profit = final_cost - cost of all parts. Wait, in maintenance we have `spare_parts_cost` which is price, not cost.
  // Actually let's just show total maintenance income here to match dashboard or keep it as profit? 
  // The card says "صافي أرباح الصيانة" (Net Maintenance Profit). 
  // Let's use the exact query but with updated_at like the dashboard.
  const maintenanceResult = await db.select<{total: number}[]>(
    `SELECT SUM(final_cost - spare_parts_cost) as total FROM maintenance WHERE status = 'delivered' AND updated_at >= $1`,
    [startOfDay]
  );
  
  // Get transfers commission today
  const transfersResult = await db.select<{total: number}[]>(
    `SELECT SUM(commission) as total FROM money_transfers WHERE created_at >= $1`,
    [startOfDay]
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
