import type { LlmClient, PipelineError } from '../../core/tools/tool.types'
import type { Result } from '../../lib/result'
import { err, ok } from '../../lib/result'
import { extractJson, responseText } from './json'

/**
 * OpenCode Go-backed LLM port (https://opencode.ai/docs/go). Calls the
 * Anthropic-compatible /messages endpoint over plain fetch — no SDK. Forces
 * JSON output in the prompt, strips code fences, and validates against the
 * caller's zod schema before returning.
 */
export class OpenCodeGoLlmClient implements LlmClient {
  readonly model: string
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(options: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = options.apiKey
    this.model = options.model ?? 'minimax-m3'
    this.baseUrl = (options.baseUrl ?? 'https://opencode.ai/zen/go/v1').replace(/\/$/, '')
  }

  async completeJson<T>(request: {
    system: string
    user: string
    schema: import('zod').ZodType<T>
    schemaName: string
    maxTokens?: number
  }): Promise<Result<T, PipelineError>> {
    const missing = validateKey(this.apiKey)
    if (missing) {
      return err(missing)
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          // The Anthropic-compatible endpoint authenticates via x-api-key
          // (Bearer is kept for gateways that expect it instead).
          'x-api-key': this.apiKey,
          authorization: `Bearer ${this.apiKey}`,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens ?? 2048,
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
        }),
      })

      const body = await response.json().catch(() => null)
      if (!response.ok) {
        return err({
          message: `OpenCode Go request failed (${response.status}): ${snippet(body)}`,
          retryable: response.status >= 500 || response.status === 429,
        })
      }

      const text = responseText(body)
      if (text.trim() === '') {
        return err({ message: 'OpenCode Go returned an empty response', retryable: true })
      }

      let candidate: unknown
      try {
        candidate = extractJson(text)
      } catch (parseError) {
        return err({
          message: `LLM response was not valid JSON for schema "${request.schemaName}": ${parseError instanceof Error ? parseError.message : 'unknown'}`,
          retryable: true,
        })
      }

      const validated = request.schema.safeParse(candidate)
      if (!validated.success) {
        return err({
          message: `LLM response violated schema "${request.schemaName}": ${validated.error.message}`,
          retryable: true,
        })
      }
      return ok(validated.data)
    } catch (requestError) {
      return err({
        message: requestError instanceof Error ? requestError.message : 'Unknown LLM failure',
        retryable: true,
      })
    }
  }
}

function validateKey(apiKey: string): PipelineError | null {
  if (!apiKey) {
    return {
      message:
        'OPENCODE_API_KEY is not configured (set it in worker/.dev.vars or wrangler secrets)',
      retryable: false,
    }
  }
  return null
}

function snippet(body: unknown): string {
  try {
    return JSON.stringify(body).slice(0, 300)
  } catch {
    return '(unreadable body)'
  }
}
