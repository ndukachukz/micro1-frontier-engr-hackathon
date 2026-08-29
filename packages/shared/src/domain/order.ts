import { z } from 'zod'

export const OrderItemSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
})

export const ConfidenceSchema = z.enum(['high', 'medium', 'low'])

export const OrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  total_ngn: z.number().int().nonnegative(),
  confidence: ConfidenceSchema,
  reconstructed_from_history: z.boolean().optional(),
})

export type Order = z.infer<typeof OrderSchema>
export type OrderItem = z.infer<typeof OrderItemSchema>
export type Confidence = z.infer<typeof ConfidenceSchema>
