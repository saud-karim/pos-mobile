import { getDb } from './db';

export async function getDamages(page: number = 1, limit: number = 50) {
  const db = await getDb();
  const offset = (page - 1) * limit;
  const data = await db.select<any[]>(
    `SELECT d.*, i.name as product_name, i.barcode, u.username as user_name 
     FROM damaged_goods d
     JOIN inventory i ON d.inventory_id = i.id
     JOIN users u ON d.user_id = u.id
     ORDER BY d.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  const countRes = await db.select<{count: number}[]>('SELECT COUNT(*) as count FROM damaged_goods');
  const total = countRes[0].count;

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

export async function addDamage(inventoryId: number, userId: number, quantity: number, costPrice: number, reason: string) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    // 1. Insert into damaged_goods
    await db.execute(
      'INSERT INTO damaged_goods (inventory_id, user_id, quantity, cost_price, reason) VALUES ($1, $2, $3, $4, $5)',
      [inventoryId, userId, quantity, costPrice, reason]
    );

    // 2. Reduce inventory quantity
    await db.execute(
      'UPDATE inventory SET quantity = quantity - $1 WHERE id = $2',
      [quantity, inventoryId]
    );

    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}
