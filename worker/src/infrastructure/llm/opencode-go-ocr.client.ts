import type { OcrClient, PipelineError } from '../../core/tools/tool.types'
import type { Result } from '../../lib/result'
import { err, ok } from '../../lib/result'

const OCR_SYSTEM_PROMPT = `You transcribe payment screenshots for a Nigerian grocery vendor's order pipeline.
Extract ALL text visible in the image, preserving line breaks and the original values.
Pay special attention to: amount, recipient/beneficiary name, transaction reference, date and time.
Respond with the extracted text ONLY — no commentary, no code fences.`

/**
 * OpenCode Go-backed OCR port. Uses a vision-capable model through the
 * OpenAI-compatible /chat/completions endpoint (image_url content part).
 */
export class OpenCodeGoOcrClient implements OcrClient {
  readonly model: string
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(options: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = options.apiKey
    this.model = options.model ?? 'deepseek-v4-flash-vision-exp'
    this.baseUrl = (options.baseUrl ?? 'https://opencode.ai/zen/go/v1').replace(/\/$/, '')
  }

  async extractText(request: {
    imageUrl: string
    hint?: string
  }): Promise<Result<string, PipelineError>> {
    if (!this.apiKey) {
      return err({
        message:
          'OPENCODE_API_KEY is not configured (set it in worker/.dev.vars or wrangler secrets)',
        retryable: false,
      })
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: request.hint
                    ? `${OCR_SYSTEM_PROMPT}\n\nContext: ${request.hint}`
                    : OCR_SYSTEM_PROMPT,
                },
                { type: 'image_url', image_url: { url: request.imageUrl } },
              ],
            },
          ],
        }),
      })

      const body = await response.json().catch(() => null)
      if (!response.ok) {
        return err({
          message: `OpenCode Go OCR request failed (${response.status}): ${JSON.stringify(body).slice(0, 300)}`,
          retryable: response.status >= 500 || response.status === 429,
        })
      }

      const text = (body as { choices?: Array<{ message?: { content?: string } }> } | null)
        ?.choices?.[0]?.message?.content
      if (typeof text !== 'string' || text.trim() === '') {
        return err({ message: 'OpenCode Go OCR returned an empty response', retryable: true })
      }
      return ok(text.trim())
    } catch (requestError) {
      return err({
        message: requestError instanceof Error ? requestError.message : 'Unknown OCR failure',
        retryable: true,
      })
    }
  }
}
