import { z } from 'zod'

import { AgentOutputSchema } from './agent'
import { CatalogItemSchema } from './catalog'
import { ConversationTurnSchema, InboundMessageSchema } from './message'
import { PaymentRecordSchema } from './payment'

export const TrajectoryStepSchema = z.object({
  step: z.string(),
  tool: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  started_at: z.string(),
  duration_ms: z.number().int().nonnegative(),
  error: z.string().optional(),
})

export const TrajectorySchema = z.object({
  id: z.string(),
  agent: z.enum(['baseline', 'agent']),
  case_id: z.string().nullable(),
  customer: z.object({ wa_id: z.string(), name: z.string() }),
  message: InboundMessageSchema,
  conversation_history: z.array(ConversationTurnSchema),
  output: AgentOutputSchema,
  steps: z.array(TrajectoryStepSchema),
  created_at: z.string(),
})

export const FixtureCaseSchema = z.object({
  id: z.string(),
  category: z.string(),
  customer: z.object({ wa_id: z.string(), name: z.string() }),
  conversation_history: z.array(ConversationTurnSchema),
  message: InboundMessageSchema,
  expected_output: AgentOutputSchema,
  notes: z.string().optional(),
})

export const FixturesFileSchema = z.object({
  _readme: z.string().optional(),
  store_catalog: z.array(CatalogItemSchema),
  payment_records: z.array(PaymentRecordSchema),
  test_cases: z.array(FixtureCaseSchema),
})

export type TrajectoryStep = z.infer<typeof TrajectoryStepSchema>
export type Trajectory = z.infer<typeof TrajectorySchema>
export type FixtureCase = z.infer<typeof FixtureCaseSchema>
export type FixturesFile = z.infer<typeof FixturesFileSchema>
