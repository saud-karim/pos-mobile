import { getDb } from './db';

export interface Transfer {
  id?: number;
  user_id: number;
  type: string;
  phone_number: string;
  amount: number;
  commission: number;
  created_at?: string;
  user_name?: string;
}

export async function addTransfer(transfer: Transfer) {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO money_transfers (user_id, type, phone_number, amount, commission)
     VALUES ($1, $2, $3, $4, $5)`,
    [transfer.user_id, transfer.type, transfer.phone_number, transfer.amount, transfer.commission]
  );
  return result.lastInsertId;
}

export async function getTransfers(limit: number = 50) {
  const db = await getDb();
  return await db.select<Transfer[]>(
    `SELECT m.*, u.username as user_name 
     FROM money_transfers m
     LEFT JOIN users u ON m.user_id = u.id
     ORDER BY m.created_at DESC
     LIMIT $1`,
    [limit]
  );
}

export async function getTodayCommissions() {
  const db = await getDb();
  const result = await db.select<{total: number}[]>(
    `SELECT SUM(commission) as total FROM money_transfers WHERE date(created_at) = date('now')`
  );
  return result[0]?.total || 0;
}
