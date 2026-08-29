import { describe, expect, it, vi } from 'vitest'
import type { PipelineError } from '../../src/core/tools/tool.types'
import { runWithRetries } from '../../src/lib/retry'

const retryable = (message: string): PipelineError => ({ message, retryable: true })
const permanent = (message: string): PipelineError => ({ message, retryable: false })

describe('runWithRetries', () => {
  it('returns the value on first success without extra calls', async () => {
    const fn = vi.fn(async () => 'ok')
    const result = await runWithRetries(fn, 3)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries retryable failures and succeeds on a later attempt', async () => {
    let attempts = 0
    const fn = async (): Promise<string> => {
      attempts += 1
      if (attempts < 3) throw retryable(`attempt ${attempts} failed`)
      return 'recovered'
    }
    const result = await runWithRetries(fn, 3)
    expect(result).toBe('recovered')
    expect(attempts).toBe(3)
  })

  it('gives up after the attempt limit and rethrows the last retryable error', async () => {
    let attempts = 0
    const fn = async (): Promise<string> => {
      attempts += 1
      throw retryable(`always fails ${attempts}`)
    }
    await expect(runWithRetries(fn, 3)).rejects.toMatchObject({ message: 'always fails 3' })
    expect(attempts).toBe(3)
  })

  it('does not retry permanent failures', async () => {
    const fn = vi.fn(async () => {
      throw permanent('bad key')
    })
    await expect(runWithRetries(fn, 3)).rejects.toMatchObject({ message: 'bad key' })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('waits between attempts', async () => {
    let attempts = 0
    const fn = async (): Promise<string> => {
      attempts += 1
      if (attempts < 2) throw retryable('once')
      return 'ok'
    }
    const started = Date.now()
    await runWithRetries(fn, 3, { backoffMs: 25 })
    expect(Date.now() - started).toBeGreaterThanOrEqual(20)
  })
})
