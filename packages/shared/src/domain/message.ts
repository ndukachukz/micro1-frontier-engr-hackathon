import { z } from 'zod'

export const MessageDirectionSchema = z.enum(['inbound', 'outbound'])

export const ConversationTurnSchema = z.object({
  timestamp: z.string().describe('ISO 8601 timestamp of the turn'),
  direction: MessageDirectionSchema,
  text: z.string(),
})

export const MessageAttachmentSchema = z.object({
  filename: z.string(),
  note: z.string().optional(),
  image_url: z
    .string()
    .optional()
    .describe(
      'URL (or data URI) of the image. When set and no OCR text is pre-extracted, the OCR stage extracts the text.',
    ),
})

export const InboundMessageSchema = z
  .object({
    type: z.enum(['text', 'image']),
    timestamp: z.string().describe('ISO 8601 timestamp of the message'),
    text: z.string().optional().describe('Body of a text message'),
    caption: z.string().optional().describe('Caption of an image message'),
    attachment: MessageAttachmentSchema.optional(),
    screenshot_ocr_text: z
      .string()
      .optional()
      .describe(
        'OCR extraction of a payment screenshot. Pre-extracted text (cached OCR or fixture stand-in) wins over a live OCR call.',
      ),
  })
  .refine((m) => (m.type === 'text' ? typeof m.text === 'string' : true), {
    message: 'A message of type "text" must include `text`',
  })

export type ConversationTurn = z.infer<typeof ConversationTurnSchema>
export type InboundMessage = z.infer<typeof InboundMessageSchema>

/** Flattens the textual content of an inbound message (body or caption). */
export function messageText(message: InboundMessage): string {
  return message.text ?? message.caption ?? ''
}
