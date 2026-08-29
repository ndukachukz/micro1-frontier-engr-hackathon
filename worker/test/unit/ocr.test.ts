import type { InboundMessage } from '@chata/shared'
import { describe, expect, it } from 'vitest'
import { runOcr } from '../../src/core/agent/ocr'
import type { OcrClient, PipelineError } from '../../src/core/tools/tool.types'
import type { Result } from '../../src/lib/result'
import { err, ok } from '../../src/lib/result'

/** OCR double that records whether it was called. */
function fakeOcr(result: Result<string, PipelineError>): { client: OcrClient; calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    client: {
      async extractText(request: { imageUrl: string }): Promise<Result<string, PipelineError>> {
        calls.push(request.imageUrl)
        return result
      },
    },
  }
}

const imageMessage: InboundMessage = {
  type: 'image',
  timestamp: '2026-08-27T10:17:00Z',
  caption: 'Payment attached',
  attachment: { filename: 'receipt.jpg', image_url: 'data:image/png;base64,abc123' },
}

describe('runOcr', () => {
  it('is a no-op for text messages (no OCR call)', async () => {
    const { client, calls } = fakeOcr(ok('text'))
    const message: InboundMessage = {
      type: 'text',
      timestamp: '2026-08-27T09:12:00Z',
      text: '2 bags of rice please',
    }

    const result = await runOcr(client, message)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.ocrText).toBeNull()
    expect(result.value.message).toBe(message)
    expect(calls).toEqual([])
  })

  it('skips the live call when OCR text is already pre-extracted (cached/fixture stand-in)', async () => {
    const { client, calls } = fakeOcr(ok('SHOULD NOT BE USED'))

    const result = await runOcr(client, {
      ...imageMessage,
      screenshot_ocr_text: 'Bank Transfer Successful\nRef: GTB-887421',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.message.screenshot_ocr_text).toBe(
      'Bank Transfer Successful\nRef: GTB-887421',
    )
    expect(result.value.ocrText).toBeNull()
    expect(calls).toEqual([])
  })

  it('extracts text and fills screenshot_ocr_text when the message carries an image', async () => {
    const ocrText = 'Bank Transfer Successful\nAmount: NGN 20,000.00\nRef: GTB-887421'
    const { client, calls } = fakeOcr(ok(ocrText))

    const result = await runOcr(client, imageMessage)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.ocrText).toBe(ocrText)
    expect(result.value.message.screenshot_ocr_text).toBe(ocrText)
    expect(result.value.message.caption).toBe('Payment attached')
    expect(calls).toEqual([imageMessage.attachment?.image_url])
  })

  it('fails when an image is present but no OcrClient is configured', async () => {
    const result = await runOcr(null, imageMessage)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('no OcrClient is configured')
  })

  it('propagates OCR failures', async () => {
    const { client } = fakeOcr(err({ message: 'vision upstream down', retryable: true }))

    const result = await runOcr(client, imageMessage)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toBe('vision upstream down')
  })
})
