import { getDb } from './db';
import { Product } from './inventoryQueries';

export interface CartItem extends Product {
  cart_quantity: number;
}

export async function createInvoice(
  customerId: number | null,
  userId: number,
  cart: CartItem[],
  totalAmount: number,
  discount: number,
  paidAmount: number,
  paymentMethod: string
) {
  const db = await getDb();
  
  // Calculate debt
  const finalTotal = totalAmount - discount;
  const debt = finalTotal - paidAmount;
  
  // Create Invoice
  const invoiceResult = await db.execute(
    `INSERT INTO invoices (customer_id, user_id, total_amount, discount, paid_amount, payment_method)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [customerId, userId, totalAmount, discount, paidAmount, paymentMethod]
  );
  
  const invoiceId = invoiceResult.lastInsertId;

  // Insert Invoice Items & Update Stock
  for (const item of cart) {
    await db.execute(
      `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, cost_price)
       VALUES ($1, $2, $3, $4, $5)`,
      [invoiceId, item.id, item.cart_quantity, item.selling_price, item.cost_price]
    );

    // Deduct from stock
    await db.execute(
      `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
      [item.cart_quantity, item.id]
    );
  }

  // Update customer debt if applicable
  if (customerId && debt > 0) {
    await db.execute(
      `UPDATE customers SET credit_balance = credit_balance + $1 WHERE id = $2`,
      [debt, customerId]
    );
  }

  return invoiceId;
}

export async function searchProductsPos(query: string) {
  const db = await getDb();
  const searchParam = `%${query}%`;
  return await db.select<Product[]>(
    `SELECT * FROM products WHERE name LIKE $1 OR barcode LIKE $1 OR imei LIKE $1 LIMIT 20`,
    [searchParam]
  );
}

export async function getProductByBarcode(barcode: string) {
  const db = await getDb();
  const products = await db.select<Product[]>(
    `SELECT * FROM products WHERE barcode = $1 OR imei = $1 LIMIT 1`,
    [barcode]
  );
  return products.length > 0 ? products[0] : null;
}

export async function returnInvoice(invoiceId: number) {
  const db = await getDb();
  
  // 1. Get invoice details to know if there's customer debt
  const invoiceResult = await db.select<any[]>(
    `SELECT customer_id, total_amount, discount, paid_amount FROM invoices WHERE id = $1`,
    [invoiceId]
  );
  
  if (invoiceResult.length === 0) throw new Error('الفاتورة غير موجودة');
  const invoice = invoiceResult[0];
  const finalTotal = invoice.total_amount - invoice.discount;
  const debt = finalTotal - invoice.paid_amount;

  // 2. Reduce customer debt if this was an unpaid/partially paid invoice
  if (invoice.customer_id && debt > 0) {
    await db.execute(
      `UPDATE customers SET credit_balance = credit_balance - $1 WHERE id = $2`,
      [debt, invoice.customer_id]
    );
  }

  // 3. Get all items and restore stock
  const items = await db.select<any[]>(
    `SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1`,
    [invoiceId]
  );

  for (const item of items) {
    if (item.product_id) {
      await db.execute(
        `UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }
  }

  // 4. Delete invoice items
  await db.execute(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);

  // 5. Delete invoice
  await db.execute(`DELETE FROM invoices WHERE id = $1`, [invoiceId]);
}

export async function getPosQuickItems() {
  const db = await getDb();
  // For now, return the latest 20 items.
  // We can add a "is_quick_item" boolean to products later, but this works for demo.
  return await db.select<Product[]>(
    `SELECT * FROM products WHERE stock_quantity > 0 ORDER BY id DESC LIMIT 20`
  );
}
