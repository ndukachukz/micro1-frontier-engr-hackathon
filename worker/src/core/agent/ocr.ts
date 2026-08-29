import type { InboundMessage } from '@chata/shared'
import type { Result } from '../../lib/result'
import { err, ok } from '../../lib/result'
import type { OcrClient, PipelineError } from '../tools/tool.types'

export interface OcrStageResult {
  /** The message to use downstream — `screenshot_ocr_text` filled when OCR ran. */
  message: InboundMessage
  /** Extracted text, or null when no OCR was performed (no image / pre-extracted). */
  ocrText: string | null
}

/**
 * OCR stage: when an inbound message carries an image attachment, run vision
 * OCR and attach the extracted text as `screenshot_ocr_text` for extraction.
 *
 * Skips work when there is no image, or when the text is already present
 * (pre-extracted text — cached OCR or a fixture stand-in — wins over a live
 * call, which keeps eval fixtures deterministic).
 */
export async function runOcr(
  ocr: OcrClient | null,
  message: InboundMessage,
): Promise<Result<OcrStageResult, PipelineError>> {
  const imageUrl = message.attachment?.image_url
  if (!imageUrl || message.screenshot_ocr_text) {
    return ok({ message, ocrText: null })
  }
  if (!ocr) {
    return err({
      message: 'Message has an image attachment but no OcrClient is configured',
      retryable: false,
    })
  }

  const extracted = await ocr.extractText({
    imageUrl,
    hint: message.caption ? `WhatsApp image caption: "${message.caption}"` : undefined,
  })
  if (!extracted.ok) {
    return extracted
  }

  return ok({
    message: { ...message, screenshot_ocr_text: extracted.value },
    ocrText: extracted.value,
  })
}
