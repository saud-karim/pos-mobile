import { getDb } from './db';

export interface Product {
  id?: number;
  category_id: number;
  name: string;
  barcode: string | null;
  imei: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock: number;
}

export interface Category {
  id: number;
  name: string;
  type: string;
}

export async function getCategories() {
  const db = await getDb();
  return await db.select<Category[]>('SELECT * FROM categories');
}

export async function getProducts(categoryId?: number, searchQuery?: string) {
  const db = await getDb();
  let query = `
    SELECT p.*, c.name as category_name, c.type as category_type
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  
  const params: any[] = [];

  if (categoryId) {
    query += ' AND p.category_id = $1';
    params.push(categoryId);
  }

  if (searchQuery) {
    query += ` AND (p.name LIKE $2 OR p.barcode LIKE $2 OR p.imei LIKE $2)`;
    // If categoryId was passed, $2 is the search. If not, $1 is the search.
    // To simplify:
    const searchParam = `%${searchQuery}%`;
    if (params.length === 1) {
      params.push(searchParam);
    } else {
      query = query.replace('$2', '$1').replace('$2', '$1').replace('$2', '$1');
      params.push(searchParam);
    }
  }

  query += ' ORDER BY p.id DESC';

  return await db.select<any[]>(query, params);
}

export async function addProduct(product: Product) {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO products (category_id, name, barcode, imei, cost_price, selling_price, stock_quantity, min_stock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      product.category_id,
      product.name,
      product.barcode || null,
      product.imei || null,
      product.cost_price,
      product.selling_price,
      product.stock_quantity,
      product.min_stock,
    ]
  );
  return result.lastInsertId;
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  return await db.execute('DELETE FROM products WHERE id = $1', [id]);
}

export async function updateProductStock(id: number, qtyChange: number) {
  const db = await getDb();
  return await db.execute('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [qtyChange, id]);
}
