import { z } from 'zod'

export const ProblemSchema = z.object({
  status: z.number().int(),
  title: z.string(),
  detail: z.string().optional(),
})

export type Problem = z.infer<typeof ProblemSchema>

export const IdParamSchema = z.object({
  id: z.string().min(1).describe('Resource identifier'),
})

export type IdParam = z.infer<typeof IdParamSchema>
