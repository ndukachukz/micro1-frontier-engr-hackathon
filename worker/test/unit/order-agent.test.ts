import { describe, expect, it } from 'vitest'

import type { ZodType } from 'zod'
import { runOrderAgent } from '../../src/core/agent/order-agent'
import { createFixtureTools } from '../../src/core/eval/fixture-tools'
import type { LlmClient, PipelineError } from '../../src/core/tools/tool.types'
import { loadFixtures } from '../../src/lib/fixtures'
import type { Result } from '../../src/lib/result'
import { ok } from '../../src/lib/result'

/** Scripted LLM double: returns canned extraction results without any network I/O. */
function fakeLlm(result: unknown): LlmClient {
  return {
    async completeJson<T>(_request: { schema: ZodType<T> }): Promise<Result<T, PipelineError>> {
      return ok(result as T)
    },
  }
}

const fixtures = loadFixtures()

describe('runOrderAgent', () => {
  it('runs the full pipeline: extract → verify → reply, with code overriding LLM arithmetic', async () => {
    const tools = createFixtureTools(fixtures)
    const result = await runOrderAgent(
      {
        llm: fakeLlm({
          action: 'await_payment',
          order: {
            items: [
              { sku: 'BEANS_BUCKET', quantity: 1 },
              { sku: 'OIL_5L', quantity: 1 },
            ],
            total_ngn: 99999, // deliberately wrong — verification must fix it
            confidence: 'high',
          },
          flags: [],
        }),
        stock: tools.stock,
        payments: tools.payments,
        replies: null,
        ocr: null,
      },
      {
        trajectoryId: 'traj-test',
        customer: { waId: '2348000000103', name: 'Adaeze O.' },
        catalog: fixtures.store_catalog,
        conversationHistory: [],
        message: {
          type: 'image',
          timestamp: '2026-08-27T10:17:00Z',
          caption: 'Payment attached',
          screenshot_ocr_text: 'Bank Transfer Successful\nAmount: NGN 20,000.00\nRef: GTB-887421',
        },
        sendReply: true,
        replySentAt: '2026-08-27T10:17:30Z',
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.output.action).toBe('confirm_order')
    expect(result.value.output.payment_status).toBe('matched')
    expect(result.value.output.matched_payment_id).toBe('PMT001')
    expect(result.value.output.order?.total_ngn).toBe(20000)
    expect(result.value.reply).toContain('Payment confirmed')

    expect(result.value.trajectory.steps.map((step) => step.step)).toEqual([
      'extract-order',
      'verify-and-decide',
      'send-reply',
    ])
  })

  it('produces an await_payment decision and reply when no payment evidence exists', async () => {
    const tools = createFixtureTools(fixtures)
    const result = await runOrderAgent(
      {
        llm: fakeLlm({
          action: 'await_payment',
          order: {
            items: [{ sku: 'RICE_BAG', quantity: 2 }],
            total_ngn: 90000,
            confidence: 'high',
          },
          flags: [],
        }),
        stock: tools.stock,
        payments: tools.payments,
        replies: null,
        ocr: null,
      },
      {
        trajectoryId: 'traj-test-2',
        customer: { waId: '2348000000101', name: 'Ngozi A.' },
        catalog: fixtures.store_catalog,
        conversationHistory: [],
        message: { type: 'text', timestamp: '2026-08-27T09:12:00Z', text: '2 bags of rice please' },
        sendReply: true,
        replySentAt: '2026-08-27T09:12:30Z',
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.output.action).toBe('await_payment')
    expect(result.value.reply).toContain("We'll confirm once payment is received")
  })
})
