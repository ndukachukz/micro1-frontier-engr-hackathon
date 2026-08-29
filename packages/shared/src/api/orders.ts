import { z } from 'zod'

import { AgentActionSchema, OrderStatusSchema, PaymentStatusSchema } from '../domain/agent'
import { OrderItemSchema } from '../domain/order'

export const OrderDtoSchema = z.object({
  id: z.string(),
  customer_wa_id: z.string(),
  customer_name: z.string(),
  items: z.array(OrderItemSchema),
  total_ngn: z.number().int(),
  status: OrderStatusSchema,
  action: AgentActionSchema.nullable(),
  payment_status: PaymentStatusSchema,
  matched_payment_id: z.string().nullable(),
  flags: z.array(z.string()),
  instance_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const OrderListResponseSchema = z.object({
  orders: z.array(OrderDtoSchema),
})

export const ApprovalBodySchema = z.object({
  approved: z.boolean().describe('Vendor decision on the pending order'),
  note: z.string().optional(),
})

export const ApprovalResponseSchema = z.object({
  order_id: z.string(),
  approval_status: z.string(),
})

export type OrderDto = z.infer<typeof OrderDtoSchema>
export type ApprovalBody = z.infer<typeof ApprovalBodySchema>
