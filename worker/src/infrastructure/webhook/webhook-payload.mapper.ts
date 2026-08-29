import type { WebhookInboundBody } from '@chata/shared'

/** Command consumed by the intake service. The message id doubles as idempotency key. */
export interface IntakeCommand {
  customer: { waId: string; name: string }
  message: WebhookInboundBody['message']
  messageId: string
}

/** Maps a validated webhook payload into the intake command (adds a message id when absent). */
export function toIntakeCommand(body: WebhookInboundBody): IntakeCommand {
  return {
    customer: { waId: body.customer.wa_id, name: body.customer.name },
    message: body.message,
    messageId: body.message_id ?? crypto.randomUUID(),
  }
}
