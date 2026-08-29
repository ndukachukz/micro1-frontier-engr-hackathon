import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'
import type { AppEnv } from '../types'

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Liveness probe',
  responses: {
    200: {
      description: 'Service is up',
      content: { 'application/json': { schema: z.object({ status: z.literal('ok') }) } },
    },
  },
})

export function registerHealthRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(healthRoute, (c) => c.json({ status: 'ok' as const }, 200))
}
