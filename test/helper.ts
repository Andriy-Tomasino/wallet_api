import { build as buildApplication } from 'fastify-cli/helper'
import path from 'node:path'
import { FastifyInstance } from 'fastify'
import { Pool } from 'pg'

const AppPath = path.join(__dirname, '..', 'app.ts')

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wallet_test'

function config () {
  return {
    skipOverride: true
  }
}

async function build (t: any) {
  const argv = [AppPath]
  const app = await buildApplication(argv, config()) as FastifyInstance
  t.after(() => app.close())
  return app
}

async function cleanupDatabase() {
  const pool = new Pool({
    connectionString: TEST_DATABASE_URL
  })

  try {
    await pool.query('TRUNCATE TABLE transactions, users RESTART IDENTITY CASCADE')
  } catch (error) {
    console.warn('Could not cleanup database:', error)
  } finally {
    await pool.end()
  }
}

async function createTestUser(userId: number, balance: number = 0) {
  const pool = new Pool({
    connectionString: TEST_DATABASE_URL
  })

  try {
    const query = 'INSERT INTO users (id, balance) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET balance = $2'
    await pool.query(query, [userId, balance])
  } finally {
    await pool.end()
  }
}

async function getUserBalance(userId: number): Promise<number> {
  const pool = new Pool({
    connectionString: TEST_DATABASE_URL
  })

  try {
    const result = await pool.query('SELECT balance FROM users WHERE id = $1', [userId])
    if (result.rows.length === 0) {
      return 0
    }
    return parseFloat(result.rows[0].balance)
  } finally {
    await pool.end()
  }
}

export {
  config,
  build,
  cleanupDatabase,
  createTestUser,
  getUserBalance,
  TEST_DATABASE_URL
}
