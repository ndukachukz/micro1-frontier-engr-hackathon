import { z } from 'zod'

import { CustomerSchema } from '../domain/customer'
import { InboundMessageSchema } from '../domain/message'

export const WebhookInboundBodySchema = z.object({
  customer: CustomerSchema,
  message: InboundMessageSchema,
  message_id: z
    .string()
    .min(1)
    .optional()
    .describe('Optional client-supplied idempotency key; defaults to a generated UUID'),
})

export const WebhookAcceptedResponseSchema = z.object({
  instance_id: z.string().describe('Workflow instance id processing this message'),
  order_id: z.string(),
})

export type WebhookInboundBody = z.infer<typeof WebhookInboundBodySchema>
export type WebhookAcceptedResponse = z.infer<typeof WebhookAcceptedResponseSchema>
