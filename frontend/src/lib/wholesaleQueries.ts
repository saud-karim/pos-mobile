import { getDb } from './db';

// --- Capital Queries (Goods and Wholesale Capital ID = 1) ---
export async function getWholesaleCapital() {
  const db = await getDb();
  const res = await db.select<{ balance: number }[]>('SELECT balance FROM capitals WHERE id = 1');
  return res[0]?.balance || 0;
}

export async function getWholesaleCapitalTransactions() {
  const db = await getDb();
  return await db.select<any[]>('SELECT t.*, u.username as user_name FROM capital_transactions t JOIN users u ON t.user_id = u.id WHERE t.capital_id = 1 ORDER BY t.created_at DESC');
}

export async function addWholesaleCapitalTransaction(userId: number, amount: number, type: 'deposit' | 'withdrawal', description: string) {
  const db = await getDb();
  // Using direct updates
  await db.execute(
    'INSERT INTO capital_transactions (capital_id, user_id, amount, type, description) VALUES (1, $1, $2, $3, $4)',
    [userId, amount, type, description]
  );

  const change = type === 'deposit' ? amount : -amount;
  await db.execute(
    'UPDATE capitals SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
    [change]
  );
}

// --- Merchants Queries ---
export async function getWholesaleMerchants(type?: 'supplier' | 'client' | 'both', page: number = 1, limit: number = 20) {
  const db = await getDb();
  let query = 'SELECT * FROM wholesale_merchants WHERE is_active = 1';
  let countQuery = 'SELECT COUNT(*) as total FROM wholesale_merchants WHERE is_active = 1';
  const params: any[] = [];
  if (type) {
    query += ' AND (type = $1 OR type = "both")';
    countQuery += ' AND (type = $1 OR type = "both")';
    params.push(type);
  }
  query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  
  const offset = (page - 1) * limit;
  const totalRes = await db.select<{total: number}[]>(countQuery, params);
  const total = totalRes[0]?.total || 0;

  const data = await db.select<any[]>(query, [...params, limit, offset]);
  return { data, total, page, limit };
}

export async function addWholesaleMerchant(merchant: { name: string, phone: string | null, type: string }) {
  const db = await getDb();
  return await db.execute(
    'INSERT INTO wholesale_merchants (name, phone, type) VALUES ($1, $2, $3)',
    [merchant.name, merchant.phone, merchant.type]
  );
}

export async function updateWholesaleMerchant(id: number, merchant: { name: string, phone: string | null, type: string }) {
  const db = await getDb();
  return await db.execute(
    'UPDATE wholesale_merchants SET name = $1, phone = $2, type = $3 WHERE id = $4',
    [merchant.name, merchant.phone, merchant.type, id]
  );
}

export async function deleteWholesaleMerchant(id: number) {
  const db = await getDb();
  const orders = await db.select<{count: number}[]>('SELECT COUNT(*) as count FROM wholesale_orders WHERE merchant_id = $1', [id]);
  if (orders[0].count > 0) {
    throw new Error('لا يمكن حذف التاجر لأن لديه فواتير وعمليات مسجلة. (يُفضل تصفية حسابه فقط)');
  }
  return await db.execute('UPDATE wholesale_merchants SET is_active = 0 WHERE id = $1', [id]);
}

export async function updateMerchantBalance(merchantId: number, amount: number) {
  const db = await getDb();
  return await db.execute(
    'UPDATE wholesale_merchants SET balance = balance + $1 WHERE id = $2',
    [amount, merchantId]
  );
}

