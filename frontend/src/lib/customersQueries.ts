import { getDb } from './db';

export interface Customer {
  id?: number;
  name: string;
  phone: string | null;
  national_id: string | null;
  credit_balance: number;
  created_at?: string;
}

export async function addCustomer(customer: Customer) {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO customers (name, phone, national_id, credit_balance)
     VALUES ($1, $2, $3, $4)`,
    [customer.name, customer.phone || null, customer.national_id || null, customer.credit_balance || 0]
  );
  return result.lastInsertId;
}

export async function getCustomers(searchQuery?: string) {
  const db = await getDb();
  let query = `SELECT * FROM customers`;
  const params: any[] = [];

  if (searchQuery) {
    query += ` WHERE name LIKE $1 OR phone LIKE $1 OR national_id LIKE $1`;
    params.push(`%${searchQuery}%`);
  }

  query += ` ORDER BY name ASC`;

  return await db.select<Customer[]>(query, params);
}

export async function updateCustomerBalance(customerId: number, amountChange: number) {
  const db = await getDb();
  return await db.execute(
    `UPDATE customers SET credit_balance = credit_balance + $1 WHERE id = $2`,
    [amountChange, customerId]
  );
}

// Add a payment record
export async function addCustomerPayment(customerId: number, userId: number, amount: number) {
  const db = await getDb();
  
  // Update customer balance (decrease debt)
  await updateCustomerBalance(customerId, -amount);
  
  // Log payment
  await db.execute(
    `INSERT INTO customer_payments (customer_id, user_id, amount) VALUES ($1, $2, $3)`,
    [customerId, userId, amount]
  );
}
