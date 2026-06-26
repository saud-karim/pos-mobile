import { getDb } from './db';

export interface DashboardStats {
  todaySales: number;
  todayMaintenance: number;
  activeMaintenance: number;
  todayTransfersComm: number;
  lowStockCount: number;
  totalSalesAllTime: number;
  totalProfitAllTime: number;
  todayPayments: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  
  // Today's boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString().replace('T', ' ').substring(0, 19);

  // Today Sales (Invoices only)
  const salesResult = await db.select<{total: number}[]>(
    `SELECT SUM(total_amount) as total FROM invoices WHERE created_at >= $1`,
    [startOfDay]
  );
  const todaySales = salesResult[0]?.total || 0;

  // Today Maintenance Income (Net Profit)
  const maintenanceIncomeResult = await db.select<{total: number}[]>(
    `SELECT SUM(final_cost - spare_parts_cost) as total FROM maintenance WHERE status = 'delivered' AND updated_at >= $1`,
    [startOfDay]
  );
  const todayMaintenance = maintenanceIncomeResult[0]?.total || 0;

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

  // Today's Debt Payments
  const paymentsResult = await db.select<{total: number}[]>(
    `SELECT SUM(amount) as total FROM customer_payments WHERE created_at >= $1`,
    [startOfDay]
  );
  const todayPayments = paymentsResult[0]?.total || 0;

  // Low Stock
  const stockResult = await db.select<{count: number}[]>(
    `SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock`
  );
  const lowStockCount = stockResult[0]?.count || 0;

  // All Time Sales
  const allSalesResult = await db.select<{total: number}[]>(
    `SELECT SUM(total_amount) as total FROM invoices`
  );
  const allMaintenanceIncomeResult = await db.select<{total: number}[]>(
    `SELECT SUM(final_cost) as total FROM maintenance WHERE status = 'delivered'`
  );
  const totalSalesAllTime = (allSalesResult[0]?.total || 0) + (allMaintenanceIncomeResult[0]?.total || 0);

  // All Time Profit
  const invoiceProfitResult = await db.select<{profit: number}[]>(
    `SELECT SUM(i.total_amount - COALESCE((SELECT SUM(ii.cost_price * ii.quantity) FROM invoice_items ii WHERE ii.invoice_id = i.id), 0)) as profit FROM invoices i`
  );
  const maintenanceProfitResult = await db.select<{profit: number}[]>(
    `SELECT SUM(final_cost - spare_parts_cost) as profit FROM maintenance WHERE status = 'delivered'`
  );
  const totalProfitAllTime = (invoiceProfitResult[0]?.profit || 0) + (maintenanceProfitResult[0]?.profit || 0);

  return {
    todaySales,
    todayMaintenance,
    activeMaintenance,
    todayTransfersComm,
    lowStockCount,
    totalSalesAllTime,
    totalProfitAllTime,
    todayPayments
  };
}

export async function getRecentInvoices() {
  const db = await getDb();
  return await db.select<any[]>(
    `SELECT invoices.id, invoices.total_amount, invoices.created_at, customers.name as customer_name, 'مبيعات' as type
     FROM invoices 
     LEFT JOIN customers ON invoices.customer_id = customers.id
     UNION ALL
     SELECT m.id, m.final_cost as total_amount, m.updated_at as created_at, c.name as customer_name, 'صيانة' as type
     FROM maintenance m
     LEFT JOIN customers c ON m.customer_id = c.id
     WHERE m.status = 'delivered'
     ORDER BY created_at DESC LIMIT 5`
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
