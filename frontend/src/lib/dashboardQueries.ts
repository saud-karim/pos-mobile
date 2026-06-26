import { getDb } from './db';

export interface DashboardStats {
  periodSales: number;
  periodMaintenance: number;
  activeMaintenance: number;
  periodTransfersComm: number;
  lowStockCount: number;
  periodProfit: number;
  periodPayments: number;
  capitals: {id: number, name: string, balance: number}[];
}

export async function getDashboardStats(startDate?: string, endDate?: string): Promise<DashboardStats> {
  const db = await getDb();
  
  let dateCondition = "";
  let updatedDateCondition = "";
  let params: any[] = [];

  if (startDate && endDate) {
    dateCondition = "WHERE created_at >= $1 AND created_at <= $2";
    updatedDateCondition = "WHERE status = 'delivered' AND updated_at >= $1 AND updated_at <= $2";
    params = [startDate, endDate];
  } else {
    // Default to All Time if no filter provided
    dateCondition = "";
    updatedDateCondition = "WHERE status = 'delivered'";
  }

  // Helper for safe query execution
  const executeQuery = async (query: string, useParams: boolean = true) => {
    const res = await db.select<{total: number, count: number, profit: number}[]>(query, useParams ? params : []);
    return res[0];
  };

  // 1. Sales (Invoices + Wholesale Sales)
  // Retail Sales
  const salesResult = await executeQuery(`SELECT SUM(total_amount) as total FROM invoices ${dateCondition}`);
  // Wholesale Sales
  const wholesaleSalesResult = await executeQuery(`SELECT SUM(total_amount) as total FROM wholesale_orders WHERE type = 'sale' ${dateCondition ? 'AND created_at >= $1 AND created_at <= $2' : ''}`);
  
  const periodSales = (salesResult?.total || 0) + (wholesaleSalesResult?.total || 0);

  // 2. Maintenance Income (Net Profit)
  const maintenanceIncomeResult = await executeQuery(`SELECT SUM(final_cost - spare_parts_cost) as total FROM maintenance ${updatedDateCondition}`);
  const periodMaintenance = maintenanceIncomeResult?.total || 0;

  // 3. Active Maintenance (not delivered/rejected) - Independent of time filter
  const maintenanceResult = await executeQuery(`SELECT COUNT(*) as count FROM maintenance WHERE status IN ('pending', 'in_progress', 'ready')`, false);
  const activeMaintenance = maintenanceResult?.count || 0;

  // 4. Transfer Commissions
  const transfersResult = await executeQuery(`SELECT SUM(commission) as total FROM money_transfers ${dateCondition}`);
  const periodTransfersComm = transfersResult?.total || 0;

  // 5. Debt Payments
  const paymentsResult = await executeQuery(`SELECT SUM(amount) as total FROM customer_payments ${dateCondition}`);
  const periodPayments = paymentsResult?.total || 0;

  // 6. Low Stock - Independent of time filter
  const stockResult = await executeQuery(`SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_stock`, false);
  const lowStockCount = stockResult?.count || 0;

  // 7. Profit
  // Retail Profit
  const invoiceProfitResult = await executeQuery(`
    SELECT SUM(i.total_amount - COALESCE((SELECT SUM(ii.cost_price * ii.quantity) FROM invoice_items ii WHERE ii.invoice_id = i.id), 0)) as profit 
    FROM invoices i 
    ${dateCondition}
  `);
  // Wholesale Profit
  const wholesaleProfitResult = await executeQuery(`
    SELECT SUM(o.total_amount - COALESCE((SELECT SUM(oi.cost_price * oi.quantity) FROM wholesale_order_items oi WHERE oi.order_id = o.id), 0)) as profit 
    FROM wholesale_orders o 
    WHERE o.type = 'sale' ${dateCondition ? 'AND o.created_at >= $1 AND o.created_at <= $2' : ''}
  `);
  
  const periodProfit = (invoiceProfitResult?.profit || 0) + (wholesaleProfitResult?.profit || 0) + periodMaintenance + periodTransfersComm;

  // 8. Capitals
  const capitals = await db.select<{id: number, name: string, balance: number}[]>(`SELECT * FROM capitals ORDER BY id ASC`);

  return {
    periodSales,
    periodMaintenance,
    activeMaintenance,
    periodTransfersComm,
    lowStockCount,
    periodProfit,
    periodPayments,
    capitals
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
