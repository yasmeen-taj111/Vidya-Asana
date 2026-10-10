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
