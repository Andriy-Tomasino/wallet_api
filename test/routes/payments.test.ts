import { test } from 'node:test'
import assert from 'node:assert'
import { build, cleanupDatabase, createTestUser, getUserBalance } from '../helper'

test('payments: успішне списання коштів', async (t) => {
  await cleanupDatabase()
  await createTestUser(1, 200.50)
  const app = await build(t)

  const paymentData = {
    userId: 1,
    amount: 50.25,
    paymentId: 'pay_test_001'
  }

  const response = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: paymentData
  })

  assert.strictEqual(response.statusCode, 200)
  const body = JSON.parse(response.payload)
  assert.strictEqual(body.message, 'Payment successful')
  assert.strictEqual(body.userId, paymentData.userId)
  assert.strictEqual(body.amount, paymentData.amount)
  assert.strictEqual(body.paymentId, paymentData.paymentId)
  assert.strictEqual(body.newBalance, 150.25)

  const finalBalance = await getUserBalance(1)
  assert.strictEqual(finalBalance, 150.25)
})

test('payments: помилка - недостатньо коштів', async (t) => {
  await cleanupDatabase()
  await createTestUser(2, 50.00)
  const app = await build(t)

  const paymentData = {
    userId: 2,
    amount: 100.00,
    paymentId: 'pay_test_002'
  }

  const response = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: paymentData
  })

  assert.strictEqual(response.statusCode, 400)
  const body = JSON.parse(response.payload)
  assert.strictEqual(body.error, 'Insufficient funds')
  assert.strictEqual(body.currentBalance, 50.00)
  assert.strictEqual(body.requestedAmount, 100.00)

  const dbBalance = await getUserBalance(2)
  assert.strictEqual(dbBalance, 50.00)
})

test('payments: помилка - користувач не знайдений', async (t) => {
  await cleanupDatabase()
  const app = await build(t)

  const paymentData = {
    userId: 999,
    amount: 50.00,
    paymentId: 'pay_test_003'
  }

  const response = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: paymentData
  })

  assert.strictEqual(response.statusCode, 404)
  const body = JSON.parse(response.payload)
  assert.strictEqual(body.error, 'User not found')
})

test('payments: ідемпотентність - повторний запит з тим самим paymentId', async (t) => {
  await cleanupDatabase()
  await createTestUser(3, 300.00)
  const app = await build(t)

  const paymentData = {
    userId: 3,
    amount: 100.00,
    paymentId: 'pay_idempotent_001'
  }

  const firstResponse = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: paymentData
  })

  assert.strictEqual(firstResponse.statusCode, 200)
  const firstBody = JSON.parse(firstResponse.payload)
  assert.strictEqual(firstBody.newBalance, 200.00)

  const secondResponse = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: paymentData
  })

  assert.strictEqual(secondResponse.statusCode, 200)
  const secondBody = JSON.parse(secondResponse.payload)
  assert.strictEqual(secondBody.message, 'Payment already processed')
  assert.strictEqual(secondBody.paymentId, paymentData.paymentId)
  assert.strictEqual(secondBody.amount, paymentData.amount)

  const finalBalance = await getUserBalance(3)
  assert.strictEqual(finalBalance, 200.00)
})

test('payments: валідація - відсутній userId', async (t) => {
  await cleanupDatabase()
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: {
      amount: 100,
      paymentId: 'pay_test_004'
    }
  })

  assert.strictEqual(response.statusCode, 400)
  const body = JSON.parse(response.payload)
  assert.ok(body.error !== undefined)
})

test('payments: валідація - від\'ємна сума', async (t) => {
  await cleanupDatabase()
  await createTestUser(4, 100.00)
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: {
      userId: 4,
      amount: -50,
      paymentId: 'pay_test_005'
    }
  })

  assert.strictEqual(response.statusCode, 400)
  const body = JSON.parse(response.payload)
  assert.ok(body.error !== undefined)
})

test('payments: валідація - відсутній paymentId', async (t) => {
  await cleanupDatabase()
  await createTestUser(5, 100.00)
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: {
      userId: 5,
      amount: 50
    }
  })

  assert.strictEqual(response.statusCode, 400)
  const body = JSON.parse(response.payload)
  assert.ok(body.error !== undefined)
})

test('payments: атомарність - спроба одночасних списань', async (t) => {
  await cleanupDatabase()
  await createTestUser(6, 100.00)
  const app = await build(t)

  const paymentData1 = {
    userId: 6,
    amount: 70.00,
    paymentId: 'pay_concurrent_001'
  }

  const paymentData2 = {
    userId: 6,
    amount: 70.00,
    paymentId: 'pay_concurrent_002'
  }

  const response1 = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: paymentData1
  })

  const response2 = await app.inject({
    method: 'POST',
    url: '/payments',
    payload: paymentData2
  })

  assert.ok(
    (response1.statusCode === 200 && response2.statusCode === 400) ||
    (response1.statusCode === 400 && response2.statusCode === 200)
  )

  const dbBalance = await getUserBalance(6)
  assert.strictEqual(dbBalance, 30.00)
})

