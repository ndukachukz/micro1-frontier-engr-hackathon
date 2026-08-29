import { z } from 'zod'

export const CustomerSchema = z.object({
  wa_id: z.string().min(1).describe('WhatsApp ID of the customer, e.g. 2348000000101'),
  name: z.string().min(1).describe('Display name of the customer'),
})

export type Customer = z.infer<typeof CustomerSchema>
