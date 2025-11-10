import { FastifyInstance, FastifyPluginOptions } from 'fastify'

export default async function (fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  fastify.get('/', async function (_request, _reply) {
    return { root: true }
  })
}