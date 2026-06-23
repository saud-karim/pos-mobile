import { getDb } from './db';

export async function injectDummyData() {
  const db = await getDb();

  // Clear existing data (for developers testing) - wrapped in try/catch to ignore missing tables
  const tablesToClear = [
    'invoice_items', 'invoices', 'maintenance', 'money_transfers',
    'expenses', 'customer_payments', 'shifts', 
    'products', 'customers'
  ];
  for (const table of tablesToClear) {
    try {
      await db.execute(`DELETE FROM ${table}`);
    } catch (e) {
      console.warn(`Could not clear ${table}`, e);
    }
  }

  // Fix money_transfers schema if it was old
  await db.execute('DROP TABLE IF EXISTS money_transfers');
  await db.execute(`
    CREATE TABLE money_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      phone_number TEXT,
      amount REAL NOT NULL,
      commission REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Categories
  // 1: هواتف, 2: إكسسوارات, 3: قطع غيار, 4: أخرى (already created in initDb usually, but let's just insert products mapping to them)

  // 2. Insert Products
  const dummyProducts = [
    { name: 'iPhone 15 Pro Max 256GB', cat: 1, barcode: '10001', cost: 45000, sell: 48000, stock: 5 },
    { name: 'Samsung Galaxy S24 Ultra', cat: 1, barcode: '10002', cost: 40000, sell: 43000, stock: 8 },
    { name: 'Xiaomi Redmi Note 13', cat: 1, barcode: '10003', cost: 8000, sell: 8800, stock: 15 },
    { name: 'AirPods Pro 2nd Gen', cat: 2, barcode: '20001', cost: 8000, sell: 9500, stock: 10 },
    { name: 'شاحن سامسونج أصلي 25W', cat: 2, barcode: '20002', cost: 350, sell: 500, stock: 30 },
    { name: 'وصلة Type-C To Type-C Anker', cat: 2, barcode: '20003', cost: 150, sell: 250, stock: 50 },
    { name: 'اسكرينة زجاج آيفون 13', cat: 2, barcode: '20004', cost: 20, sell: 100, stock: 100 },
    { name: 'جراب شفاف سامسونج A54', cat: 2, barcode: '20005', cost: 30, sell: 150, stock: 40 },
    { name: 'شاشة آيفون 11 أصلية خلع', cat: 3, barcode: '30001', cost: 2000, sell: 2800, stock: 2 },
    { name: 'بطارية سامسونج S20+', cat: 3, barcode: '30002', cost: 400, sell: 700, stock: 4 },
  ];

  for (const p of dummyProducts) {
    await db.execute(
      `INSERT INTO products (name, category_id, barcode, cost_price, selling_price, stock_quantity, min_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [p.name, p.cat, p.barcode, p.cost, p.sell, p.stock, 5]
    );
  }

  // 3. Insert Customers
  const dummyCustomers = [
    { name: 'أحمد محمود', phone: '01012345678', credit: 1500 },
    { name: 'محمد علي', phone: '01112345678', credit: 0 },
    { name: 'مصطفى كمال', phone: '01212345678', credit: 450 },
    { name: 'شركة التوحيد (مندوب)', phone: '01512345678', credit: 5000 },
  ];

  for (const c of dummyCustomers) {
    await db.execute(
      `INSERT INTO customers (name, phone, credit_balance) VALUES ($1, $2, $3)`,
      [c.name, c.phone, c.credit]
    );
  }

  // 4. Get admin user id
  const admin = await db.select<{id: number}[]>('SELECT id FROM users LIMIT 1');
  const userId = admin.length > 0 ? admin[0].id : 1;

  // 5. Insert Maintenance Jobs
  await db.execute(
    `INSERT INTO maintenance (customer_id, user_id, device_model, issue_description, status, estimated_cost)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [1, userId, 'iPhone 11', 'تغيير شاشة مكسورة', 'in_progress', 3000]
  );
  await db.execute(
    `INSERT INTO maintenance (customer_id, user_id, device_model, issue_description, status, estimated_cost, final_cost, spare_parts_cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [2, userId, 'Samsung A52', 'تغيير سوكت شحن', 'delivered', 250, 250, 50]
  );

  // 6. Insert Shift
  await db.execute(
    `INSERT INTO shifts (user_id, opening_cash, status) VALUES ($1, $2, 'open')`,
    [userId, 500]
  );

  // 7. Insert Invoices
  const inv1 = await db.execute(
    `INSERT INTO invoices (customer_id, user_id, total_amount, discount, paid_amount, payment_method)
     VALUES ($1, $2, $3, $4, $5, 'cash')`,
    [1, userId, 1000, 50, 950]
  );
  await db.execute(
    `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, cost_price)
     VALUES ($1, $2, $3, $4, $5)`,
    [inv1.lastInsertId, 5, 2, 500, 350]
  );

  const inv2 = await db.execute(
    `INSERT INTO invoices (customer_id, user_id, total_amount, discount, paid_amount, payment_method)
     VALUES ($1, $2, $3, $4, $5, 'cash')`,
    [null, userId, 150, 0, 150]
  );
  await db.execute(
    `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, cost_price)
     VALUES ($1, $2, $3, $4, $5)`,
    [inv2.lastInsertId, 8, 1, 150, 30]
  );

  // 8. Insert Expenses
  await db.execute(
    `INSERT INTO expenses (user_id, amount, description) VALUES ($1, $2, $3)`,
    [userId, 150, 'بوفيه وفطار']
  );
  await db.execute(
    `INSERT INTO expenses (user_id, amount, description) VALUES ($1, $2, $3)`,
    [userId, 50, 'شحن كهرباء']
  );

  // 9. Insert Money Transfers (Vodafone Cash, etc.)
  await db.execute(
    `INSERT INTO money_transfers (user_id, type, phone_number, amount, commission) VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'إيداع فودافون كاش', '01012345678', 1000, 15]
  );
  await db.execute(
    `INSERT INTO money_transfers (user_id, type, phone_number, amount, commission) VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'سحب اتصالات كاش', '01112345678', 500, 10]
  );

  // 10. Insert Customer Payments (Debt Repayment)
  await db.execute(
    `INSERT INTO customer_payments (customer_id, user_id, amount) VALUES ($1, $2, $3)`,
    [1, userId, 200]
  );

  return true;
}
