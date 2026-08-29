import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'

import type {
  AgentOutput,
  CatalogItem,
  ConversationTurn,
  Trajectory,
  TrajectoryStep,
} from '@chata/shared'
import { formatItems, formatNgn } from '@chata/shared'
import { runExtraction } from '../../core/agent/extraction'
import { runOcr } from '../../core/agent/ocr'
import { buildReplyText } from '../../core/agent/reply-templates'
import { runVerification } from '../../core/agent/verification'
import type { OrderWorkflowParams } from '../../services/ports'
import type { AppBindings } from '../../types'
import {
  type ChataRepositories,
  createD1Tools,
  createLlmClient,
  createOcrClient,
  createRepositories,
} from '../db/composition'

const APPROVAL_TIMEOUT = '24 hours' as const
const PAYMENT_TIMEOUT = '24 hours' as const

const statusForAction: Record<AgentOutput['action'], import('@chata/shared').OrderStatus> = {
  await_payment: 'awaiting_payment',
  confirm_order: 'awaiting_approval',
  flag_for_review: 'flagged',
  needs_clarification: 'needs_clarification',
  cancel_order: 'cancelled',
  no_order: 'closed_no_order',
}

/**
 * Durable order-intake workflow: one instance per inbound WhatsApp message.
 *
 * Steps mirror the agent pipeline so each stage is retried and persisted
 * independently. Human approval (ground rule: nothing is confirmed without a
 * vendor decision) is implemented with waitForEvent — the instance sleeps for
 * free until the vendor acts or the 24h timeout expires.
 */
