import { getDb } from './db';

// --- Capital Queries ---
export async function getWholesaleCapital() {
  const db = await getDb();
  const res = await db.select<{ balance: number }[]>('SELECT balance FROM wholesale_capital WHERE id = 1');
  return res[0]?.balance || 0;
}

export async function getWholesaleCapitalTransactions() {
  const db = await getDb();
  return await db.select<any[]>('SELECT t.*, u.username as user_name FROM wholesale_transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC');
}

export async function addWholesaleCapitalTransaction(userId: number, amount: number, type: 'deposit' | 'withdrawal', description: string) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    await db.execute(
      'INSERT INTO wholesale_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
      [userId, amount, type, description]
    );

    const change = type === 'deposit' ? amount : -amount;
    await db.execute(
      'UPDATE wholesale_capital SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [change]
    );
    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

// --- Merchants Queries ---
export async function getWholesaleMerchants(type?: 'supplier' | 'client' | 'both') {
  const db = await getDb();
  let query = 'SELECT * FROM wholesale_merchants';
  const params: any[] = [];
  if (type) {
    query += ' WHERE type = $1 OR type = "both"';
    params.push(type);
  }
  query += ' ORDER BY name ASC';
  return await db.select<any[]>(query, params);
}

export async function addWholesaleMerchant(merchant: { name: string, phone: string | null, type: string }) {
  const db = await getDb();
  return await db.execute(
    'INSERT INTO wholesale_merchants (name, phone, type) VALUES ($1, $2, $3)',
    [merchant.name, merchant.phone, merchant.type]
  );
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
    // If we receive money from client: balance decreases (they owe us less), capital increases (deposit).
    // If we pay money to supplier: balance increases (we owe them less, negative goes up), capital decreases (withdrawal).
    const balanceChange = paymentType === 'receive' ? -amount : amount;
    const capitalChange = paymentType === 'receive' ? amount : -amount;

    await db.execute(
      'UPDATE wholesale_merchants SET balance = balance + $1 WHERE id = $2',
      [balanceChange, merchantId]
    );

    await db.execute(
      'UPDATE wholesale_capital SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [capitalChange]
    );

    await db.execute(
      'INSERT INTO wholesale_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
      [userId, amount, paymentType === 'receive' ? 'deposit' : 'withdrawal', paymentType === 'receive' ? `تحصيل دفعة من ديون التاجر #${merchantId}` : `تسديد دفعة لمديونية التاجر #${merchantId}`]
    );

    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

// --- Inventory Queries ---
export async function getWholesaleInventory(search?: string) {
  const db = await getDb();
  let query = 'SELECT * FROM wholesale_inventory';
  const params: any[] = [];
  if (search) {
    query += ' WHERE name LIKE $1 OR barcode LIKE $1';
    params.push(`%${search}%`);
  }
  query += ' ORDER BY name ASC';
  return await db.select<any[]>(query, params);
}

export async function addWholesaleProduct(product: { name: string, barcode: string | null, quantity: number, cost_price: number, wholesale_price: number, min_stock: number }) {
  const db = await getDb();
  return await db.execute(
    'INSERT INTO wholesale_inventory (name, barcode, quantity, cost_price, wholesale_price, min_stock) VALUES ($1, $2, $3, $4, $5, $6)',
    [product.name, product.barcode, product.quantity, product.cost_price, product.wholesale_price, product.min_stock]
  );
}

export async function updateWholesaleProduct(id: number, product: { name: string, barcode: string | null, cost_price: number, wholesale_price: number, min_stock: number }) {
  const db = await getDb();
  return await db.execute(
    'UPDATE wholesale_inventory SET name = $1, barcode = $2, cost_price = $3, wholesale_price = $4, min_stock = $5 WHERE id = $6',
    [product.name, product.barcode, product.cost_price, product.wholesale_price, product.min_stock, id]
  );
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
        'INSERT INTO wholesale_order_items (order_id, wholesale_inventory_id, quantity, unit_price, cost_price) VALUES ($1, $2, $3, $4, $5)',
        [orderId, item.id, item.quantity, item.unit_price, item.cost_price]
      );

      const qtyChange = type === 'purchase' ? item.quantity : -item.quantity;
      await db.execute(
        'UPDATE wholesale_inventory SET quantity = quantity + $1 WHERE id = $2',
        [qtyChange, item.id]
      );
    }

    // 3. Update Merchant Balance
    // If purchase (we buy): total_amount increases what we owe them (negative balance). paid_amount decreases it.
    // So balance change for supplier = -(total_amount - paid_amount) -> negative means we owe them.
    // If sale (we sell): total_amount increases what they owe us (positive balance). paid_amount decreases it.
    // So balance change for client = (total_amount - paid_amount)
    const unpaidAmount = totalAmount - paidAmount;
    const balanceChange = type === 'sale' ? unpaidAmount : -unpaidAmount;
    
    if (unpaidAmount > 0) {
      await db.execute(
        'UPDATE wholesale_merchants SET balance = balance + $1 WHERE id = $2',
        [balanceChange, merchantId]
      );
    }

    // 4. Update Wholesale Capital
    // If purchase: we paid money out of capital, so capital decreases by paidAmount
    // If sale: we received money into capital, so capital increases by paidAmount
    if (paidAmount > 0) {
      const capitalChange = type === 'sale' ? paidAmount : -paidAmount;
      await db.execute(
        'UPDATE wholesale_capital SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [capitalChange]
      );
      
      // Log transaction
      await db.execute(
        'INSERT INTO wholesale_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
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
  const invRes = await db.select<{ total_value: number }[]>('SELECT SUM(quantity * cost_price) as total_value FROM wholesale_inventory');
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
    JOIN wholesale_inventory p ON i.wholesale_inventory_id = p.id 
    WHERE i.order_id = $1
  `, [orderId]);
}
