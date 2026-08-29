import type { CatalogItem, InboundMessage } from '@chata/shared'
import { describe, expect, it } from 'vitest'
import type { ExtractionResult } from '../../src/core/agent/extraction'
import { runVerification } from '../../src/core/agent/verification'
import { createFixtureTools } from '../../src/core/eval/fixture-tools'
import { loadFixtures } from '../../src/lib/fixtures'

const catalog: CatalogItem[] = loadFixtures().store_catalog

const tools = () => createFixtureTools(loadFixtures())

const orderFor = (skus: Array<[string, number]>): ExtractionResult => ({
  action: 'await_payment',
  order: {
    items: skus.map(([sku, quantity]) => ({ sku, quantity })),
    total_ngn: 0,
    confidence: 'high',
  },
  flags: [],
})

const textMessage = (text: string): InboundMessage => ({
  type: 'text',
  timestamp: '2026-08-27T09:12:00Z',
  text,
})

const ocrMessage = (ocr: string, caption?: string): InboundMessage => ({
  type: 'image',
  timestamp: '2026-08-27T10:17:00Z',
  caption,
  screenshot_ocr_text: ocr,
})

describe('runVerification (deterministic decision stage)', () => {
  it('returns await_payment/unconfirmed when no payment evidence is present', async () => {
    const result = await runVerification({
      extraction: orderFor([['RICE_BAG', 2]]),
      message: textMessage('2 bags of rice please'),
      catalog,
      ...tools(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.action).toBe('await_payment')
    expect(result.value.payment_status).toBe('unconfirmed')
    expect(result.value.matched_payment_id).toBeNull()
    // Total recomputed from catalog: 2 x 45000
    expect(result.value.order?.total_ngn).toBe(90000)
  })

  it('confirms the order when the referenced payment matches the total (case_03)', async () => {
    const result = await runVerification({
      extraction: orderFor([
        ['BEANS_BUCKET', 1],
        ['OIL_5L', 1],
      ]),
      message: ocrMessage(
        'Bank Transfer Successful\nAmount: NGN 20,000.00\nTo: Chata Stores\nRef: GTB-887421\n27 Aug 2026, 10:16',
        'Payment attached',
      ),
      catalog,
      ...tools(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.action).toBe('confirm_order')
    expect(result.value.payment_status).toBe('matched')
    expect(result.value.matched_payment_id).toBe('PMT001')
    expect(result.value.order?.total_ngn).toBe(20000)
  })

  it('flags a mismatched payment instead of confirming (case_07 — the costly failure mode)', async () => {
    const result = await runVerification({
      extraction: orderFor([
        ['EGGS_CRATE', 2],
        ['TOMATOES_BASKET', 1],
      ]),
      message: ocrMessage(
        'Bank Transfer Successful\nAmount: NGN 10,000.00\nTo: Chata Stores\nRef: ZEN-114820\n27 Aug 2026, 11:42',
      ),
      catalog,
      ...tools(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.action).toBe('flag_for_review')
    expect(result.value.payment_status).toBe('mismatched')
    expect(result.value.matched_payment_id).toBe('PMT002')
    expect(result.value.flags).toContain('payment_amount_mismatch')
  })

  it('flags an unknown payment reference', async () => {
    const result = await runVerification({
      extraction: orderFor([['RICE_BAG', 1]]),
      message: ocrMessage('Transfer done\nAmount: NGN 45,000.00\nRef: XYZ-999999'),
      catalog,
      ...tools(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.action).toBe('flag_for_review')
    expect(result.value.payment_status).toBe('unmatched')
    expect(result.value.flags).toContain('payment_reference_not_found')
  })

  it('flags out-of-stock items and never confirms them (case_05)', async () => {
    const result = await runVerification({
      extraction: orderFor([['GARRI_BAG', 1]]),
      message: textMessage('1 bag of garri today'),
      catalog,
      ...tools(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.action).toBe('flag_for_review')
    expect(result.value.payment_status).toBe('n/a')
    expect(result.value.flags).toContain('item_out_of_stock')
  })

  it('passes non-order intents through untouched', async () => {
    const result = await runVerification({
      extraction: {
        action: 'needs_clarification',
        order: null,
        flags: ['no_quantity_specified', 'ambiguous_intent'],
      },
      message: textMessage('Do you have rice?'),
      catalog,
      ...tools(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.action).toBe('needs_clarification')
    expect(result.value.order).toBeNull()
    expect(result.value.payment_status).toBe('n/a')
    expect(result.value.flags).toEqual(['ambiguous_intent', 'no_quantity_specified'])
  })

  it('honors cancellations with the reconstructed order', async () => {
    const extraction: ExtractionResult = {
      action: 'cancel_order',
      order: {
        items: [
          { sku: 'SEMO_5KG', quantity: 1 },
          { sku: 'OIL_5L', quantity: 1 },
        ],
        total_ngn: 18500,
        confidence: 'high',
        reconstructed_from_history: true,
      },
      flags: [],
    }
    const result = await runVerification({
      extraction,
      message: textMessage('Please cancel that order'),
      catalog,
      ...tools(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.action).toBe('cancel_order')
    expect(result.value.payment_status).toBe('n/a')
    expect(result.value.order?.reconstructed_from_history).toBe(true)
  })

  it('overrides an LLM arithmetic error with the catalog-computed total', async () => {
    const badMath = orderFor([
      ['RICE_BAG', 2],
      ['EGGS_CRATE', 1],
    ])
    if (badMath.order) badMath.order.total_ngn = 1 // deliberately wrong
    const result = await runVerification({
      extraction: badMath,
      message: textMessage('2 bags of rice and 1 crate of eggs'),
      catalog,
      ...tools(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.order?.total_ngn).toBe(93500)
  })
})
