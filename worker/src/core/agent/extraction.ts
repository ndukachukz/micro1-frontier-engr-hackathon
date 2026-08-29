import type { CatalogItem, ConversationTurn, InboundMessage, Order } from '@chata/shared'
import { OrderSchema } from '@chata/shared'
import { z } from 'zod'
import type { Result } from '../../lib/result'
import type { LlmClient, PipelineError } from '../tools/tool.types'
import { buildExtractionUserPrompt, EXTRACTION_SYSTEM_PROMPT } from './prompts'

/** What the LLM extraction stage returns. Payment/stock decisions are made downstream in code. */
export const ExtractionResultSchema = z.object({
  action: z.enum(['await_payment', 'needs_clarification', 'cancel_order', 'no_order']),
  order: OrderSchema.nullable(),
  flags: z.array(z.string()),
  reasoning: z.string().optional(),
})

export interface ExtractionResult {
  action: 'await_payment' | 'needs_clarification' | 'cancel_order' | 'no_order'
  order: Order | null
  flags: string[]
  reasoning?: string
}

export interface ExtractionInput {
  catalog: readonly CatalogItem[]
  conversationHistory: readonly ConversationTurn[]
  message: InboundMessage
}

export async function runExtraction(
  llm: LlmClient,
  input: ExtractionInput,
): Promise<Result<ExtractionResult, PipelineError>> {
  return llm.completeJson({
    system: EXTRACTION_SYSTEM_PROMPT,
    user: buildExtractionUserPrompt(input),
    schema: ExtractionResultSchema,
    schemaName: 'ExtractionResult',
    maxTokens: 1024,
  })
}
