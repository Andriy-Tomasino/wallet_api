import { test } from 'node:test'
import assert from 'node:assert'
import { build, cleanupDatabase, createTestUser, getUserBalance } from '../helper'

test('deposits: успішне поповнення балансу нового користувача', async (t) => {
  await cleanupDatabase()
  const app = await build(t)

  const depositData = {
    userId: 1,
    amount: 100.50,
    transactionId: 'txn_test_001'
  }

  const response = await app.inject({
    method: 'POST',
    url: '/deposits',
    payload: depositData
  })

  assert.strictEqual(response.statusCode, 201)
  const body = JSON.parse(response.payload)
  assert.strictEqual(body.message, 'Deposit successful')
  assert.strictEqual(body.userId, depositData.userId)
  assert.strictEqual(body.amount, depositData.amount)
  assert.strictEqual(body.transactionId, depositData.transactionId)
  assert.strictEqual(body.newBalance, 100.50)

  const dbBalance = await getUserBalance(1)
  assert.strictEqual(dbBalance, 100.50)
})

test('deposits: поповнення балансу існуючого користувача', async (t) => {
  await cleanupDatabase()
  await createTestUser(2, 50.25)
  const app = await build(t)

  const depositData = {
    userId: 2,
    amount: 75.75,
    transactionId: 'txn_test_002'
  }

  const response = await app.inject({
    method: 'POST',
    url: '/deposits',
    payload: depositData
  })

  assert.strictEqual(response.statusCode, 201)
  const body = JSON.parse(response.payload)
  assert.strictEqual(body.newBalance, 126.00)

  const dbBalance = await getUserBalance(2)
  assert.strictEqual(dbBalance, 126.00)
})

test('deposits: ідемпотентність - повторний запит з тим самим transactionId', async (t) => {
  await cleanupDatabase()
  const app = await build(t)

  const depositData = {
    userId: 3,
    amount: 200,
    transactionId: 'txn_idempotent_001'
  }

  const firstResponse = await app.inject({
    method: 'POST',
    url: '/deposits',
    payload: depositData
  })

  assert.strictEqual(firstResponse.statusCode, 201)
  const firstBody = JSON.parse(firstResponse.payload)
  assert.strictEqual(firstBody.newBalance, 200)

  const secondResponse = await app.inject({
    method: 'POST',
    url: '/deposits',
    payload: depositData
  })

  assert.strictEqual(secondResponse.statusCode, 200)
  const secondBody = JSON.parse(secondResponse.payload)
  assert.strictEqual(secondBody.message, 'Transaction already processed')
  assert.strictEqual(secondBody.transactionId, depositData.transactionId)
  assert.strictEqual(secondBody.amount, depositData.amount)

  const finalBalance = await getUserBalance(3)
  assert.strictEqual(finalBalance, 200)
})

test('deposits: валідація - відсутній userId', async (t) => {
  await cleanupDatabase()
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/deposits',
    payload: {
      amount: 100,
      transactionId: 'txn_test_003'
    }
  })

  assert.strictEqual(response.statusCode, 400)
  const body = JSON.parse(response.payload)
  assert.ok(body.error !== undefined)
})

test('deposits: валідація - від\'ємна сума', async (t) => {
  await cleanupDatabase()
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/deposits',
    payload: {
      userId: 4,
      amount: -50,
      transactionId: 'txn_test_004'
    }
  })

  assert.strictEqual(response.statusCode, 400)
  const body = JSON.parse(response.payload)
  assert.ok(body.error !== undefined)
})

test('deposits: валідація - відсутній transactionId', async (t) => {
  await cleanupDatabase()
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/deposits',
    payload: {
      userId: 5,
      amount: 100
    }
  })

  assert.strictEqual(response.statusCode, 400)
  const body = JSON.parse(response.payload)
  assert.ok(body.error !== undefined)
})

test('deposits: валідація - нульова сума', async (t) => {
  await cleanupDatabase()
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/deposits',
    payload: {
      userId: 6,
      amount: 0,
      transactionId: 'txn_test_005'
    }
  })

  assert.strictEqual(response.statusCode, 400)
  const body = JSON.parse(response.payload)
  assert.ok(body.error !== undefined)
})

