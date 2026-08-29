import type { InboundMessage } from '@chata/shared'

import { messageText } from '@chata/shared'

/**
 * Deterministic extraction of bank-transfer evidence (reference + amount) from a
 * message body, caption, or payment-screenshot OCR text. Returns null when either
 * signal is missing — a payment reference without an amount cannot be matched.
 */
export interface PaymentEvidence {
  senderRef: string
  amountNgn: number
}

const REF_PATTERN = /ref(?:erence)?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9-]{3,})/i
const AMOUNT_PATTERN = /(?:NGN|N|₦)\s*([\d,]+(?:\.\d{1,2})?)/i

export function parsePaymentEvidence(message: InboundMessage): PaymentEvidence | null {
  const haystack = [messageText(message), message.screenshot_ocr_text ?? ''].join('\n')

  const refMatch = REF_PATTERN.exec(haystack)
  const amountMatch = AMOUNT_PATTERN.exec(haystack)
  if (!refMatch || !amountMatch) {
    return null
  }

  const amountNgn = Number.parseFloat(amountMatch[1].replace(/,/g, ''))
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) {
    return null
  }

  return { senderRef: refMatch[1].toUpperCase(), amountNgn: Math.round(amountNgn) }
}
