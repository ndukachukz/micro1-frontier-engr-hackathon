import type { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'

import type { AppEnv } from '../types'

const API_TAGS = [
  { name: 'System', description: 'Liveness and metadata' },
  { name: 'Webhook', description: 'WhatsApp-shaped inbound messages (the simulation entry point)' },
  { name: 'Orders', description: 'Order tracking and vendor approval' },
  { name: 'Payments', description: 'Payment records and simulated incoming payments' },
  { name: 'Catalog', description: 'Store catalog' },
  { name: 'Eval', description: 'Baseline/agent evaluation harness over fixtures.json' },
]

/** Mounts the OpenAPI 3.1 document and the interactive Scalar reference. */
export function mountOpenApi(app: OpenAPIHono<AppEnv>): void {
  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'Chata API',
      version: '0.1.0',
      description:
        'Agentic order intake & payment confirmation for WhatsApp SME vendors. Use POST /webhook/whatsapp to replay inbound messages, POST /payments to simulate a payment landing, and POST /orders/{id}/approval to act as the vendor.',
    },
    tags: API_TAGS,
  })

  app.get(
    '/docs',
    apiReference({
      pageTitle: 'Chata API Reference',
      spec: { url: '/openapi.json' },
    }),
  )
}
