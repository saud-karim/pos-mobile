import { getDb } from './db';

export interface Expense {
  id?: number;
  user_id: number;
  amount: number;
  description: string;
  created_at?: string;
  username?: string;
}

export async function addExpense(userId: number, amount: number, description: string) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO expenses (user_id, amount, description) VALUES ($1, $2, $3)`,
    [userId, amount, description]
  );
}

export async function getTodayExpenses() {
  const db = await getDb();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString().replace('T', ' ').substring(0, 19);

  return await db.select<Expense[]>(
    `SELECT e.*, u.username 
     FROM expenses e
     LEFT JOIN users u ON e.user_id = u.id
     WHERE e.created_at >= $1
     ORDER BY e.created_at DESC`,
    [startOfDay]
  );
}
