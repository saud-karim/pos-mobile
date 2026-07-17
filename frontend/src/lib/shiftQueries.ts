import { getDb } from './db';

export interface Shift {
  id: number;
  user_id: number;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
}

export async function getCurrentShift(userId: number): Promise<Shift | null> {
  const db = await getDb();
  const shifts = await db.select<Shift[]>(
    `SELECT * FROM shifts WHERE user_id = $1 AND status = 'open' LIMIT 1`,
    [userId]
  );
  return shifts.length > 0 ? shifts[0] : null;
}

export async function openShift(userId: number, openingCash: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO shifts (user_id, opening_cash, status) VALUES ($1, $2, 'open')`,
    [userId, openingCash]
  );
}

export async function calculateExpectedCash(shiftId: number, userId: number, openingCash: number): Promise<number> {
  const db = await getDb();
  
  // Get shift opening time
  const shiftResult = await db.select<{opened_at: string}[]>(
    `SELECT opened_at FROM shifts WHERE id = $1`, [shiftId]
  );
  if (shiftResult.length === 0) return openingCash;
  const openedAt = shiftResult[0].opened_at;

  // Sum cash sales for this user since openedAt
  const salesResult = await db.select<{total: number}[]>(
    `SELECT SUM(paid_amount) as total FROM invoices 
     WHERE user_id = $1 AND payment_method = 'cash' AND created_at >= $2`,
    [userId, openedAt]
  );
  const salesCash = salesResult[0]?.total || 0;

  // Maintenance cash (not implemented fully, assuming payment on delivery, but for now we skip or add if exists)
  const maintenanceResult = await db.select<{total: number}[]>(
    `SELECT SUM(final_cost) as total FROM maintenance 
     WHERE status = 'delivered' AND updated_at >= $1`,
    [openedAt]
  );
  const maintenanceCash = maintenanceResult[0]?.total || 0;

  // Money transfers cash (+ deposits/commissions, - withdrawals)
  // For simplicity, we assume money transfers take/add cash to the drawer.
  // Actually, usually they have a separate wallet. Let's just add the shop_commission to drawer.
  const transfersResult = await db.select<{total: number}[]>(
    `SELECT SUM(commission) as total FROM money_transfers 
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, openedAt]
  );
  const transfersComm = transfersResult[0]?.total || 0;

  // Expenses
  const expensesResult = await db.select<{total: number}[]>(
    `SELECT SUM(amount) as total FROM expenses 
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, openedAt]
  );
  const expensesCash = expensesResult[0]?.total || 0;

  // Debt Payments
  const paymentsResult = await db.select<{total: number}[]>(
    `SELECT SUM(amount) as total FROM customer_payments 
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, openedAt]
  );
  const paymentsCash = paymentsResult[0]?.total || 0;

  return openingCash + salesCash + maintenanceCash + transfersComm + paymentsCash - expensesCash;
}

export async function closeShift(shiftId: number, expectedCash: number, closingCash: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE shifts SET 
      status = 'closed', 
      closed_at = CURRENT_TIMESTAMP, 
      expected_cash = $1, 
      closing_cash = $2 
     WHERE id = $3`,
    [expectedCash, closingCash, shiftId]
  );
}

export async function getShiftsHistory(): Promise<(Shift & { user_name: string })[]> {
  const db = await getDb();
  return await db.select<(Shift & { user_name: string })[]>(
    `SELECT s.*, u.username as user_name 
     FROM shifts s 
     LEFT JOIN users u ON s.user_id = u.id 
     ORDER BY s.opened_at DESC`
  );
}

export async function getShiftTransactions(userId: number, openedAt: string, closedAt: string | null) {
  const db = await getDb();
  
  const timeCondition = closedAt 
    ? `created_at >= $2 AND created_at <= $3` 
    : `created_at >= $2`;
  const params = closedAt ? [userId, openedAt, closedAt] : [userId, openedAt];

  const invoices = await db.select<any[]>(
    `SELECT * FROM invoices WHERE user_id = $1 AND ${timeCondition} ORDER BY created_at DESC`,
    params
  );
  
  const expenses = await db.select<any[]>(
    `SELECT * FROM expenses WHERE user_id = $1 AND ${timeCondition} ORDER BY created_at DESC`,
    params
  );

  const transfers = await db.select<any[]>(
    `SELECT * FROM money_transfers WHERE user_id = $1 AND ${timeCondition} ORDER BY created_at DESC`,
    params
  );

  const maintTimeCond = closedAt 
    ? `updated_at >= $1 AND updated_at <= $2` 
    : `updated_at >= $1`;
  const maintParams = closedAt ? [openedAt, closedAt] : [openedAt];
  
  const maintenance = await db.select<any[]>(
    `SELECT * FROM maintenance WHERE status = 'delivered' AND ${maintTimeCond} ORDER BY updated_at DESC`,
    maintParams
  );

  const payments = await db.select<any[]>(
    `SELECT * FROM customer_payments WHERE user_id = $1 AND ${timeCondition} ORDER BY created_at DESC`,
    params
  );

  return { invoices, expenses, transfers, maintenance, payments };
}
