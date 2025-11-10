import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify'
import { pool } from '../src/db'

interface PaymentBody {
  userId: number
  amount: number
  paymentId: string
}

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.post<{ Body: PaymentBody }>(
    '/payments',
    {
      schema: {
        tags: ['payments'],
        body: {
          type: 'object',
          required: ['userId', 'amount', 'paymentId'],
          properties: {
            userId: { type: 'number' },
            amount: { type: 'number', minimum: 0.01 },
            paymentId: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              userId: { type: 'number' },
              amount: { type: 'number' },
              paymentId: { type: 'string' },
              newBalance: { type: 'number' }
            }
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              currentBalance: { type: 'number' },
              requestedAmount: { type: 'number' }
            }
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: PaymentBody }>, reply: FastifyReply) => {
      const { userId, amount, paymentId } = request.body

      if (userId === undefined || userId === null || !amount || amount <= 0 || !paymentId) {
        return reply.status(400).send({ 
          error: 'Invalid request. userId, amount (positive), and paymentId are required' 
        })
      }

      const client = await pool.connect()
      
      try {
        await client.query('BEGIN')

        const existingTransaction = await client.query(
          'SELECT id, user_id, amount FROM transactions WHERE transaction_id = $1',
          [paymentId]
        )

        if (existingTransaction.rows.length > 0) {
          await client.query('ROLLBACK')
          const existing = existingTransaction.rows[0]
          const existingAmount = parseFloat(existing.amount)
          return reply.status(200).send({
            message: 'Payment already processed',
            userId: existing.user_id,
            amount: existingAmount,
            paymentId
          })
        }

        const userResult = await client.query('SELECT id, balance FROM users WHERE id = $1 FOR UPDATE', [userId])
        
        if (userResult.rows.length === 0) {
          await client.query('ROLLBACK')
          return reply.status(404).send({ error: 'User not found' })
        }

        const currentBalance = parseFloat(userResult.rows[0].balance)

        if (currentBalance < amount) {
          await client.query('ROLLBACK')
          return reply.status(400).send({ 
            error: 'Insufficient funds',
            currentBalance,
            requestedAmount: amount
          })
        }

        const newBalance = currentBalance - amount
        await client.query(
          'UPDATE users SET balance = $1 WHERE id = $2',
          [newBalance, userId]
        )

        await client.query(
          'INSERT INTO transactions (user_id, amount, transaction_id, type, created_at) VALUES ($1, $2, $3, $4, NOW())',
          [userId, amount, paymentId, 'payment']
        )

        await client.query('COMMIT')

        return reply.status(200).send({
          message: 'Payment successful',
          userId,
          amount,
          paymentId,
          newBalance
        })
      } catch (error: any) {
        await client.query('ROLLBACK')
        fastify.log.error(error)
        
        if (error.code === '23505') {
          return reply.status(200).send({
            message: 'Payment already processed',
            paymentId
          })
        }
        
        return reply.status(500).send({ error: 'Internal server error' })
      } finally {
        client.release()
      }
    }
  )
}

