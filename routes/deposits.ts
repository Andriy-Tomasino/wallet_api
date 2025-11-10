import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify'
import { pool } from '../src/db'

interface DepositBody {
  userId: number
  amount: number
  transactionId: string
}

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
  fastify.post<{ Body: DepositBody }>(
    '/deposits',
    {
      schema: {
        tags: ['deposits'],
        body: {
          type: 'object',
          required: ['userId', 'amount', 'transactionId'],
          properties: {
            userId: { type: 'number' },
            amount: { type: 'number', minimum: 0.01 },
            transactionId: { type: 'string' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              userId: { type: 'number' },
              amount: { type: 'number' },
              transactionId: { type: 'string' },
              newBalance: { type: 'number' }
            }
          },
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              userId: { type: 'number' },
              amount: { type: 'number' },
              transactionId: { type: 'string' }
            }
          },
          400: {
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
    async (request: FastifyRequest<{ Body: DepositBody }>, reply: FastifyReply) => {
      const { userId, amount, transactionId } = request.body

      if (!userId || amount <= 0 || !transactionId || transactionId.trim() === '') {
        return reply.status(400).send({ 
          error: 'Invalid request. userId, amount (positive), and transactionId are required' 
        })
      }

      const client = await pool.connect()
      
      try {
        await client.query('BEGIN')

        const existingTransaction = await client.query(
          'SELECT id, user_id, amount FROM transactions WHERE transaction_id = $1',
          [transactionId]
        )

        if (existingTransaction.rows.length > 0) {
          await client.query('ROLLBACK')
          const existing = existingTransaction.rows[0]
          const existingAmount = parseFloat(existing.amount)
          return reply.status(200).send({
            message: 'Transaction already processed',
            userId: existing.user_id,
            amount: existingAmount,
            transactionId
          })
        }

        let userResult = await client.query('SELECT id, balance FROM users WHERE id = $1', [userId])
        
        if (userResult.rows.length === 0) {
          await client.query('INSERT INTO users (id, balance) VALUES ($1, $2)', [userId, 0])
          userResult = await client.query('SELECT id, balance FROM users WHERE id = $1', [userId])
        }

        const currentBalance = parseFloat(userResult.rows[0].balance)
        const newBalance = currentBalance + amount
        await client.query(
          'UPDATE users SET balance = $1 WHERE id = $2',
          [newBalance, userId]
        )

        await client.query(
          'INSERT INTO transactions (user_id, amount, transaction_id, type, created_at) VALUES ($1, $2, $3, $4, NOW())',
          [userId, amount, transactionId, 'deposit']
        )

        await client.query('COMMIT')

        return reply.status(201).send({
          message: 'Deposit successful',
          userId,
          amount,
          transactionId,
          newBalance
        })
      } catch (error: any) {
        await client.query('ROLLBACK')
        fastify.log.error(error)
        
        if (error.code === '23505') {
          return reply.status(200).send({
            message: 'Transaction already processed',
            transactionId
          })
        }
        
        return reply.status(500).send({ error: 'Internal server error' })
      } finally {
        client.release()
      }
    }
  )
}

