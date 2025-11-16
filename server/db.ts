import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// Verify required database configuration
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error("Database configuration (DB_USER, DB_PASSWORD, DB_NAME) must be set");
}

console.log('Connecting to database with config:', {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  ssl: false
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false // Disable SSL for local development
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Successfully connected to database');
    
    // Query to check if admin user exists
    if (!client) {
      console.warn('Database client not available after connection');
      return release && release();
    }
    client.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin'], (err, result) => {
      if (err) {
        console.error('Error checking admin user:', err);
      } else {
        console.log('Number of admin users:', result.rows[0].count);
      }
      release();
    });
  }
});

export const db = drizzle(pool, { schema });
