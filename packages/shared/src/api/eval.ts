import { z } from 'zod'

import { AgentOutputSchema } from '../domain/agent'
import { TrajectorySchema } from '../domain/fixtures'

export const EvalAgentNameSchema = z.enum(['baseline', 'agent'])
export type EvalAgentName = z.infer<typeof EvalAgentNameSchema>

export const EvalDiffSchema = z.object({
  action: z.boolean(),
  order: z.boolean(),
  payment_status: z.boolean(),
  matched_payment_id: z.boolean(),
  flags: z.boolean(),
})

export const EvalCaseResultSchema = z.object({
  case_id: z.string(),
  category: z.string(),
  passed: z.boolean(),
  false_confirm: z
    .boolean()
    .describe('True when the agent confirmed an order that should not have been confirmed'),
  expected: AgentOutputSchema,
  actual: AgentOutputSchema,
  diff: EvalDiffSchema,
})

export const EvalMetricsSchema = z.object({
  total_cases: z.number().int().nonnegative(),
  passed_cases: z.number().int().nonnegative(),
  accuracy: z.number(),
  false_confirm_count: z.number().int().nonnegative(),
  by_category: z.record(
    z.string(),
    z.object({ total: z.number().int(), passed: z.number().int() }),
  ),
})

export const EvalRunRequestSchema = z.object({
  agents: z.array(EvalAgentNameSchema).nonempty().default(['baseline', 'agent']),
  case_ids: z.array(z.string()).optional().describe('Defaults to every fixture case'),
})

export const EvalRunSummarySchema = z.object({
  id: z.string(),
  agents: z.array(EvalAgentNameSchema),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  metrics: z.record(z.string(), EvalMetricsSchema),
  cases: z.array(EvalCaseResultSchema.extend({ agent: EvalAgentNameSchema })),
})

export const EvalRunListItemSchema = z.object({
  id: z.string(),
  agents: z.array(z.string()),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  metrics: z.record(z.string(), EvalMetricsSchema),
})

export const EvalReplayRequestSchema = z.object({
  agent: EvalAgentNameSchema.default('agent'),
})

export const EvalReplayResponseSchema = z.object({
  case_id: z.string(),
  agent: EvalAgentNameSchema,
  output: AgentOutputSchema,
  expected: AgentOutputSchema.nullable(),
  passed: z.boolean().nullable(),
  reply: z.string().nullable(),
  trajectory: TrajectorySchema,
})

export type EvalDiff = z.infer<typeof EvalDiffSchema>
export type EvalCaseResult = z.infer<typeof EvalCaseResultSchema>
export type EvalMetrics = z.infer<typeof EvalMetricsSchema>
export type EvalRunRequest = z.infer<typeof EvalRunRequestSchema>
export type EvalRunSummary = z.infer<typeof EvalRunSummarySchema>
export type EvalRunListItem = z.infer<typeof EvalRunListItemSchema>
export type EvalReplayRequest = z.infer<typeof EvalReplayRequestSchema>
export type EvalReplayResponse = z.infer<typeof EvalReplayResponseSchema>
