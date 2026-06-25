import Database from '@tauri-apps/plugin-sql';

const DB_NAME = 'sqlite:pos_mobile.db';

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inventory Categories
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL -- 'new_phone', 'used_phone', 'accessory', 'spare_part'
    )
  `);

  // Products (Inventory)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      barcode TEXT,
      imei TEXT UNIQUE, -- Mainly for phones
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )
  `);

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
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (maintenance_id) REFERENCES maintenance (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);

  // Money Transfers & Recharges
  await db.execute(`
    CREATE TABLE IF NOT EXISTS money_transfers (
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

  // Sales/Invoices
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      user_id INTEGER,
      total_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      paid_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash', -- cash, visa, wallet, credit
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Invoice Items
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL, -- snapshot of cost price at the time of sale for accurate profit
      FOREIGN KEY (invoice_id) REFERENCES invoices (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
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
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
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

  // Insert default categories if none exist
  const catCount = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM categories');
  if (catCount[0].count === 0) {
    await db.execute(`
      INSERT INTO categories (name, type) VALUES 
      ('هواتف جديدة', 'new_phone'),
      ('هواتف مستعملة', 'used_phone'),
      ('إكسسوارات', 'accessory'),
      ('قطع غيار', 'spare_part')
    `);
  }

  // --- Wholesale Module (قسم الجملة) ---

  // 1. Wholesale Capital
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wholesale_capital (
      id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row allowed
      balance REAL NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Initialize wholesale_capital with 0 if not exists
  const capCount = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM wholesale_capital');
  if (capCount[0].count === 0) {
    await db.execute('INSERT INTO wholesale_capital (id, balance) VALUES (1, 0)');
  }

  // 2. Wholesale Transactions (Ledger for capital)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wholesale_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- 'deposit', 'withdrawal'
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // 3. Wholesale Merchants (Suppliers & Clients)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wholesale_merchants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      type TEXT NOT NULL, -- 'supplier', 'client', 'both'
      balance REAL DEFAULT 0, -- Positive = they owe us, Negative = we owe them
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Wholesale Inventory
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wholesale_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL,
      wholesale_price REAL NOT NULL,
      min_stock INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Wholesale Orders (Purchases & Sales)
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

  // 6. Wholesale Order Items
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wholesale_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      wholesale_inventory_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL, -- Snapshot of cost at time of order
      FOREIGN KEY (order_id) REFERENCES wholesale_orders (id),
      FOREIGN KEY (wholesale_inventory_id) REFERENCES wholesale_inventory (id)
    )
  `);

  return db;
}

export async function getDb() {
  return await Database.load(DB_NAME);
}
