import { getDb } from './db';

export interface Customer {
  id?: number;
  name: string;
  phone: string | null;
  national_id: string | null;
  credit_balance: number;
  capital_id?: number;
  created_at?: string;
}

export async function addCustomer(customer: Customer, userId: number) {
  const db = await getDb();
  const capital_id = customer.capital_id || 1;
  const result = await db.execute(
    `INSERT INTO customers (name, phone, national_id, credit_balance, capital_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [customer.name, customer.phone || null, customer.national_id || null, customer.credit_balance || 0, capital_id]
  );

  // Removed capital withdrawal for opening balance. It is just an opening debt.

  return result.lastInsertId;
}

export async function getCustomers(searchQuery?: string, page: number = 1, limit: number = 20) {
  const db = await getDb();
  let query = `SELECT * FROM customers WHERE is_active = 1`;
  let countQuery = `SELECT COUNT(*) as total FROM customers WHERE is_active = 1`;
  const params: any[] = [];

  if (searchQuery) {
    query += ` AND (name LIKE $1 OR phone LIKE $1 OR national_id LIKE $1)`;
    countQuery += ` AND (name LIKE $1 OR phone LIKE $1 OR national_id LIKE $1)`;
    params.push(`%${searchQuery}%`);
  }

  query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  
  const offset = (page - 1) * limit;
  const totalRes = await db.select<{total: number}[]>(countQuery, params);
  const total = totalRes[0]?.total || 0;

  const data = await db.select<Customer[]>(query, [...params, limit, offset]);
  return { data, total, page, limit };
}

export async function updateCustomerBalance(customerId: number, amountChange: number) {
  const db = await getDb();
  return await db.execute(
    `UPDATE customers SET credit_balance = credit_balance + $1 WHERE id = $2`,
    [amountChange, customerId]
  );
}

// Add a payment record
export async function addCustomerPayment(customerId: number, userId: number, amount: number, customerName: string) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    const custRes = await db.select<{capital_id: number}[]>('SELECT capital_id FROM customers WHERE id = $1', [customerId]);
    const capitalId = custRes.length > 0 ? custRes[0].capital_id || 1 : 1;

    // Update customer balance (decrease debt)
    await db.execute(
      `UPDATE customers SET credit_balance = credit_balance - $1 WHERE id = $2`,
      [amount, customerId]
    );
    
    // Log payment
    await db.execute(
      `INSERT INTO customer_payments (customer_id, user_id, amount) VALUES ($1, $2, $3)`,
      [customerId, userId, amount]
    );

    // Deposit to capital
    await db.execute(
      `UPDATE capitals SET balance = balance + $1 WHERE id = $2`,
      [amount, capitalId]
    );
    await db.execute(
      `INSERT INTO capital_transactions (capital_id, user_id, type, amount, description) VALUES ($1, $2, 'deposit', $3, $4)`,
      [capitalId, userId, amount, `تسديد دفعة من العميل ${customerName}`]
    );

    // Distribute payment to unpaid retail invoices
    const unpaidInvoices = await db.select<any[]>(`
      SELECT id, total_amount, discount, paid_amount 
      FROM invoices 
      WHERE customer_id = $1 AND paid_amount < (total_amount - COALESCE(discount, 0))
      ORDER BY created_at ASC
    `, [customerId]);

    let remainingPayment = amount;
    for (const invoice of unpaidInvoices) {
      if (remainingPayment <= 0) break;
      
      const unpaidAmount = (invoice.total_amount - (invoice.discount || 0)) - invoice.paid_amount;
      if (unpaidAmount > 0) {
        const amountToApply = Math.min(unpaidAmount, remainingPayment);
        await db.execute(
          'UPDATE invoices SET paid_amount = paid_amount + $1 WHERE id = $2',
          [amountToApply, invoice.id]
        );
        remainingPayment -= amountToApply;
      }
    }

    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

export async function increaseCustomerDebt(customerId: number, userId: number, amount: number, customerName: string) {
  const db = await getDb();
  const custRes = await db.select<{capital_id: number}[]>('SELECT capital_id FROM customers WHERE id = $1', [customerId]);
  const capitalId = custRes.length > 0 ? custRes[0].capital_id || 1 : 1;

  // Update customer balance (increase debt)
  await updateCustomerBalance(customerId, amount);
  
  // Withdraw from capital
  await db.execute(
    `UPDATE capitals SET balance = balance - $1 WHERE id = $2`,
    [amount, capitalId]
  );
  await db.execute(
    `INSERT INTO capital_transactions (capital_id, user_id, type, amount, description) VALUES ($1, $2, 'withdrawal', $3, $4)`,
    [capitalId, userId, amount, `إضافة مديونية على العميل ${customerName}`]
  );
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  await db.execute(`UPDATE customers SET is_active = 0 WHERE id = $1`, [id]);
}
