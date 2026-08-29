import { conflict, notFound } from '../lib/errors'
import type { ApprovalRepository, OrderRepository, WorkflowEventSender } from './ports'

export interface ApprovalResolution {
  orderId: string
  submitted: 'approved' | 'rejected'
}

/**
 * Records the vendor's decision and wakes the waiting workflow instance via an
 * `approval` event. Ground rule: nothing is confirmed without this human step.
 */
export class ApprovalService {
  constructor(
    private readonly deps: {
      orders: OrderRepository
      approvals: ApprovalRepository
      events: WorkflowEventSender
    },
  ) {}

  async resolve(orderId: string, approved: boolean, note?: string): Promise<ApprovalResolution> {
    const order = await this.deps.orders.get(orderId)
    if (!order) {
      throw notFound(`Order ${orderId} not found`)
    }
    if (order.status !== 'awaiting_approval') {
      throw conflict(`Order ${orderId} is not awaiting approval (current status: ${order.status})`)
    }
    if (!order.instance_id) {
      throw conflict(`Order ${orderId} has no workflow instance to resume`)
    }

    const approval = await this.deps.approvals.get(orderId)
    if (approval?.status !== 'pending') {
      throw conflict(`Order ${orderId} has no pending approval request`)
    }

    await this.deps.events.sendApproval(order.instance_id, approved)
    if (note) {
      await this.deps.approvals.upsert({ orderId, status: 'pending', note })
    }

    return { orderId, submitted: approved ? 'approved' : 'rejected' }
  }
}
