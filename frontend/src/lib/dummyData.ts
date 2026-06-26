import { getDb, initDb } from './db';

export async function injectDummyData() {
  const db = await getDb();

  // Clear existing data (for developers testing) - wrapped in try/catch to ignore missing tables
  const tablesToClear = [
    'invoice_items', 'invoices', 'maintenance_parts', 'maintenance', 'money_transfers',
    'expenses', 'customer_payments', 'shifts', 
    'inventory', 'customers', 'capital_transactions'
  ];
  for (const table of tablesToClear) {
    try {
      await db.execute(`DROP TABLE IF EXISTS ${table}`);
    } catch (e) {
      console.warn(`Could not clear ${table}`, e);
    }
  }

  // Re-initialize the database schemas cleanly
  await initDb();

  // Ensure capitals exist (will be created by initDb, just update balances)
  await db.execute(`UPDATE capitals SET balance = 50000 WHERE id = 1`);
  await db.execute(`UPDATE capitals SET balance = 10000 WHERE id = 2`);
  await db.execute(`UPDATE capitals SET balance = 5000 WHERE id = 3`);

  // Categories
  // 1: هواتف, 2: إكسسوارات, 3: قطع غيار, 4: أخرى (already created in initDb usually, but let's just insert products mapping to them)

  // 2. Insert Inventory
  const dummyProducts = [
    { name: 'iPhone 15 Pro Max 256GB', cat: 'هواتف جديدة', barcode: '10001', cost: 45000, sell: 48000, stock: 5 },
    { name: 'Samsung Galaxy S24 Ultra', cat: 'هواتف جديدة', barcode: '10002', cost: 40000, sell: 43000, stock: 8 },
    { name: 'Xiaomi Redmi Note 13', cat: 'هواتف جديدة', barcode: '10003', cost: 8000, sell: 8800, stock: 15 },
    { name: 'AirPods Pro 2nd Gen', cat: 'إكسسوارات', barcode: '20001', cost: 8000, sell: 9500, stock: 10 },
    { name: 'شاحن سامسونج أصلي 25W', cat: 'إكسسوارات', barcode: '20002', cost: 350, sell: 500, stock: 30 },
    { name: 'وصلة Type-C To Type-C Anker', cat: 'إكسسوارات', barcode: '20003', cost: 150, sell: 250, stock: 50 },
    { name: 'اسكرينة زجاج آيفون 13', cat: 'إكسسوارات', barcode: '20004', cost: 20, sell: 100, stock: 100 },
    { name: 'جراب شفاف سامسونج A54', cat: 'إكسسوارات', barcode: '20005', cost: 30, sell: 150, stock: 40 },
    { name: 'شاشة آيفون 11 أصلية خلع', cat: 'قطع غيار', barcode: '30001', cost: 2000, sell: 2800, stock: 2 },
    { name: 'بطارية سامسونج S20+', cat: 'قطع غيار', barcode: '30002', cost: 400, sell: 700, stock: 4 },
  ];

  for (const p of dummyProducts) {
    await db.execute(
      `INSERT INTO inventory (name, category, barcode, cost_price, selling_price, quantity, min_stock)
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
    `INSERT INTO maintenance (customer_id, technician_id, device_model, issue_description, status, estimated_cost)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [1, userId, 'iPhone 11', 'تغيير شاشة مكسورة', 'in_progress', 3000]
  );
  await db.execute(
    `INSERT INTO maintenance (customer_id, technician_id, device_model, issue_description, status, estimated_cost, final_cost, spare_parts_cost)
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
    `INSERT INTO invoice_items (invoice_id, inventory_id, quantity, unit_price, cost_price)
     VALUES ($1, $2, $3, $4, $5)`,
    [inv1.lastInsertId, 5, 2, 500, 350]
  );

  const inv2 = await db.execute(
    `INSERT INTO invoices (customer_id, user_id, total_amount, discount, paid_amount, payment_method)
     VALUES ($1, $2, $3, $4, $5, 'cash')`,
    [null, userId, 150, 0, 150]
  );
  await db.execute(
    `INSERT INTO invoice_items (invoice_id, inventory_id, quantity, unit_price, cost_price)
     VALUES ($1, $2, $3, $4, $5)`,
    [inv2.lastInsertId, 8, 1, 150, 30]
  );

  // 8. Insert Expenses
  await db.execute(
    `INSERT INTO expenses (user_id, capital_id, amount, description) VALUES ($1, $2, $3, $4)`,
    [userId, 1, 150, 'بوفيه وفطار']
  );
  await db.execute(
    `INSERT INTO expenses (user_id, capital_id, amount, description) VALUES ($1, $2, $3, $4)`,
    [userId, 3, 50, 'شحن كهرباء للمحل']
  );

  // 9. Insert Money Transfers (Vodafone Cash, etc.)
  await db.execute(
    `INSERT INTO money_transfers (user_id, type, commission) VALUES ($1, $2, $3)`,
    [userId, 'إيداع فودافون كاش', 15]
  );
  await db.execute(
    `INSERT INTO money_transfers (user_id, type, commission) VALUES ($1, $2, $3)`,
    [userId, 'سحب اتصالات كاش', 10]
  );

  // 10. Insert Customer Payments (Debt Repayment)
  await db.execute(
    `INSERT INTO customer_payments (customer_id, user_id, amount) VALUES ($1, $2, $3)`,
    [1, userId, 200]
  );

  return true;
}
