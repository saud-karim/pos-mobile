import { getDb } from './db';

export interface MaintenanceJob {
  id?: number;
  customer_id?: number | null;
  user_id: number;
  device_model: string;
  issue_description: string;
  status: 'pending' | 'in_progress' | 'ready' | 'delivered';
  estimated_cost: number;
  final_cost?: number | null;
  spare_parts_cost?: number | null;
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
}

export async function addMaintenanceJob(job: MaintenanceJob) {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO maintenance (customer_id, technician_id, device_model, issue_description, status, estimated_cost)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [job.customer_id || null, job.user_id, job.device_model, job.issue_description, job.status, job.estimated_cost]
  );
  return result.lastInsertId;
}

export async function getMaintenanceJobs(statusFilter?: string) {
  const db = await getDb();
  let query = `
    SELECT m.*, c.name as customer_name, c.phone as customer_phone 
    FROM maintenance m
    LEFT JOIN customers c ON m.customer_id = c.id
  `;
  const params: any[] = [];

  if (statusFilter && statusFilter !== 'all') {
    query += ` WHERE m.status = $1`;
    params.push(statusFilter);
  }

  query += ` ORDER BY m.created_at DESC`;

  return await db.select<MaintenanceJob[]>(query, params);
}

export async function updateMaintenanceStatus(id: number, status: string, finalCost?: number, partsCost?: number) {
  const db = await getDb();
  
  if (finalCost !== undefined && partsCost !== undefined) {
    const res = await db.execute(
      `UPDATE maintenance SET status = $1, final_cost = $2, spare_parts_cost = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [status, finalCost, partsCost, id]
    );

    // If delivered, add to Maintenance Capital (Capital ID = 3)
    if (status === 'delivered') {
      await db.execute(
        `UPDATE capitals SET balance = balance + $1 WHERE id = 3`,
        [finalCost]
      );
      await db.execute(
        `INSERT INTO capital_transactions (capital_id, user_id, amount, type, description) 
         VALUES (3, 1, $1, 'deposit', $2)`,
        [finalCost, `أرباح صيانة لجهاز رقم #${id}`] // Using user 1 as fallback for now
      );
    }
    
    return res;
  } else {
    return await db.execute(
      `UPDATE maintenance SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, id]
    );
  }
}

export interface MaintenancePart {
  id?: number;
  maintenance_id: number;
  inventory_id: number;
  quantity: number;
  unit_price: number;
  product_name?: string;
}

export async function addMaintenancePart(maintenanceId: number, inventoryId: number, quantity: number, unitPrice: number) {
  const db = await getDb();
  
  // Update inventory stock
  await db.execute('UPDATE inventory SET quantity = quantity - $1 WHERE id = $2', [quantity, inventoryId]);
  
  // Insert part
  const result = await db.execute(
    `INSERT INTO maintenance_parts (maintenance_id, inventory_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
    [maintenanceId, inventoryId, quantity, unitPrice]
  );
  
  return result.lastInsertId;
}

export async function removeMaintenancePart(partId: number, inventoryId: number, quantity: number) {
  const db = await getDb();
  
  // Restore inventory stock
  await db.execute('UPDATE inventory SET quantity = quantity + $1 WHERE id = $2', [quantity, inventoryId]);
  
  // Delete part
  return await db.execute('DELETE FROM maintenance_parts WHERE id = $1', [partId]);
}

export async function getMaintenanceParts(maintenanceId: number) {
  const db = await getDb();
  return await db.select<MaintenancePart[]>(
    `SELECT mp.*, p.name as product_name 
     FROM maintenance_parts mp
     JOIN inventory p ON mp.inventory_id = p.id
     WHERE mp.maintenance_id = $1`,
    [maintenanceId]
  );
}

export async function getSpareParts() {
  const db = await getDb();
  return await db.select<any[]>(
    `SELECT * FROM inventory ORDER BY name ASC`
  );
}
