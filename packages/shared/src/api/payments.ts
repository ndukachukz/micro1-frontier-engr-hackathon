import { z } from 'zod'

import { PaymentRecordSchema } from '../domain/payment'

export const PaymentListResponseSchema = z.object({
  payments: z.array(PaymentRecordSchema),
})

export const CreatePaymentBodySchema = z.object({
  customer_wa_id: z
    .string()
    .min(1)
    .describe(
      'Customer who claims to have paid (simulation convenience — real bank feeds are anonymous)',
    ),
  amount_ngn: z.number().int().positive(),
  sender_ref: z.string().min(1),
  timestamp: z.string().optional().describe('ISO 8601; defaults to now'),
})

export const PaymentCreatedResponseSchema = z.object({
  payment: PaymentRecordSchema,
  resumed_instance_id: z
    .string()
    .nullable()
    .describe('Workflow instance resumed by this payment, if any'),
})

export type CreatePaymentBody = z.infer<typeof CreatePaymentBodySchema>
export type PaymentCreatedResponse = z.infer<typeof PaymentCreatedResponseSchema>