export async function addMerchantPayment(merchantId: number, userId: number, amount: number, paymentType: 'receive' | 'pay') {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    const balanceChange = paymentType === 'receive' ? -amount : amount;
    const capitalChange = paymentType === 'receive' ? amount : -amount;

    await db.execute(
      'UPDATE wholesale_merchants SET balance = balance + $1 WHERE id = $2',
      [balanceChange, merchantId]
    );

    await db.execute(
      'UPDATE capitals SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [capitalChange]
    );

    await db.execute(
      'INSERT INTO capital_transactions (capital_id, user_id, amount, type, description) VALUES (1, $1, $2, $3, $4)',
      [userId, amount, paymentType === 'receive' ? 'deposit' : 'withdrawal', paymentType === 'receive' ? `تحصيل دفعة من ديون التاجر #${merchantId}` : `تسديد دفعة لمديونية التاجر #${merchantId}`]
    );

    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

// --- Inventory Queries ---
export async function getWholesaleInventory(search?: string, page: number = 1, limit: number = 20) {
  const db = await getDb();
  let query = 'SELECT * FROM inventory';
  let countQuery = 'SELECT COUNT(*) as total FROM inventory';
  const params: any[] = [];
  if (search) {
    query += ' WHERE name LIKE $1 OR barcode LIKE $1';
    countQuery += ' WHERE name LIKE $1 OR barcode LIKE $1';
    params.push(`%${search}%`);
  }
  query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  
  const offset = (page - 1) * limit;
  const totalRes = await db.select<{total: number}[]>(countQuery, params);
  const total = totalRes[0]?.total || 0;

  const data = await db.select<any[]>(query, [...params, limit, offset]);
  return { data, total, page, limit };
}

export async function addWholesaleProduct(product: { category: string, name: string, barcode: string | null, quantity: number, cost_price: number, selling_price: number, retail_price: number, min_stock: number }) {
  const db = await getDb();
  return await db.execute(
    'INSERT INTO inventory (category, name, barcode, quantity, cost_price, selling_price, retail_price, min_stock) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [product.category || 'أخرى', product.name, product.barcode, product.quantity, product.cost_price, product.selling_price, product.retail_price, product.min_stock]
  );
}

export async function updateWholesaleProduct(id: number, product: { category: string, name: string, barcode: string | null, cost_price: number, selling_price: number, retail_price: number, min_stock: number }) {
  const db = await getDb();
  return await db.execute(
    'UPDATE inventory SET category = $1, name = $2, barcode = $3, cost_price = $4, selling_price = $5, retail_price = $6, min_stock = $7 WHERE id = $8',
    [product.category || 'أخرى', product.name, product.barcode, product.cost_price, product.selling_price, product.retail_price, product.min_stock, id]
  );
}

export async function deleteWholesaleProduct(id: number) {
  const db = await getDb();
  const invRes = await db.select<{count: number}[]>('SELECT COUNT(*) as count FROM invoice_items WHERE inventory_id = $1', [id]);
  const whRes = await db.select<{count: number}[]>('SELECT COUNT(*) as count FROM wholesale_order_items WHERE inventory_id = $1', [id]);
  if (invRes[0].count > 0 || whRes[0].count > 0) {
    throw new Error('لا يمكن حذف الصنف لوجود فواتير مرتبطة به. يمكنك فقط تعديل الكمية إلى صفر.');
  }
  return await db.execute('DELETE FROM inventory WHERE id = $1', [id]);
}

// --- Orders Queries (Purchases & Sales) ---
export async function createWholesaleOrder(
  merchantId: number,
  userId: number,
  type: 'purchase' | 'sale',
  items: { id: number, quantity: number, unit_price: number, cost_price: number }[],
  totalAmount: number,
  paidAmount: number
) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  
  try {
    // 1. Create Order
    const orderRes = await db.execute(
      'INSERT INTO wholesale_orders (merchant_id, user_id, type, total_amount, paid_amount) VALUES ($1, $2, $3, $4, $5)',
      [merchantId, userId, type, totalAmount, paidAmount]
    );
    const orderId = orderRes.lastInsertId;

    // 2. Add Items & Update Inventory
    for (const item of items) {
      await db.execute(
        'INSERT INTO wholesale_order_items (order_id, inventory_id, quantity, unit_price, cost_price) VALUES ($1, $2, $3, $4, $5)',
        [orderId, item.id, item.quantity, item.unit_price, item.cost_price]
      );

      const qtyChange = type === 'purchase' ? item.quantity : -item.quantity;
      await db.execute(
        'UPDATE inventory SET quantity = quantity + $1 WHERE id = $2',
        [qtyChange, item.id]
      );
    }

    // 3. Update Merchant Balance
    const unpaidAmount = totalAmount - paidAmount;
    const balanceChange = type === 'sale' ? unpaidAmount : -unpaidAmount;
    
    if (unpaidAmount > 0) {
      await db.execute(
        'UPDATE wholesale_merchants SET balance = balance + $1 WHERE id = $2',
        [balanceChange, merchantId]
      );
    }

    // 4. Update Wholesale Capital
    if (paidAmount > 0) {
      const capitalChange = type === 'sale' ? paidAmount : -paidAmount;
      await db.execute(
        'UPDATE capitals SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [capitalChange]
      );
      
      // Log transaction
      await db.execute(
        'INSERT INTO capital_transactions (capital_id, user_id, amount, type, description) VALUES (1, $1, $2, $3, $4)',
        [userId, paidAmount, type === 'sale' ? 'deposit' : 'withdrawal', type === 'sale' ? `دفعة من بيع فاتورة #${orderId}` : `دفعة لشراء فاتورة #${orderId}`]
      );
    }

    await db.execute('COMMIT');
    return orderId;
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

// --- Stats Queries ---
export async function getWholesaleStats() {
  const db = await getDb();
  
  // Inventory Value
  const invRes = await db.select<{ total_value: number }[]>('SELECT SUM(quantity * cost_price) as total_value FROM inventory');
  const inventoryValue = invRes[0]?.total_value || 0;

  // Debts
  const merchants = await db.select<{ balance: number }[]>('SELECT balance FROM wholesale_merchants');
  let owedToUs = 0; // Positive balances
  let weOwe = 0;    // Negative balances

  for (const m of merchants) {
    if (m.balance > 0) owedToUs += m.balance;
    if (m.balance < 0) weOwe += Math.abs(m.balance);
  }

  return { inventoryValue, owedToUs, weOwe };
}

export async function getWholesaleOrders() {
  const db = await getDb();
  return await db.select<any[]>(`
    SELECT o.*, m.name as merchant_name, u.username as user_name 
    FROM wholesale_orders o 
    JOIN wholesale_merchants m ON o.merchant_id = m.id 
    JOIN users u ON o.user_id = u.id 
    ORDER BY o.created_at DESC
  `);
}

export async function getWholesaleOrderItems(orderId: number) {
  const db = await getDb();
  return await db.select<any[]>(`
    SELECT i.*, p.name as product_name, p.barcode 
    FROM wholesale_order_items i 
    JOIN inventory p ON i.inventory_id = p.id 
    WHERE i.order_id = $1
  `, [orderId]);
}
