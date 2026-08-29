import type { AgentOutput, InboundMessage, Trajectory, TrajectoryStep } from '@chata/shared'

import { AgentOutputSchema } from '@chata/shared'
import type { Result } from '../../lib/result'
import { runOcr } from '../agent/ocr'
import { BASELINE_SYSTEM_PROMPT, buildBaselineUserPrompt } from '../agent/prompts'
import type { LlmClient, OcrClient, PipelineError } from '../tools/tool.types'

export interface BaselineInput {
  trajectoryId: string
  customer: { waId: string; name: string }
  message: InboundMessage
}

/**
 * The baseline (PROJECT_PLAN §5): a single LLM call, one prompt, no tools,
 * no verification, no memory. Every later iteration is measured against this.
 */
export async function runBaselineAgent(
  llm: LlmClient,
  ocr: OcrClient | null,
  input: BaselineInput,
): Promise<Result<{ output: AgentOutput; trajectory: Trajectory }, PipelineError>> {
  const steps: TrajectoryStep[] = []
  const startedAt = new Date().toISOString()
  const started = Date.now()

  const ocrStage = await runOcr(ocr, input.message)
  if (!ocrStage.ok) {
    return { ok: false, error: ocrStage.error }
  }

  const result = await llm.completeJson({
    system: BASELINE_SYSTEM_PROMPT,
    user: buildBaselineUserPrompt(ocrStage.value.message),
    schema: AgentOutputSchema,
    schemaName: 'AgentOutput',
    maxTokens: 1024,
  })
  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  steps.push({
    step: 'single-call-parse',
    tool: 'LlmClient',
    input: { message: input.message },
    output: result.value,
    started_at: startedAt,
    duration_ms: Date.now() - started,
  })

  return {
    ok: true,
    value: {
      output: result.value,
      trajectory: {
        id: input.trajectoryId,
        agent: 'baseline',
        case_id: null,
        customer: { wa_id: input.customer.waId, name: input.customer.name },
        message: input.message,
        conversation_history: [],
        output: result.value,
        steps,
        created_at: new Date().toISOString(),
      },
    },
  }
}
