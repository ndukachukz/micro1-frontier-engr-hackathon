import type { OrderDto } from '@chata/shared'

import type { IntakeCommand } from '../infrastructure/webhook/webhook-payload.mapper'
import type { ConversationRepository, OrderRepository, WorkflowStarter } from './ports'

export interface IntakeResult {
  orderId: string
  instanceId: string
}

/**
 * Application service for the webhook path: creates the order record and starts
 * one durable workflow instance per inbound message. Instance ids are derived
 * deterministically from the customer + message id (idempotency key).
 */
export class OrderIntakeService {
  constructor(
    private readonly deps: {
      orders: OrderRepository
      conversations: ConversationRepository
      workflowStarter: WorkflowStarter
    },
  ) {}

  async intake(command: IntakeCommand): Promise<IntakeResult> {
    const orderId = `ORD-${crypto.randomUUID().slice(0, 8)}`
    const instanceId = `${command.customer.waId}-${command.messageId}`.replace(
      /[^a-zA-Z0-9_-]/g,
      '-',
    )
    const now = new Date().toISOString()

    const order: OrderDto = {
      id: orderId,
      customer_wa_id: command.customer.waId,
      customer_name: command.customer.name,
      items: [],
      total_ngn: 0,
      status: 'processing',
      action: null,
      payment_status: 'n/a',
      matched_payment_id: null,
      flags: [],
      instance_id: instanceId,
      created_at: now,
      updated_at: now,
    }
    await this.deps.orders.create(order)

    await this.deps.workflowStarter.start(instanceId, {
      order_id: orderId,
      customer: { wa_id: command.customer.waId, name: command.customer.name },
      message: command.message,
      message_id: command.messageId,
    })

    return { orderId, instanceId }
  }
}
