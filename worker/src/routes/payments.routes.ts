import {
  CreatePaymentBodySchema,
  PaymentCreatedResponseSchema,
  PaymentListResponseSchema,
} from '@chata/shared'

import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import type { AppServices } from '../services/container'
import type { AppEnv } from '../types'

const listPaymentsRoute = createRoute({
  method: 'get',
  path: '/payments',
  tags: ['Payments'],
  summary: 'List payment records',
  responses: {
    200: {
      description: 'All payment records',
      content: { 'application/json': { schema: PaymentListResponseSchema } },
    },
  },
})

const createPaymentRoute = createRoute({
  method: 'post',
  path: '/payments',
  tags: ['Payments'],
  summary: 'Simulate an incoming bank payment',
  description:
    'Records the payment and, when the customer has an order awaiting payment, delivers a `payment` event that resumes the waiting workflow instance.',
  request: {
    body: { content: { 'application/json': { schema: CreatePaymentBodySchema } } },
  },
  responses: {
    201: {
      description: 'Payment recorded',
      content: { 'application/json': { schema: PaymentCreatedResponseSchema } },
    },
  },
})

export function registerPaymentRoutes(app: OpenAPIHono<AppEnv>, services: AppServices): void {
  app.openapi(listPaymentsRoute, async (c) => {
    const payments = await services.repositories.payments.list()
    return c.json({ payments }, 200)
  })

  app.openapi(createPaymentRoute, async (c) => {
    const body = c.req.valid('json')
    const result = await services.payments.record({
      customerWaId: body.customer_wa_id,
      amountNgn: body.amount_ngn,
      senderRef: body.sender_ref,
      timestamp: body.timestamp,
    })
    return c.json(result, 201)
  })
}
