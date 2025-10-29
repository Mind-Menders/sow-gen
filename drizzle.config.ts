import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

if (!DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error("Database configuration (DB_USER, DB_PASSWORD, DB_NAME) must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: DB_HOST || 'localhost',
    port: parseInt(DB_PORT || '5432', 10),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: false
  },
});
