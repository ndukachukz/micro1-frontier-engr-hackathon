import {
  EvalReplayRequestSchema,
  EvalReplayResponseSchema,
  EvalRunListItemSchema,
  EvalRunRequestSchema,
  EvalRunSummarySchema,
  ProblemSchema,
} from '@chata/shared'

import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute, z } from '@hono/zod-openapi'
import type { AppServices } from '../services/container'
import type { AppEnv } from '../types'

const idParam = z.object({
  caseId: z.string().min(1).describe('Fixture case id, e.g. case_07_payment_mismatch_adversarial'),
})

const runEvalRoute = createRoute({
  method: 'post',
  path: '/eval/run',
  tags: ['Eval'],
  summary: 'Run the eval harness over fixtures',
  description:
    'Executes the selected agents (baseline and/or agent) over the fixture cases and scores outputs against expected_output. Costs one LLM call per agent per case.',
  request: {
    body: { content: { 'application/json': { schema: EvalRunRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Eval run summary with per-case results',
      content: { 'application/json': { schema: EvalRunSummarySchema } },
    },
    400: {
      description: 'Invalid request',
      content: { 'application/json': { schema: ProblemSchema } },
    },
    502: {
      description: 'Agent/LLM failure',
      content: { 'application/json': { schema: ProblemSchema } },
    },
  },
})

const replayCaseRoute = createRoute({
  method: 'post',
  path: '/eval/fixtures/{caseId}/replay',
  tags: ['Eval'],
  summary: 'Replay a single fixture case',
  description:
    'Runs one case through the selected agent and returns the output, expected output, and full trajectory.',
  request: {
    params: idParam,
    body: { content: { 'application/json': { schema: EvalReplayRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Single-case replay result with trajectory',
      content: { 'application/json': { schema: EvalReplayResponseSchema } },
    },
    404: {
      description: 'Unknown case id',
      content: { 'application/json': { schema: ProblemSchema } },
    },
  },
})

const listRunsRoute = createRoute({
  method: 'get',
  path: '/eval/runs',
  tags: ['Eval'],
  summary: 'List past eval runs',
  responses: {
    200: {
      description: 'Eval run summaries',
      content: {
        'application/json': { schema: z.object({ runs: z.array(EvalRunListItemSchema) }) },
      },
    },
  },
})

export function registerEvalRoutes(app: OpenAPIHono<AppEnv>, services: AppServices): void {
  app.openapi(runEvalRoute, async (c) => {
    const body = c.req.valid('json')
    const summary = await services.eval.run(body)
    return c.json(summary, 200)
  })

  app.openapi(replayCaseRoute, async (c) => {
    const { caseId } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await services.eval.replay(caseId, body.agent)
    return c.json(result, 200)
  })

  app.openapi(listRunsRoute, async (c) => {
    const runs = await services.repositories.evalRuns.list()
    return c.json({ runs }, 200)
  })
}
