import { z } from 'zod'

import { OrderSchema } from './order'

export const AgentActionSchema = z.enum([
  'await_payment',
  'confirm_order',
  'flag_for_review',
  'needs_clarification',
  'cancel_order',
  'no_order',
])

export const PaymentStatusSchema = z.enum([
  'unconfirmed',
  'matched',
  'mismatched',
  'unmatched',
  'n/a',
])

/**
 * Known flags produced by the pipeline. Flags are stored as plain strings so the
 * LLM layer cannot fail validation on an unexpected value, but every flag the
 * deterministic pipeline emits is one of these.
 */
export const KNOWN_ORDER_FLAGS = [
  'no_quantity_specified',
  'ambiguous_intent',
  'item_out_of_stock',
  'payment_amount_mismatch',
  'payment_reference_not_found',
  'unintelligible_input',
  'approval_timeout',
] as const

export const AgentOutputSchema = z.object({
  action: AgentActionSchema,
  order: OrderSchema.nullable(),
  payment_status: PaymentStatusSchema,
  matched_payment_id: z.string().nullish(),
  flags: z.array(z.string()),
})

export type AgentAction = z.infer<typeof AgentActionSchema>
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>
export type AgentOutput = z.infer<typeof AgentOutputSchema>

export const OrderStatusSchema = z.enum([
  'processing',
  'awaiting_payment',
  'awaiting_approval',
  'confirmed',
  'cancelled',
  'flagged',
  'needs_clarification',
  'closed_no_order',
])

export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'expired'])
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>
