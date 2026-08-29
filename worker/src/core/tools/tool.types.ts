import type { CatalogItem, PaymentRecord } from '@chata/shared'
import type { ZodType } from 'zod'

import type { Result } from '../../lib/result'

export interface ToolError {
  message: string
}

export interface PipelineError {
  message: string
  retryable: boolean
}

/**
 * Ports (hexagonal): the core pipeline depends only on these interfaces.
 * Infrastructure provides D1-backed implementations; tests and evals provide in-memory ones.
 */
export interface StockTool {
  find(sku: string): Promise<Result<CatalogItem | null, ToolError>>
  deduct(sku: string, quantity: number): Promise<Result<'ok', ToolError>>
}

export interface PaymentTool {
  findBySenderRef(senderRef: string): Promise<Result<PaymentRecord | null, ToolError>>
  markMatched(id: string): Promise<Result<'ok', ToolError>>
}

export interface ReplySender {
  send(input: { waId: string; text: string; sentAt: string }): Promise<Result<'ok', ToolError>>
}

export interface LlmClient {
  completeJson<T>(request: {
    system: string
    user: string
    schema: ZodType<T>
    schemaName: string
    maxTokens?: number
  }): Promise<Result<T, PipelineError>>
}

/** Vision port: extracts text from an image (e.g. a payment screenshot). */
export interface OcrClient {
  extractText(request: { imageUrl: string; hint?: string }): Promise<Result<string, PipelineError>>
}
