import path from 'node:path'
import AutoLoad from '@fastify/autoload'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import swaggerPlugin from './plugins/swagger'

const options = {}

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
  await fastify.register(swaggerPlugin)

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts),
    ignorePattern: /swagger\.ts$/
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  })
}

export { options }

