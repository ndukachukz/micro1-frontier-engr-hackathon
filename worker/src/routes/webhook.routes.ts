import {
  ProblemSchema,
  WebhookAcceptedResponseSchema,
  WebhookInboundBodySchema,
} from '@chata/shared'

import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { toIntakeCommand } from '../infrastructure/webhook/webhook-payload.mapper'
import type { AppServices } from '../services/container'
import type { AppEnv } from '../types'

const inboundRoute = createRoute({
  method: 'post',
  path: '/webhook/whatsapp',
  tags: ['Webhook'],
  summary: 'Receive an inbound WhatsApp message',
  description:
    'Persists an order record and starts a durable order-intake workflow instance for the message. Real WhatsApp Business API integration is out of scope — this endpoint is the webhook-shaped fixture entry point.',
  request: {
    body: {
      content: { 'application/json': { schema: WebhookInboundBodySchema } },
    },
  },
  responses: {
    202: {
      description: 'Message accepted and workflow started',
      content: {
        'application/json': { schema: WebhookAcceptedResponseSchema },
      },
    },
    400: {
      description: 'Invalid payload',
      content: { 'application/json': { schema: ProblemSchema } },
    },
  },
})

export function registerWebhookRoutes(app: OpenAPIHono<AppEnv>, services: AppServices): void {
  app.openapi(inboundRoute, async (c) => {
    const body = c.req.valid('json')
    const command = toIntakeCommand(body)
    const result = await services.intake.intake(command)
    return c.json({ instance_id: result.instanceId, order_id: result.orderId }, 202)
  })
}
