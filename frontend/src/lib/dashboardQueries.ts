import { getDb } from './db';

export interface DashboardStats {
  todaySales: number;
  activeMaintenance: number;
  todayTransfersComm: number;
  lowStockCount: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  
  // Today's boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString().replace('T', ' ').substring(0, 19);

  // Today Sales
  const salesResult = await db.select<{total: number}[]>(
    `SELECT SUM(paid_amount) as total FROM invoices WHERE created_at >= $1`,
    [startOfDay]
  );
  const todaySales = salesResult[0]?.total || 0;

  // Active Maintenance (not delivered/rejected)
  const maintenanceResult = await db.select<{count: number}[]>(
    `SELECT COUNT(*) as count FROM maintenance WHERE status IN ('pending', 'in_progress', 'ready')`
  );
  const activeMaintenance = maintenanceResult[0]?.count || 0;

  // Today's Transfer Commissions
  const transfersResult = await db.select<{total: number}[]>(
    `SELECT SUM(commission) as total FROM money_transfers WHERE created_at >= $1`,
    [startOfDay]
  );
  const todayTransfersComm = transfersResult[0]?.total || 0;

  // Low Stock
  const stockResult = await db.select<{count: number}[]>(
    `SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock`
  );
  const lowStockCount = stockResult[0]?.count || 0;

  return {
    todaySales,
    activeMaintenance,
    todayTransfersComm,
    lowStockCount
  };
}

export async function getRecentInvoices() {
  const db = await getDb();
  return await db.select<any[]>(
    `SELECT invoices.id, invoices.total_amount, invoices.created_at, customers.name as customer_name
     FROM invoices 
     LEFT JOIN customers ON invoices.customer_id = customers.id
     ORDER BY invoices.id DESC LIMIT 5`
  );
}

export async function getReadyMaintenance() {
  const db = await getDb();
  return await db.select<any[]>(
    `SELECT m.id, m.device_model, m.final_cost, c.name as customer_name, c.phone 
     FROM maintenance m
     LEFT JOIN customers c ON m.customer_id = c.id
     WHERE m.status = 'ready'
     ORDER BY m.updated_at DESC LIMIT 5`
  );
}
