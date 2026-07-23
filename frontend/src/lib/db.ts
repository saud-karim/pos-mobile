import Database from '@tauri-apps/plugin-sql';

const DB_NAME = 'sqlite:pos_mobile_v2.db';

export async function initDb() {
  const db = await Database.load(DB_NAME);

  // Users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Customers table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      national_id TEXT,
      credit_balance REAL DEFAULT 0,
      capital_id INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (capital_id) REFERENCES capitals (id)
    )
  `);

  try {
    await db.execute('ALTER TABLE customers ADD COLUMN capital_id INTEGER DEFAULT 1');
  } catch (e) {
    // Column exists
  }

  try {
    await db.execute('ALTER TABLE customers ADD COLUMN is_active INTEGER DEFAULT 1');
  } catch (e) {
    // Column exists
  }

  try {
    await db.execute('ALTER TABLE wholesale_order_items ADD COLUMN returned_quantity INTEGER DEFAULT 0');
  } catch (e) {
    // Column exists
  }

  // Capitals (3 types: Goods, Transfers, Maintenance)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS capitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Initialize capitals
  const capCount = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM capitals');
  if (capCount[0].count === 0) {
    await db.execute(`
      INSERT INTO capitals (id, name, balance) VALUES 
      (1, 'البضاعة والجملة', 0),
      (2, 'التحويلات', 0),
      (3, 'الصيانة', 0)
    `);
  }

  // Capital Transactions Ledger
  await db.execute(`
    CREATE TABLE IF NOT EXISTS capital_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      capital_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- 'deposit', 'withdrawal'
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (capital_id) REFERENCES capitals (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Unified Inventory
  await db.execute(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- e.g., 'هواتف جديدة', 'هواتف مستعملة', 'إكسسوارات', 'قطع غيار'
      name TEXT NOT NULL,
      barcode TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      retail_price REAL NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute('ALTER TABLE inventory ADD COLUMN retail_price REAL DEFAULT 0');
    await db.execute('UPDATE inventory SET retail_price = selling_price WHERE retail_price = 0');
  } catch (e) {
    // Column exists
  }

  // Maintenance Records
  await db.execute(`
    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      device_model TEXT NOT NULL,
      issue_description TEXT NOT NULL,
      device_password TEXT,
      status TEXT DEFAULT 'pending', -- pending, in_progress, ready, delivered, rejected
      estimated_cost REAL,
      final_cost REAL,
      spare_parts_cost REAL DEFAULT 0,
      technician_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (technician_id) REFERENCES users (id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS maintenance_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      maintenance_id INTEGER NOT NULL,
      inventory_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (maintenance_id) REFERENCES maintenance (id),
      FOREIGN KEY (inventory_id) REFERENCES inventory (id)
    )
  `);

  // Money Transfers (Refactored)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS money_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- Service name (Vodafone Cash, etc.)
      commission REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Sales/Invoices
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      cash_collected_at_sale REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash', -- cash, visa, wallet, credit
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  try {
    await db.execute('ALTER TABLE invoices ADD COLUMN cash_collected_at_sale REAL DEFAULT 0');
    await db.execute('UPDATE invoices SET cash_collected_at_sale = paid_amount WHERE cash_collected_at_sale = 0');
  } catch (e) {
    // Column exists
  }

  // Invoice Items
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      inventory_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL, -- snapshot
      FOREIGN KEY (invoice_id) REFERENCES invoices (id),
      FOREIGN KEY (inventory_id) REFERENCES inventory (id)
    )
  `);

  // Shifts / Cash Drawer
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      opening_cash REAL NOT NULL,
      closing_cash REAL,
      expected_cash REAL,
      status TEXT DEFAULT 'open', -- 'open', 'closed'
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Expenses
  await db.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      capital_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (capital_id) REFERENCES capitals (id)
    )
  `);

  // Customer Payments (Debt payments)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customer_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Insert default admin if no users exist
  const adminCount = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM users');
  if (adminCount[0].count === 0) {
    await db.execute(`
      INSERT INTO users (username, password, role) 
      VALUES ('admin', 'admin', 'admin')
    `);
  }

  // --- Wholesale Module (قسم الجملة) ---

  // Wholesale Merchants (Suppliers & Clients)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wholesale_merchants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      type TEXT NOT NULL, -- 'supplier', 'client', 'both'
      balance REAL DEFAULT 0, -- Positive = they owe us, Negative = we owe them
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute('ALTER TABLE wholesale_merchants ADD COLUMN is_active INTEGER DEFAULT 1');
  } catch (e) {
    // Column exists
  }

  // Wholesale Orders (Purchases & Sales)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wholesale_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'purchase', 'sale'
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES wholesale_merchants (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  try {
    await db.execute('ALTER TABLE wholesale_orders ADD COLUMN discount REAL DEFAULT 0');
  } catch (e) {
    // Column exists
  }

  try {
    await db.execute('ALTER TABLE wholesale_orders ADD COLUMN status TEXT DEFAULT "completed"'); // 'completed', 'returned'
  } catch (e) {
    // Column exists
  }

  try {
    await db.execute('ALTER TABLE wholesale_order_items ADD COLUMN returned_quantity INTEGER DEFAULT 0');
  } catch (e) {
    // Column exists
  }

  // Wholesale Order Items
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wholesale_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      inventory_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL, -- Snapshot
      FOREIGN KEY (order_id) REFERENCES wholesale_orders (id),
      FOREIGN KEY (inventory_id) REFERENCES inventory (id)
    )
  `);

  // Damaged Goods (الهوالك)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS damaged_goods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      cost_price REAL NOT NULL,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
  // --- Inventory Audits (نظام الجرد) ---
  await db.execute(`
    CREATE TABLE IF NOT EXISTS inventory_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, completed
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS inventory_audit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_id INTEGER NOT NULL,
      inventory_id INTEGER NOT NULL,
      expected_quantity INTEGER NOT NULL,
      actual_quantity INTEGER NOT NULL,
      cost_price REAL NOT NULL,
      FOREIGN KEY (audit_id) REFERENCES inventory_audits (id),
      FOREIGN KEY (inventory_id) REFERENCES inventory (id)
    )
  `);

  return db;
}

export async function getDb() {
  return await Database.load(DB_NAME);
}
