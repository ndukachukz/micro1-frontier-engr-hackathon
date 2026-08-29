import type { AgentOutput } from '@chata/shared'
import { describe, expect, it } from 'vitest'

import { normalizeOutput, scoreCase } from '../../src/core/eval/score'

const output = (overrides: Partial<AgentOutput>): AgentOutput => ({
  action: 'await_payment',
  order: { items: [{ sku: 'RICE_BAG', quantity: 2 }], total_ngn: 90000, confidence: 'high' },
  payment_status: 'unconfirmed',
  matched_payment_id: null,
  flags: [],
  ...overrides,
})

describe('scoreCase', () => {
  it('passes on an exact match regardless of item order', () => {
    const expected = output({
      order: {
        items: [
          { sku: 'A', quantity: 1 },
          { sku: 'B', quantity: 2 },
        ],
        total_ngn: 10,
        confidence: 'high',
      },
    })
    const actual = output({
      order: {
        items: [
          { sku: 'B', quantity: 2 },
          { sku: 'A', quantity: 1 },
        ],
        total_ngn: 10,
        confidence: 'high',
      },
    })
    expect(scoreCase(expected, actual).passed).toBe(true)
  })

  it('passes when matched_payment_id is undefined vs null', () => {
    const expected = output({ matched_payment_id: undefined })
    const actual = output({ matched_payment_id: null })
    expect(scoreCase(expected, actual).passed).toBe(true)
  })

  it('fails on any field mismatch and reports which fields differ', () => {
    const result = scoreCase(
      output({ action: 'confirm_order', payment_status: 'matched' }),
      output({
        action: 'flag_for_review',
        payment_status: 'mismatched',
        matched_payment_id: 'PMT002',
        flags: ['payment_amount_mismatch'],
      }),
    )
    expect(result.passed).toBe(false)
    expect(result.diff.action).toBe(true)
    expect(result.diff.payment_status).toBe(true)
    expect(result.diff.matched_payment_id).toBe(true)
    expect(result.diff.flags).toBe(true)
  })

  it('marks a false confirm when the agent confirms what should not be confirmed', () => {
    const result = scoreCase(
      output({ action: 'flag_for_review' }),
      output({ action: 'confirm_order' }),
    )
    expect(result.falseConfirm).toBe(true)
  })

  it('does not count a correct confirm as a false confirm', () => {
    const result = scoreCase(
      output({ action: 'confirm_order' }),
      output({ action: 'confirm_order' }),
    )
    expect(result.falseConfirm).toBe(false)
  })

  it('normalizes flags as a set', () => {
    const result = scoreCase(output({ flags: ['b', 'a'] }), output({ flags: ['a', 'a', 'b'] }))
    expect(result.passed).toBe(true)
  })
})

describe('normalizeOutput', () => {
  it('sorts items and flags and nulls matched_payment_id', () => {
    const normalized = normalizeOutput(
      output({
        flags: ['z', 'a'],
        order: {
          items: [
            { sku: 'B', quantity: 1 },
            { sku: 'A', quantity: 1 },
          ],
          total_ngn: 5,
          confidence: 'low',
        },
      }),
    )
    expect(normalized.flags).toEqual(['a', 'z'])
    expect(normalized.order?.items.map((item) => item.sku)).toEqual(['A', 'B'])
    expect(normalized.matched_payment_id).toBeNull()
  })

  it('drops an explicit reconstructed_from_history: false so it matches an omitted field', () => {
    const withFalse = normalizeOutput(
      output({
        order: {
          items: [{ sku: 'A', quantity: 1 }],
          total_ngn: 5,
          confidence: 'high',
          reconstructed_from_history: false,
        },
      }),
    )
    const omitted = normalizeOutput(
      output({
        order: {
          items: [{ sku: 'A', quantity: 1 }],
          total_ngn: 5,
          confidence: 'high',
        },
      }),
    )
    expect(JSON.stringify(withFalse.order)).toBe(JSON.stringify(omitted.order))
    expect(scoreCase(omitted, withFalse).passed).toBe(true)
  })
})
