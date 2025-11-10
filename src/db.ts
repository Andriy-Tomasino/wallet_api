import { Pool } from "pg";

const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wallet_db'

export const pool = new Pool({
  connectionString,
});