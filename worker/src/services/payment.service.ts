import type { PaymentCreatedResponse } from '@chata/shared'

import type { OrderRepository, PaymentRepository, WorkflowEventSender } from './ports'

/**
 * Simulates a bank payment landing for a customer. Persists the payment record
 * and, when the customer has an order awaiting payment, wakes that workflow
 * instance with a `payment` event.
 */
export class PaymentService {
  constructor(
    private readonly deps: {
      payments: PaymentRepository
      orders: OrderRepository
      events: WorkflowEventSender
    },
  ) {}

  async record(input: {
    customerWaId: string
    amountNgn: number
    senderRef: string
    timestamp?: string
  }): Promise<PaymentCreatedResponse> {
    const payment = await this.deps.payments.create({
      id: `PMT-${crypto.randomUUID().slice(0, 8)}`,
      amountNgn: input.amountNgn,
      senderRef: input.senderRef,
      timestamp: input.timestamp ?? new Date().toISOString(),
    })

    const order = await this.deps.orders.latestAwaitingPaymentFor(input.customerWaId)
    let resumedInstanceId: string | null = null
    if (order?.instance_id) {
      await this.deps.events.sendPayment(order.instance_id, payment.id)
      resumedInstanceId = order.instance_id
    }

    return { payment, resumed_instance_id: resumedInstanceId }
  }
}
