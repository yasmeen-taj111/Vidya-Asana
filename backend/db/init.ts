import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env';

async function init() {
  console.log(`[DB Init] Connecting to MySQL server at ${env.DB_HOST}:${env.DB_PORT}...`);

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const rawSql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`[DB Init] Initializing database schema...`);

  // Split strictly on semicolons
  const statements = rawSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let tablesCreated = 0;

  try {
    for (const stmt of statements) {
      if (!stmt) continue;

      const firstCodeLine = stmt
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith('--')) || '';

      if (!firstCodeLine) continue;

      try {
        await connection.query(stmt);

        if (firstCodeLine.toUpperCase().startsWith('CREATE TABLE')) {
          const match = firstCodeLine.match(/CREATE TABLE (?:IF NOT EXISTS )?`?([a-zA-Z0-9_]+)`?/i);
          const tableName = match ? match[1] : firstCodeLine;
          console.log(`  ✓ Table verified/created: ${tableName}`);
          tablesCreated++;
        }
      } catch (err: any) {
        console.error(`\n[DB Init] ❌ Failed executing:\n${stmt.slice(0, 150)}...\nError: ${err.message}`);
        throw err;
      }
    }

    console.log(`\n[DB Init] ✅ Successfully initialized all ${tablesCreated} tables!`);
  } catch (err: any) {
    try {
      const [rows]: any = await connection.query('SHOW ENGINE INNODB STATUS;');
      const statusText = rows[0]?.Status || '';
      const match = statusText.match(/------------------------\nLATEST FOREIGN KEY ERROR\n------------------------[\s\S]*?------------------------/);
      if (match) {
        console.error('\n--- LATEST INNODB FOREIGN KEY ERROR ---\n', match[0]);
      }
    } catch (e) {
      // ignore
    }
    throw err;
  } finally {
    await connection.end();
  }
}

init().catch((err) => {
  console.error('[DB Init] Process aborted due to error.');
  process.exit(1);
});
