import { getDb } from './db';

export interface InventoryItem {
  id: number;
  category: string;
  name: string;
  barcode: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  retail_price: number;
  min_stock: number;
}

export interface CartItem extends InventoryItem {
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
  await db.execute('BEGIN TRANSACTION');
  
  try {
    // Calculate debt
    const finalTotal = totalAmount - discount;
    const debt = finalTotal - paidAmount;
    
    // Create Invoice
    const invoiceResult = await db.execute(
      `INSERT INTO invoices (customer_id, user_id, total_amount, discount, paid_amount, cash_collected_at_sale, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [customerId, userId, totalAmount, discount, paidAmount, paidAmount, paymentMethod]
    );
    
    const invoiceId = invoiceResult.lastInsertId;

    // Insert Invoice Items & Update Stock
    for (const item of cart) {
      await db.execute(
        `INSERT INTO invoice_items (invoice_id, inventory_id, quantity, unit_price, cost_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [invoiceId, item.id, item.cart_quantity, item.retail_price, item.cost_price]
      );

      // Deduct from stock
      await db.execute(
        `UPDATE inventory SET quantity = quantity - $1 WHERE id = $2`,
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

    // Update Capital (Capital 1: Goods and Wholesale)
    if (paidAmount > 0) {
      await db.execute(
        `UPDATE capitals SET balance = balance + $1 WHERE id = 1`,
        [paidAmount]
      );
      await db.execute(
        `INSERT INTO capital_transactions (capital_id, user_id, amount, type, description) 
         VALUES (1, $1, $2, 'deposit', $3)`,
        [userId, paidAmount, `مبيعات قطاعي (فاتورة #${invoiceId})`]
      );
    }

    await db.execute('COMMIT');
    return invoiceId;
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

export async function searchProductsPos(query: string) {
  const db = await getDb();
  const searchParam = `%${query}%`;
  return await db.select<InventoryItem[]>(
    `SELECT * FROM inventory WHERE name LIKE $1 OR barcode LIKE $1 LIMIT 20`,
    [searchParam]
  );
}

export async function getProductByBarcode(barcode: string) {
  const db = await getDb();
  const products = await db.select<InventoryItem[]>(
    `SELECT * FROM inventory WHERE barcode = $1 LIMIT 1`,
    [barcode]
  );
  return products.length > 0 ? products[0] : null;
}

export async function returnInvoice(invoiceId: number, userId: number) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  
  try {
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

    // 3. Deduct from Capital
    if (invoice.paid_amount > 0) {
      await db.execute(
        `UPDATE capitals SET balance = balance - $1 WHERE id = 1`,
        [invoice.paid_amount]
      );
      await db.execute(
        `INSERT INTO capital_transactions (capital_id, user_id, amount, type, description) 
         VALUES (1, $1, $2, 'withdrawal', $3)`,
        [userId, invoice.paid_amount, `استرجاع مبيعات قطاعي (فاتورة #${invoiceId})`]
      );
    }

    // 4. Get all items and restore stock
    const items = await db.select<any[]>(
      `SELECT inventory_id, quantity FROM invoice_items WHERE invoice_id = $1`,
      [invoiceId]
    );

    for (const item of items) {
      if (item.inventory_id) {
        await db.execute(
          `UPDATE inventory SET quantity = quantity + $1 WHERE id = $2`,
          [item.quantity, item.inventory_id]
        );
      }
    }

    // 5. Delete invoice items
    await db.execute(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);

    // 6. Delete invoice
    await db.execute(`DELETE FROM invoices WHERE id = $1`, [invoiceId]);
    
    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

export async function getPosQuickItems() {
  const db = await getDb();
  return await db.select<any[]>(
    `SELECT * FROM inventory 
     WHERE quantity > 0 
     ORDER BY id DESC LIMIT 100`
  );
}

export async function getInvoiceItems(invoiceId: number) {
  const db = await getDb();
  return await db.select<any[]>(`
    SELECT ii.*, i.name as product_name
    FROM invoice_items ii
    LEFT JOIN inventory i ON ii.inventory_id = i.id
    WHERE ii.invoice_id = $1
  `, [invoiceId]);
}

export async function returnInvoiceItem(invoiceId: number, invoiceItemId: number, quantityToReturn: number, userId: number) {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    const itemResult = await db.select<any[]>(`SELECT * FROM invoice_items WHERE id = $1`, [invoiceItemId]);
    if (itemResult.length === 0) throw new Error('المنتج غير موجود في الفاتورة');
    const item = itemResult[0];

    if (quantityToReturn > item.quantity || quantityToReturn <= 0) throw new Error('الكمية غير صحيحة');

    const invoiceResult = await db.select<any[]>(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
    const invoice = invoiceResult[0];

    const refundAmount = item.unit_price * quantityToReturn;

    let newTotal = invoice.total_amount - refundAmount;
    let finalTotalBeforeRefund = invoice.total_amount - invoice.discount;
    let debtBeforeRefund = finalTotalBeforeRefund - invoice.paid_amount;
    
    let cashRefund = 0;
    let debtReduction = 0;

    if (debtBeforeRefund > 0) {
      if (refundAmount <= debtBeforeRefund) {
        debtReduction = refundAmount;
      } else {
        debtReduction = debtBeforeRefund;
        cashRefund = refundAmount - debtBeforeRefund;
      }
    } else {
      cashRefund = refundAmount;
    }

    let newPaidAmount = invoice.paid_amount - cashRefund;
    
    await db.execute(`UPDATE invoices SET total_amount = $1, paid_amount = $2 WHERE id = $3`, [newTotal, newPaidAmount, invoiceId]);

    if (debtReduction > 0 && invoice.customer_id) {
      await db.execute(`UPDATE customers SET credit_balance = credit_balance - $1 WHERE id = $2`, [debtReduction, invoice.customer_id]);
    }

    if (cashRefund > 0) {
      await db.execute(`UPDATE capitals SET balance = balance - $1 WHERE id = 1`, [cashRefund]);
      await db.execute(
        `INSERT INTO capital_transactions (capital_id, user_id, amount, type, description) VALUES (1, $1, $2, 'withdrawal', $3)`,
        [userId, cashRefund, `استرجاع جزئي لفاتورة مبيعات رقم #${invoiceId}`]
      );
    }

    if (item.inventory_id) {
      await db.execute(`UPDATE inventory SET quantity = quantity + $1 WHERE id = $2`, [quantityToReturn, item.inventory_id]);
    }

    if (item.quantity === quantityToReturn) {
      await db.execute(`DELETE FROM invoice_items WHERE id = $1`, [invoiceItemId]);
    } else {
      await db.execute(`UPDATE invoice_items SET quantity = quantity - $1 WHERE id = $2`, [quantityToReturn, invoiceItemId]);
    }

    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}
