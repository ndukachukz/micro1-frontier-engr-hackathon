import type { PipelineError } from '../core/tools/tool.types'

/**
 * Retry helper mirroring the production workflow's retry semantics (ARCHITECTURE.md:
 * "LLM parse errors are retryable — workflow steps re-throw them to trigger step
 * retries"). Only errors marked `retryable` are attempted again; permanent
 * failures (e.g. missing credentials) surface immediately.
 */
export async function runWithRetries<T>(
  fn: () => Promise<T>,
  attempts: number,
  options: { backoffMs?: number } = {},
): Promise<T> {
  const backoffMs = options.backoffMs ?? 1000
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const retryable = (error as PipelineError | undefined)?.retryable === true
      if (!retryable || attempt >= attempts) {
        throw error
      }
      await sleep(backoffMs * attempt)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
