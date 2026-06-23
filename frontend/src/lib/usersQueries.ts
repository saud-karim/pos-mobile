import { getDb } from './db';
import { User } from '../store/authStore';

export async function loginUser(username: string, password: string): Promise<User | null> {
  const db = await getDb();
  
  // Note: For production, password should be hashed. Here we use plaintext/PIN for simplicity based on previous requirements.
  const users = await db.select<User[]>('SELECT id, username, role FROM users WHERE username = $1 AND password = $2', [username, password]);
  
  if (users.length > 0) {
    return users[0];
  }
  
  return null;
}

export async function getUsers(): Promise<User[]> {
  const db = await getDb();
  return await db.select<User[]>('SELECT id, username, role FROM users');
}

export async function addUser(username: string, password: string, role: string): Promise<void> {
  const db = await getDb();
  await db.execute('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', [username, password, role]);
}

export async function deleteUser(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM users WHERE id = $1', [id]);
}
