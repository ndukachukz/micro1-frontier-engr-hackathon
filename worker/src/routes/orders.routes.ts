import {
  ApprovalBodySchema,
  ApprovalResponseSchema,
  IdParamSchema,
  OrderDtoSchema,
  OrderListResponseSchema,
  ProblemSchema,
} from '@chata/shared'

import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import type { AppServices } from '../services/container'
import type { AppEnv } from '../types'

const listOrdersRoute = createRoute({
  method: 'get',
  path: '/orders',
  tags: ['Orders'],
  summary: 'List orders',
  responses: {
    200: {
      description: 'All orders, newest first',
      content: { 'application/json': { schema: OrderListResponseSchema } },
    },
  },
})

const getOrderRoute = createRoute({
  method: 'get',
  path: '/orders/{id}',
  tags: ['Orders'],
  summary: 'Get one order',
  request: { params: IdParamSchema },
  responses: {
    200: { description: 'The order', content: { 'application/json': { schema: OrderDtoSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ProblemSchema } } },
  },
})

const approveOrderRoute = createRoute({
  method: 'post',
  path: '/orders/{id}/approval',
  tags: ['Orders'],
  summary: 'Vendor approval decision on a pending order',
  description:
    'Human-in-the-loop step: delivers an `approval` event to the waiting workflow instance. Stock is only deducted and the payment only marked matched after an approval.',
  request: {
    params: IdParamSchema,
    body: { content: { 'application/json': { schema: ApprovalBodySchema } } },
  },
  responses: {
    202: {
      description: 'Decision delivered to the workflow',
      content: { 'application/json': { schema: ApprovalResponseSchema } },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ProblemSchema } } },
    409: {
      description: 'Order not awaiting approval',
      content: { 'application/json': { schema: ProblemSchema } },
    },
  },
})

export function registerOrderRoutes(app: OpenAPIHono<AppEnv>, services: AppServices): void {
  app.openapi(listOrdersRoute, async (c) => {
    const orders = await services.repositories.orders.list()
    return c.json({ orders }, 200)
  })

  app.openapi(getOrderRoute, async (c) => {
    const { id } = c.req.valid('param')
    const order = await services.repositories.orders.get(id)
    if (!order) {
      return c.json({ status: 404, title: 'Not Found', detail: `Order ${id} not found` }, 404)
    }
    return c.json(order, 200)
  })

  app.openapi(approveOrderRoute, async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await services.approvals.resolve(id, body.approved, body.note)
    return c.json({ order_id: result.orderId, approval_status: result.submitted }, 202)
  })
}
