import type {
  AgentOutput,
  EvalAgentName,
  EvalCaseResult,
  EvalMetrics,
  EvalReplayResponse,
  EvalRunRequest,
  EvalRunSummary,
  FixtureCase,
  Trajectory,
} from '@chata/shared'
import { runOrderAgent } from '../core/agent/order-agent'
import { runBaselineAgent } from '../core/baseline/baseline-agent'
import { createFixtureTools } from '../core/eval/fixture-tools'
import { scoreCase } from '../core/eval/score'
import type { LlmClient, OcrClient } from '../core/tools/tool.types'
import { badRequest, notFound, upstreamError } from '../lib/errors'
import { loadFixtures } from '../lib/fixtures'
import type { EvalRunRepository, TrajectoryRepository } from './ports'

type ScoredCase = EvalCaseResult & {
  agent: EvalAgentName
  reply: string | null
  trajectory: Trajectory
}

/**
 * Eval harness: runs fixture cases through the baseline and/or agent pipeline
 * with in-memory fixture tools (deterministic, no state mutation), scores the
 * outputs against expected_output, and persists trajectories + run summaries.
 */
export class EvalService {
  constructor(
    private readonly deps: {
      llmFactory: () => LlmClient
      ocrFactory: () => OcrClient
      trajectories: TrajectoryRepository
      evalRuns: EvalRunRepository
    },
  ) {}

  async run(request: EvalRunRequest): Promise<EvalRunSummary> {
    const fixtures = loadFixtures()
    const cases = request.case_ids?.length
      ? fixtures.test_cases.filter((fixtureCase) => request.case_ids?.includes(fixtureCase.id))
      : fixtures.test_cases
    if (cases.length === 0) {
      throw badRequest('No fixture cases matched the requested ids')
    }

    const startedAt = new Date().toISOString()
    const llm = this.deps.llmFactory()
    const ocr = this.deps.ocrFactory()
    const scored: ScoredCase[] = []
    for (const agent of request.agents) {
      for (const fixtureCase of cases) {
        scored.push(await this.runCase(llm, ocr, agent, fixtureCase))
      }
    }

    const summary: EvalRunSummary = {
      id: `EVAL-${crypto.randomUUID().slice(0, 8)}`,
      agents: [...request.agents],
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      metrics: Object.fromEntries(
        request.agents.map((agent) => [agent, computeMetrics(scored, agent)]),
      ),
      cases: scored,
    }
    await this.deps.evalRuns.save(summary)
    return summary
  }

  async replay(caseId: string, agent: EvalAgentName): Promise<EvalReplayResponse> {
    const fixtureCase = findCase(caseId)
    const scored = await this.runCase(
      this.deps.llmFactory(),
      this.deps.ocrFactory(),
      agent,
      fixtureCase,
    )
    return {
      case_id: scored.case_id,
      agent: scored.agent,
      output: scored.actual,
      expected: scored.expected,
      passed: scored.passed,
      reply: scored.reply,
      trajectory: scored.trajectory,
    }
  }

  private async runCase(
    llm: LlmClient,
    ocr: OcrClient,
    agent: EvalAgentName,
    fixtureCase: FixtureCase,
  ): Promise<ScoredCase> {
    const customer = { waId: fixtureCase.customer.wa_id, name: fixtureCase.customer.name }
    let output: AgentOutput
    let trajectory: Trajectory
    let reply: string | null = null

    if (agent === 'baseline') {
      const result = await runBaselineAgent(llm, ocr, {
        trajectoryId: `${fixtureCase.id}-baseline`,
        customer,
        message: fixtureCase.message,
      })
      if (!result.ok) {
        throw upstreamError(`Baseline failed on ${fixtureCase.id}: ${result.error.message}`)
      }
      output = result.value.output
      trajectory = { ...result.value.trajectory, case_id: fixtureCase.id }
    } else {
      const fixtures = loadFixtures()
      const tools = createFixtureTools(fixtures)
      const result = await runOrderAgent(
        { llm, ocr, stock: tools.stock, payments: tools.payments, replies: null },
        {
          trajectoryId: `${fixtureCase.id}-agent`,
          customer,
          catalog: fixtures.store_catalog,
          conversationHistory: fixtureCase.conversation_history,
          message: fixtureCase.message,
          sendReply: true,
          replySentAt: new Date().toISOString(),
        },
      )
      if (!result.ok) {
        throw upstreamError(`Agent failed on ${fixtureCase.id}: ${result.error.message}`)
      }
      output = result.value.output
      reply = result.value.reply
      trajectory = { ...result.value.trajectory, case_id: fixtureCase.id }
    }

    const score = scoreCase(fixtureCase.expected_output, output)
    await this.deps.trajectories.save(trajectory)

    return {
      case_id: fixtureCase.id,
      category: fixtureCase.category,
      passed: score.passed,
      false_confirm: score.falseConfirm,
      expected: fixtureCase.expected_output,
      actual: output,
      diff: score.diff,
      agent,
      reply,
      trajectory,
    }
  }
}

function findCase(caseId: string): FixtureCase {
  const fixtureCase = loadFixtures().test_cases.find((candidate) => candidate.id === caseId)
  if (!fixtureCase) {
    throw notFound(`Fixture case ${caseId} not found`)
  }
  return fixtureCase
}

function computeMetrics(scored: ScoredCase[], agent: EvalAgentName): EvalMetrics {
  const agentResults = scored.filter((result) => result.agent === agent)
  const byCategory: Record<string, { total: number; passed: number }> = {}
  for (const result of agentResults) {
    byCategory[result.category] ??= { total: 0, passed: 0 }
    byCategory[result.category].total += 1
    if (result.passed) {
      byCategory[result.category].passed += 1
    }
  }
  const passed = agentResults.filter((result) => result.passed).length
  return {
    total_cases: agentResults.length,
    passed_cases: passed,
    accuracy: agentResults.length > 0 ? passed / agentResults.length : 0,
    false_confirm_count: agentResults.filter((result) => result.false_confirm).length,
    by_category: byCategory,
  }
}
