import type { AgentOutput } from '@chata/shared'

import { formatItems, formatNgn } from '@chata/shared'

/** Builds the (mocked) outbound WhatsApp reply for an agent decision. Null = no reply sent. */
export function buildReplyText(
  output: AgentOutput,
  catalogNames: ReadonlyMap<string, string>,
): string | null {
  switch (output.action) {
    case 'await_payment':
      return output.order
        ? `Got it! ${formatItems(output.order.items, catalogNames)} — total ${formatNgn(output.order.total_ngn)}. We'll confirm once payment is received.`
        : null
    case 'confirm_order':
      return output.order
        ? `Payment confirmed. ${formatItems(output.order.items, catalogNames)} — total ${formatNgn(output.order.total_ngn)}. Your order will be prepared.`
        : null
    case 'needs_clarification':
      return 'Could you tell me the quantities? For example: "2 bags of rice and 1 crate of eggs".'
    case 'flag_for_review':
      return 'Thanks! Your order needs a quick manual check from the shop — we will confirm shortly.'
    case 'cancel_order':
      return 'Your order has been cancelled.'
    case 'no_order':
      return null
  }
}
