import Fastify from 'fastify'
import app from './app'
import { pool } from './src/db'

const fastify = Fastify({ logger: true })

fastify.register(app)

const start = async () => {
  try {
    try {
      await pool.query('SELECT 1')
      fastify.log.info('Database connection successful')
    } catch (dbError: any) {
      fastify.log.warn('Database connection failed')
      fastify.log.warn(`Error: ${dbError.message}`)
    }

    const port = Number(process.env.PORT) || 3000
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port, host })
    console.log(`Server is running on http://localhost:${port}`)
    console.log(`Swagger: http://localhost:${port}/documentation`)
  } catch (err: any) {
    fastify.log.error(err)
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${process.env.PORT || 3000} is already in use`)
    }
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  fastify.log.info('Shutting down...')
  await fastify.close()
  await pool.end()
  process.exit(0)
})

start()

