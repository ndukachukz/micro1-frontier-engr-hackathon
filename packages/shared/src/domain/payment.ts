import { z } from 'zod'

export const PaymentRecordSchema = z.object({
  id: z.string().min(1).describe('Payment record id, e.g. PMT001'),
  amount_ngn: z.number().int().nonnegative().describe('Amount in whole naira'),
  sender_ref: z.string().min(1).describe('Bank transfer reference, e.g. GTB-887421'),
  timestamp: z.string().describe('ISO 8601 timestamp of the transfer'),
  matched: z.boolean().describe('True once the payment has been applied to an order'),
})

export type PaymentRecord = z.infer<typeof PaymentRecordSchema>
