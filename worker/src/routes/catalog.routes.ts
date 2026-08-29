import { CatalogItemSchema } from '@chata/shared'

import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute, z } from '@hono/zod-openapi'
import type { AppServices } from '../services/container'
import type { AppEnv } from '../types'

const listCatalogRoute = createRoute({
  method: 'get',
  path: '/catalog',
  tags: ['Catalog'],
  summary: 'List catalog items with current stock',
  responses: {
    200: {
      description: 'Catalog items',
      content: { 'application/json': { schema: z.object({ items: z.array(CatalogItemSchema) }) } },
    },
  },
})

export function registerCatalogRoutes(app: OpenAPIHono<AppEnv>, services: AppServices): void {
  app.openapi(listCatalogRoute, async (c) => {
    const items = await services.repositories.catalog.list()
    return c.json({ items }, 200)
  })
}
