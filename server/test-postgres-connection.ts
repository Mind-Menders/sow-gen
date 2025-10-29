import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

async function testPostgres() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'sow_gen_db',
    user: 'postgres',
    password: 'admin'
  });

  try {
    const db = drizzle(pool, { schema });
    const users = await db.select().from(schema.users);
    console.log('Successfully connected to PostgreSQL');
    console.log(`Found ${users.length} users`);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('PostgreSQL Error:', error);
    process.exit(1);
  }
}

testPostgres();