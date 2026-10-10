import mysql from 'mysql2/promise';
import { env } from './env';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: '+00:00',
});

// Align MySQL session timezone with the driver's timezone: '+00:00' setting.
// Without this, NOW() returns IST while the driver sends UTC — causing a 5.5 hr
// offset on TIMESTAMP columns like grace_until, which makes the no-show cron
// immediately expire every new booking.
pool.on('connection', (connection: any) => {
  connection.query("SET time_zone = '+00:00'");
});

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as unknown as T;
}

export async function execute(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

export interface TransactionClient {
  query<T = any>(sql: string, params?: any[]): Promise<T>;
  execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader>;
  connection: mysql.PoolConnection;
}

/**
 * Executes a callback within a managed MySQL transaction guaranteeing ACID properties.
 * Automatically performs BEGIN TRANSACTION, COMMIT on success, ROLLBACK on error,
 * and releases the connection back to the pool in all cases.
 */
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const tx: TransactionClient = {
      query: async <R = any>(sql: string, params: any[] = []): Promise<R> => {
        const [rows] = await conn.query(sql, params);
        return rows as unknown as R;
      },
      execute: async (sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> => {
        const [result] = await conn.execute(sql, params);
        return result as mysql.ResultSetHeader;
      },
      connection: conn,
    };
    const result = await callback(tx);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error('[DB] Rollback failed:', rbErr);
    }
    throw error;
  } finally {
    conn.release();
  }
}

export async function testDbConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    await conn.query("SET time_zone = '+00:00'");
    try {
      await conn.query("SET GLOBAL time_zone = '+00:00'");
    } catch (e) {
      // Non-fatal if user lacks SUPER/SYSTEM_VARIABLES_ADMIN privileges
    }
    await conn.ping();
    conn.release();
    return true;
  } catch (err: any) {
    console.warn(`[DB WARNING] Could not connect to MySQL (${err.code || err.message}). Please verify MySQL service is running.`);
    return false;
  }
}
