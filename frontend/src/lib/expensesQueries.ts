import { getDb } from './db';

export interface Expense {
  id?: number;
  user_id: number;
  capital_id: number;
  amount: number;
  description: string;
  created_at?: string;
  user_name?: string;
  username?: string;
  capital_name?: string;
}

export async function addExpense(userId: number, capitalId: number, amount: number, description: string) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    // Update capital balance (withdraw)
    await db.execute(
      `UPDATE capitals SET balance = balance - $1 WHERE id = $2`,
      [amount, capitalId]
    );
    
    // Record expense
    await db.execute(
      `INSERT INTO expenses (user_id, capital_id, amount, description) VALUES ($1, $2, $3, $4)`,
      [userId, capitalId, amount, description]
    );

    // Record capital transaction
    await db.execute(
      `INSERT INTO capital_transactions (capital_id, user_id, amount, type, description) 
       VALUES ($1, $2, $3, 'withdrawal', $4)`,
      [capitalId, userId, amount, `مصروفات: ${description}`]
    );

    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

export async function getTodayExpenses(startDate?: string, endDate?: string) {
  const db = await getDb();
  
  let dateCondition = "";
  let params: any[] = [];
  
  if (startDate && endDate) {
    dateCondition = "WHERE e.created_at >= $1 AND e.created_at <= $2";
    params = [startDate, endDate];
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString().replace('T', ' ').substring(0, 19);
    dateCondition = "WHERE e.created_at >= $1";
    params = [startOfDay];
  }

  return await db.select<Expense[]>(
    `SELECT e.*, u.username, c.name as capital_name 
     FROM expenses e
     LEFT JOIN users u ON e.user_id = u.id
     LEFT JOIN capitals c ON e.capital_id = c.id
     ${dateCondition}
     ORDER BY e.created_at DESC`,
    params
  );
}
