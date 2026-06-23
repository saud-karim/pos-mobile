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
    `INSERT INTO maintenance (customer_id, user_id, device_model, issue_description, status, estimated_cost)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [job.customer_id, job.user_id, job.device_model, job.issue_description, job.status, job.estimated_cost]
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
  if (status === 'delivered') {
    return await db.execute(
      `UPDATE maintenance SET status = $1, final_cost = $2, spare_parts_cost = $3 WHERE id = $4`,
      [status, finalCost || 0, partsCost || 0, id]
    );
  } else {
    return await db.execute(
      `UPDATE maintenance SET status = $1 WHERE id = $2`,
      [status, id]
    );
  }
}
