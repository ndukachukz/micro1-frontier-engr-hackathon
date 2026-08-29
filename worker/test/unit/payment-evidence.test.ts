import type { InboundMessage } from '@chata/shared'
import { describe, expect, it } from 'vitest'

import { parsePaymentEvidence } from '../../src/core/agent/payment-evidence'

const image = (ocr?: string, caption?: string): InboundMessage => ({
  type: 'image',
  timestamp: '2026-08-27T10:17:00Z',
  caption,
  screenshot_ocr_text: ocr,
})

describe('parsePaymentEvidence', () => {
  it('extracts reference and amount from screenshot OCR text', () => {
    const evidence = parsePaymentEvidence(
      image(
        'Bank Transfer Successful\nAmount: NGN 20,000.00\nTo: Chata Stores\nRef: GTB-887421\n27 Aug 2026, 10:16',
      ),
    )
    expect(evidence).toEqual({ senderRef: 'GTB-887421', amountNgn: 20000 })
  })

  it('falls back to the caption when the OCR text is missing', () => {
    const evidence = parsePaymentEvidence(image(undefined, 'Paid NGN 3,500 ref: ZEN-114820'))
    expect(evidence).toEqual({ senderRef: 'ZEN-114820', amountNgn: 3500 })
  })

  it('returns null when the reference is missing', () => {
    expect(parsePaymentEvidence(image('Amount: NGN 20,000.00'))).toBeNull()
  })

  it('returns null when the amount is missing', () => {
    expect(parsePaymentEvidence(image('Ref: GTB-887421'))).toBeNull()
  })

  it('returns null for plain text messages without payment evidence', () => {
    expect(
      parsePaymentEvidence({ type: 'text', timestamp: 't', text: '2 bags of rice' }),
    ).toBeNull()
  })
})