export class OrderWorkflow extends WorkflowEntrypoint<AppBindings, OrderWorkflowParams> {
  async run(event: WorkflowEvent<OrderWorkflowParams>, step: WorkflowStep): Promise<void> {
    const { order_id, customer, message } = event.payload
    const repositories = createRepositories(this.env.DB)
    const tools = createD1Tools(repositories)
    const llm = createLlmClient(this.env)
    const ocr = createOcrClient(this.env)

    // 1. Memory (loaded BEFORE the inbound message is recorded, so history excludes it) + catalog
    const history: ConversationTurn[] = await step.do('load-memory', () =>
      repositories.conversations.history(customer.wa_id),
    )
    await step.do('record-inbound-message', () =>
      repositories.conversations.append({
        waId: customer.wa_id,
        direction: 'inbound',
        text: message.text ?? message.caption ?? '',
        timestamp: message.timestamp,
      }),
    )
    const catalog: CatalogItem[] = await step.do('load-catalog', () => repositories.catalog.list())

    // 2. OCR of an attached payment screenshot (no-op without an image, retriable)
    let ocrRan = false
    let ocrText: string | null = null
    const inboundMessage = await step.do(
      'ocr-payment-screenshot',
      { retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' } },
      async () => {
        const result = await runOcr(ocr, message)
        if (!result.ok) {
          throw new Error(result.error.message)
        }
        if (result.value.ocrText !== null) {
          ocrRan = true
          ocrText = result.value.ocrText
        }
        return result.value.message
      },
    )

    // 3. Extraction (LLM, retriable)
    const extraction = await step.do(
      'extract-order',
      { retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' } },
      async () => {
        const result = await runExtraction(llm, {
          catalog,
          conversationHistory: history,
          message: inboundMessage,
        })
        if (!result.ok) {
          throw new Error(result.error.message)
        }
        return result.value
      },
    )

    // 4. Verification (deterministic — the anti-false-confirm guard)
    const output: AgentOutput = await step.do('verify-and-decide', async () => {
      const result = await runVerification({
        extraction,
        message: inboundMessage,
        catalog,
        stock: tools.stock,
        payments: tools.payments,
      })
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.value
    })

    // 5. Persist the decision
    await step.do('persist-order-decision', () =>
      repositories.orders.update(order_id, {
        items: output.order?.items ?? [],
        total_ngn: output.order?.total_ngn ?? 0,
        status: statusForAction[output.action],
        action: output.action,
        payment_status: output.payment_status,
        matched_payment_id: output.matched_payment_id ?? null,
        flags: output.flags,
      }),
    )

    // 6. Mocked WhatsApp reply
    const catalogNames = new Map(catalog.map((item) => [item.sku, item.name]))
    const replyText = buildReplyText(output, catalogNames)
    if (replyText) {
      await step.do('send-reply', () =>
        tools.replies.send({
          waId: customer.wa_id,
          text: replyText,
          sentAt: new Date().toISOString(),
        }),
      )
    }

    // 7. Trajectory (saved before the long waits; step outputs are the evidence)
    await step.do('save-trajectory', () => {
      const steps: TrajectoryStep[] = []
      if (ocrRan) {
        steps.push({
          step: 'ocr-payment-screenshot',
          tool: 'OcrClient',
          input: { image_url: message.attachment?.image_url },
          output: { screenshot_ocr_text: ocrText },
          started_at: event.timestamp.toISOString(),
          duration_ms: 0,
        })
      }
      steps.push(
        {
          step: 'extract-order',
          tool: 'LlmClient',
          input: { message: inboundMessage, history_turns: history.length },
          output: extraction,
          started_at: event.timestamp.toISOString(),
          duration_ms: 0,
        },
        {
          step: 'verify-and-decide',
          tool: 'StockTool+PaymentTool',
          input: { extraction },
          output,
          started_at: event.timestamp.toISOString(),
          duration_ms: 0,
        },
      )
      if (replyText) {
        steps.push({
          step: 'send-reply',
          tool: 'ReplySender',
          input: { text: replyText },
          started_at: event.timestamp.toISOString(),
          duration_ms: 0,
        })
      }
      const trajectory: Trajectory = {
        id: event.instanceId,
        agent: 'agent',
        case_id: null,
        customer,
        message,
        conversation_history: history,
        output,
        steps,
        created_at: new Date().toISOString(),
      }
      return repositories.trajectories.save(trajectory)
    })

    // 8. Action-specific continuation
    switch (output.action) {
      case 'confirm_order':
        await this.awaitApprovalAndFulfill(step, {
          orderId: order_id,
          output,
          repositories,
          tools,
          catalogNames,
          customerWaId: customer.wa_id,
        })
        break
      case 'await_payment':
        await this.awaitPaymentAndRecheck(step, {
          orderId: order_id,
          output,
          repositories,
          tools,
          catalogNames,
          customerWaId: customer.wa_id,
        })
        break
      case 'flag_for_review':
      case 'needs_clarification':
      case 'cancel_order':
      case 'no_order':
        break
    }
  }

  /**
   * Waits for the vendor's approval event, then fulfills (stock deduction +
   * payment mark) or closes the order. Timeout expires the approval.
   */
  private async awaitApprovalAndFulfill(
    step: WorkflowStep,
    ctx: {
      orderId: string
      output: AgentOutput
      repositories: ChataRepositories
      tools: ReturnType<typeof createD1Tools>
      catalogNames: Map<string, string>
      customerWaId: string
    },
  ): Promise<void> {
    await step.do('request-approval', () =>
      ctx.repositories.approvals.upsert({
        orderId: ctx.orderId,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      }),
    )

    let approved: boolean
    try {
      const approvalEvent = await step.waitForEvent<{ approved: boolean }>('approval', {
        type: 'approval',
        timeout: APPROVAL_TIMEOUT,
      })
      approved = approvalEvent.payload.approved
    } catch {
      await step.do('expire-approval', () =>
        Promise.all([
          ctx.repositories.approvals.upsert({
            orderId: ctx.orderId,
            status: 'expired',
            resolvedAt: new Date().toISOString(),
          }),
          ctx.repositories.orders.update(ctx.orderId, {
            status: 'flagged',
            flags: [...new Set([...(ctx.output.flags ?? []), 'approval_timeout'])],
          }),
        ]),
      )
      return
    }

    if (!approved) {
      await step.do('record-rejection', () =>
        Promise.all([
          ctx.repositories.approvals.upsert({
            orderId: ctx.orderId,
            status: 'rejected',
            resolvedAt: new Date().toISOString(),
          }),
          ctx.repositories.orders.update(ctx.orderId, { status: 'cancelled' }),
        ]),
      )
      return
    }

    await step.do('fulfill-order', async () => {
      if (ctx.output.order) {
        for (const item of ctx.output.order.items) {
          await ctx.tools.stock.deduct(item.sku, item.quantity)
        }
      }
      if (ctx.output.matched_payment_id) {
        await ctx.tools.payments.markMatched(ctx.output.matched_payment_id)
      }
      await ctx.repositories.orders.update(ctx.orderId, { status: 'confirmed' })
      await ctx.repositories.approvals.upsert({
        orderId: ctx.orderId,
        status: 'approved',
        resolvedAt: new Date().toISOString(),
      })
    })

    const confirmedOrder = ctx.output.order
    if (confirmedOrder) {
      await step.do('send-confirmation-reply', () =>
        ctx.tools.replies.send({
          waId: ctx.customerWaId,
          text: `Payment confirmed. ${formatItems(confirmedOrder.items, ctx.catalogNames)} — total ${formatNgn(confirmedOrder.total_ngn)}. Your order will be prepared.`,
          sentAt: new Date().toISOString(),
        }),
      )
    }
  }

  /**
   * Waits for a payment event (simulated via POST /payments), re-checks the
   * payment record against the order total, then hands over to the approval flow.
   */
  private async awaitPaymentAndRecheck(
    step: WorkflowStep,
    ctx: {
      orderId: string
      output: AgentOutput
      repositories: ChataRepositories
      tools: ReturnType<typeof createD1Tools>
      catalogNames: Map<string, string>
      customerWaId: string
    },
  ): Promise<void> {
    let paymentId: string
    try {
      const paymentEvent = await step.waitForEvent<{ payment_id: string }>('payment', {
        type: 'payment',
        timeout: PAYMENT_TIMEOUT,
      })
      paymentId = paymentEvent.payload.payment_id
    } catch {
      return
    }

    const matched = await step.do('match-payment-after-event', async () => {
      const order = await ctx.repositories.orders.get(ctx.orderId)
      if (!order) {
        throw new Error(`Order ${ctx.orderId} vanished before payment match`)
      }
      const payment = await ctx.repositories.payments.get(paymentId)
      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`)
      }
      if (payment.amount_ngn === order.total_ngn) {
        await ctx.repositories.orders.update(ctx.orderId, {
          status: 'awaiting_approval',
          action: 'confirm_order',
          payment_status: 'matched',
          matched_payment_id: payment.id,
        })
        return true
      }
      await ctx.repositories.orders.update(ctx.orderId, {
        status: 'flagged',
        action: 'flag_for_review',
        payment_status: 'mismatched',
        matched_payment_id: payment.id,
        flags: [...new Set([...order.flags, 'payment_amount_mismatch'])],
      })
      return false
    })

    if (!matched) {
      return
    }

    await this.awaitApprovalAndFulfill(step, {
      orderId: ctx.orderId,
      output: {
        action: 'confirm_order',
        order: ctx.output.order,
        payment_status: 'matched',
        matched_payment_id: paymentId,
        flags: ctx.output.flags,
      },
      repositories: ctx.repositories,
      tools: ctx.tools,
      catalogNames: ctx.catalogNames,
      customerWaId: ctx.customerWaId,
    })
  }
}
