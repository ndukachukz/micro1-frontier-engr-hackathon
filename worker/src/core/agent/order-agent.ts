import type {
  AgentOutput,
  CatalogItem,
  ConversationTurn,
  InboundMessage,
  Trajectory,
  TrajectoryStep,
} from '@chata/shared'
import type { Result } from '../../lib/result'
import type {
  LlmClient,
  OcrClient,
  PaymentTool,
  PipelineError,
  ReplySender,
  StockTool,
} from '../tools/tool.types'
import { type ExtractionResult, runExtraction } from './extraction'
import { runOcr } from './ocr'
import { buildReplyText } from './reply-templates'
import { runVerification } from './verification'

export interface OrderAgentDeps {
  llm: LlmClient
  /** Null when OCR is not configured; only required for messages with image attachments. */
  ocr: OcrClient | null
  stock: StockTool
  payments: PaymentTool
  /** Null when replies are not needed (e.g. eval runs). */
  replies: ReplySender | null
}

export interface OrderAgentInput {
  trajectoryId: string
  customer: { waId: string; name: string }
  catalog: readonly CatalogItem[]
  conversationHistory: readonly ConversationTurn[]
  message: InboundMessage
  sendReply: boolean
  replySentAt: string
}

export interface AgentRunResult {
  output: AgentOutput
  reply: string | null
  trajectory: Trajectory
}

/**
 * The full agent pipeline: ocr (vision, when the message has an image) ->
 * extract (LLM) -> verify (deterministic code) -> reply.
 * Each stage is recorded as a trajectory step so runs are auditable end-to-end.
 */
export async function runOrderAgent(
  deps: OrderAgentDeps,
  input: OrderAgentInput,
): Promise<Result<AgentRunResult, PipelineError>> {
  const steps: TrajectoryStep[] = []

  // Stage 0: OCR of an attached payment screenshot (skipped without an image).
  const ocrStart = new Date().toISOString()
  const ocrStarted = Date.now()
  const ocrStage = await runOcr(deps.ocr, input.message)
  if (!ocrStage.ok) {
    steps.push({
      step: 'ocr-payment-screenshot',
      tool: 'OcrClient',
      input: { image_url: input.message.attachment?.image_url },
      started_at: ocrStart,
      duration_ms: Date.now() - ocrStarted,
      error: ocrStage.error.message,
    })
    return { ok: false, error: ocrStage.error }
  }
  const message = ocrStage.value.message
  if (ocrStage.value.ocrText !== null) {
    steps.push({
      step: 'ocr-payment-screenshot',
      tool: 'OcrClient',
      input: { image_url: input.message.attachment?.image_url },
      output: { screenshot_ocr_text: ocrStage.value.ocrText },
      started_at: ocrStart,
      duration_ms: Date.now() - ocrStarted,
    })
  }

  // Stage 1: extraction (LLM).
  const extractStart = new Date().toISOString()
  const extractStarted = Date.now()
  const extraction = await runExtraction(deps.llm, {
    catalog: input.catalog,
    conversationHistory: input.conversationHistory,
    message,
  })
  if (!extraction.ok) {
    return { ok: false, error: extraction.error }
  }
  steps.push({
    step: 'extract-order',
    tool: 'LlmClient',
    input: { message, history_turns: input.conversationHistory.length },
    output: extraction.value,
    started_at: extractStart,
    duration_ms: Date.now() - extractStarted,
  })

  // Stage 2: verification (deterministic tools + code).
  const verifyStart = new Date().toISOString()
  const verifyStarted = Date.now()
  const verified = await runVerification({
    extraction: extraction.value,
    message,
    catalog: input.catalog,
    stock: deps.stock,
    payments: deps.payments,
  })
  if (!verified.ok) {
    steps.push({
      step: 'verify-and-decide',
      tool: 'StockTool+PaymentTool',
      input: { extraction: extraction.value },
      started_at: verifyStart,
      duration_ms: Date.now() - verifyStarted,
      error: verified.error.message,
    })
    return { ok: false, error: verified.error }
  }
  steps.push({
    step: 'verify-and-decide',
    tool: 'StockTool+PaymentTool',
    input: { extraction: extraction.value },
    output: verified.value,
    started_at: verifyStart,
    duration_ms: Date.now() - verifyStarted,
  })

  // Stage 3: mocked reply. Recorded even without a configured sender (eval runs);
  // a failed send is logged in the trajectory but does not fail the run.
  const catalogNames = new Map(input.catalog.map((item) => [item.sku, item.name]))
  const reply = buildReplyText(verified.value, catalogNames)
  if (reply && input.sendReply) {
    const sendStart = new Date().toISOString()
    const sendStarted = Date.now()
    let sendError: string | undefined
    if (deps.replies) {
      const sent = await deps.replies.send({
        waId: input.customer.waId,
        text: reply,
        sentAt: input.replySentAt,
      })
      sendError = sent.ok ? undefined : sent.error.message
    }
    steps.push({
      step: 'send-reply',
      tool: 'ReplySender',
      input: { waId: input.customer.waId, text: reply },
      output: { delivered: deps.replies !== null },
      started_at: sendStart,
      duration_ms: Date.now() - sendStarted,
      error: sendError,
    })
  }

  return {
    ok: true,
    value: {
      output: verified.value,
      reply,
      trajectory: {
        id: input.trajectoryId,
        agent: 'agent',
        case_id: null,
        customer: { wa_id: input.customer.waId, name: input.customer.name },
        message: input.message,
        conversation_history: [...input.conversationHistory],
        output: verified.value,
        steps,
        created_at: new Date().toISOString(),
      },
    },
  }
}

export type { ExtractionResult }
