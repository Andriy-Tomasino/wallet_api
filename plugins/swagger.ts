import fp from 'fastify-plugin'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export default fp(async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Wallet API',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3000'
        }
      ],
      tags: [
        { name: 'deposits' },
        { name: 'payments' }
      ],
      components: {
        schemas: {
          DepositRequest: {
            type: 'object',
            required: ['userId', 'amount', 'transactionId'],
            properties: {
              userId: {
                type: 'number',
                example: 1
              },
              amount: {
                type: 'number',
                minimum: 0.01,
                example: 100.50
              },
              transactionId: {
                type: 'string',
                example: 'txn_123456789'
              }
            }
          },
          DepositResponse: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Deposit successful'
              },
              userId: {
                type: 'number',
                example: 1
              },
              amount: {
                type: 'number',
                example: 100.50
              },
              transactionId: {
                type: 'string',
                example: 'txn_123456789'
              },
              newBalance: {
                type: 'number',
                example: 250.75
              }
            }
          },
          PaymentRequest: {
            type: 'object',
            required: ['userId', 'amount', 'paymentId'],
            properties: {
              userId: {
                type: 'number',
                example: 1
              },
              amount: {
                type: 'number',
                minimum: 0.01,
                example: 50.25
              },
              paymentId: {
                type: 'string',
                example: 'pay_987654321'
              }
            }
          },
          PaymentResponse: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Payment successful'
              },
              userId: {
                type: 'number',
                example: 1
              },
              amount: {
                type: 'number',
                example: 50.25
              },
              paymentId: {
                type: 'string',
                example: 'pay_987654321'
              },
              newBalance: {
                type: 'number',
                example: 200.50
              }
            }
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              error: {
                type: 'string'
              },
              currentBalance: {
                type: 'number'
              },
              requestedAmount: {
                type: 'number'
              }
            }
          }
        }
      }
    }
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  })
})

