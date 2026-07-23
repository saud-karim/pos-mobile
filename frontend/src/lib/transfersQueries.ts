import { getDb } from './db';

export interface Transfer {
  id?: number;
  user_id: number;
  type: string;
  commission: number;
  created_at?: string;
  user_name?: string;
}

export async function addTransfer(transfer: Transfer) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    // Add to money_transfers
    const result = await db.execute(
      `INSERT INTO money_transfers (user_id, type, commission)
       VALUES ($1, $2, $3)`,
      [transfer.user_id, transfer.type, transfer.commission]
    );
    
    // Add commission to Transfers Capital (Capital ID: 2)
    await db.execute(
      `UPDATE capitals SET balance = balance + $1 WHERE id = 2`,
      [transfer.commission]
    );
    
    // Optional: Record the transaction in capital_transactions
    await db.execute(
      `INSERT INTO capital_transactions (capital_id, user_id, amount, type, description) 
       VALUES (2, $1, $2, 'deposit', $3)`,
      [transfer.user_id, transfer.commission, `عمولة من ${transfer.type}`]
    );

    await db.execute('COMMIT');
    return result.lastInsertId;
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

export async function getTransfers(startDate?: string, endDate?: string) {
  const db = await getDb();
  let dateCondition = "";
  let params: any[] = [];
  
  if (startDate && endDate) {
    dateCondition = "WHERE m.created_at >= $1 AND m.created_at <= $2";
    params = [startDate, endDate];
  } else {
    // default to last 50 if no dates provided to not overload
    return await db.select<Transfer[]>(
      `SELECT m.*, u.username as user_name 
       FROM money_transfers m
       LEFT JOIN users u ON m.user_id = u.id
       ORDER BY m.created_at DESC
       LIMIT 50`
    );
  }

  return await db.select<Transfer[]>(
    `SELECT m.*, u.username as user_name 
     FROM money_transfers m
     LEFT JOIN users u ON m.user_id = u.id
     ${dateCondition}
     ORDER BY m.created_at DESC`,
    params
  );
}

export async function getTodayCommissions(startDate?: string, endDate?: string) {
  const db = await getDb();
  let result;
  if (startDate && endDate) {
    result = await db.select<{total: number}[]>(
      `SELECT SUM(commission) as total FROM money_transfers WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );
  } else {
    result = await db.select<{total: number}[]>(
      `SELECT SUM(commission) as total FROM money_transfers WHERE date(created_at) = date('now')`
    );
  }
  return result[0]?.total || 0;
}
