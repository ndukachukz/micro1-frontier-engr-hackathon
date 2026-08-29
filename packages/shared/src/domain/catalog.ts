import { z } from 'zod'

export const CatalogItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  price_ngn: z.number().int().nonnegative().describe('Unit price in whole naira'),
  stock: z.number().int().nonnegative().describe('Units currently available'),
})

export type CatalogItem = z.infer<typeof CatalogItemSchema>
