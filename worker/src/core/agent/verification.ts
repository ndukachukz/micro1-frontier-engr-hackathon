import type { AgentOutput, CatalogItem, InboundMessage } from '@chata/shared'

import { KNOWN_ORDER_FLAGS } from '@chata/shared'
import type { Result } from '../../lib/result'
import type { PaymentTool, PipelineError, StockTool } from '../tools/tool.types'
import type { ExtractionResult } from './extraction'
import type { PaymentEvidence } from './payment-evidence'
import { parsePaymentEvidence } from './payment-evidence'

export interface VerificationInput {
  extraction: ExtractionResult
  message: InboundMessage
  catalog: readonly CatalogItem[]
  stock: StockTool
  payments: PaymentTool
}

/**
 * Deterministic decision stage. The LLM proposes an order; this stage verifies it
 * against stock and payment tool outputs using plain code — never the LLM — so a
 * payment mismatch (e.g. underpayment on an adversarial order) can never be
 * talked into a "confirm_order" by the model.
 */
export async function runVerification(
  input: VerificationInput,
): Promise<Result<AgentOutput, PipelineError>> {
  const { extraction, message } = input

  // Non-order intents (no order extracted) pass straight through.
  if (!extraction.order) {
    return {
      ok: true,
      value: {
        action: extraction.action,
        order: null,
        payment_status: 'n/a',
        matched_payment_id: null,
        flags: sanitizeFlags(extraction.flags).sort(),
      },
    }
  }

  const order = structuredClone(extraction.order)

  // A cancellation is honored as-is; no stock or payment verification applies.
  if (extraction.action === 'cancel_order') {
    return {
      ok: true,
      value: {
        action: 'cancel_order',
        order,
        payment_status: 'n/a',
        matched_payment_id: null,
        flags: sanitizeFlags(extraction.flags).sort(),
      },
    }
  }

  const flags = new Set<string>(sanitizeFlags(extraction.flags))

  // Stock check via the stock tool, then recompute the total authoritatively from
  // catalog prices (the LLM's arithmetic is never trusted).
  let outOfStock = false
  let computedTotal = 0
  for (const item of order.items) {
    const found = await input.stock.find(item.sku)
    if (!found.ok) {
      return { ok: false, error: { message: found.error.message, retryable: true } }
    }
    const catalogItem = found.value
    if (!catalogItem || catalogItem.stock < item.quantity) {
      outOfStock = true
      flags.add('item_out_of_stock')
      continue
    }
    computedTotal += catalogItem.price_ngn * item.quantity
  }

  if (!outOfStock && computedTotal > 0) {
    order.total_ngn = computedTotal
  }

  // Payment matching via the payment tool, compared against the computed total.
  const evidence: PaymentEvidence | null = parsePaymentEvidence(message)
  let action: AgentOutput['action'] = 'await_payment'
  let paymentStatus: AgentOutput['payment_status'] = 'unconfirmed'
  let matchedPaymentId: string | null = null

  if (evidence) {
    const payment = await input.payments.findBySenderRef(evidence.senderRef)
    if (!payment.ok) {
      return { ok: false, error: { message: payment.error.message, retryable: true } }
    }
    if (!payment.value) {
      flags.add('payment_reference_not_found')
      action = 'flag_for_review'
      paymentStatus = 'unmatched'
    } else {
      matchedPaymentId = payment.value.id
      if (payment.value.amount_ngn === order.total_ngn) {
        action = 'confirm_order'
        paymentStatus = 'matched'
      } else {
        flags.add('payment_amount_mismatch')
        action = 'flag_for_review'
        paymentStatus = 'mismatched'
      }
    }
  } else {
    action = 'await_payment'
    paymentStatus = 'unconfirmed'
  }

  // An out-of-stock item always wins — stock must never be released against it.
  if (outOfStock) {
    action = 'flag_for_review'
    if (!evidence) {
      paymentStatus = 'n/a'
      matchedPaymentId = null
    }
  }

  return {
    ok: true,
    value: {
      action,
      order,
      payment_status: paymentStatus,
      matched_payment_id: matchedPaymentId,
      flags: [...flags].sort(),
    },
  }
}

function sanitizeFlags(flags: readonly string[]): string[] {
  return [
    ...new Set(flags.filter((flag) => (KNOWN_ORDER_FLAGS as readonly string[]).includes(flag))),
  ]
}
