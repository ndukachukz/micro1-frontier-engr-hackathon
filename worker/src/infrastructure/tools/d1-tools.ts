import type { PaymentTool, ReplySender, StockTool, ToolError } from '../../core/tools/tool.types'
import type { Result } from '../../lib/result'
import { err, ok } from '../../lib/result'
import type {
  CatalogRepository,
  ConversationRepository,
  PaymentRepository,
} from '../../services/ports'

async function guard<T>(fn: () => Promise<T>): Promise<Result<T, ToolError>> {
  try {
    return ok(await fn())
  } catch (error) {
    return err({ message: error instanceof Error ? error.message : 'Tool failure' })
  }
}

export class D1StockTool implements StockTool {
  constructor(private readonly catalog: CatalogRepository) {}

  find(sku: string): Promise<Result<Awaited<ReturnType<CatalogRepository['get']>>, ToolError>> {
    return guard(() => this.catalog.get(sku))
  }

  deduct(sku: string, quantity: number): Promise<Result<'ok', ToolError>> {
    return guard(async () => {
      await this.catalog.deduct(sku, quantity)
      return 'ok' as const
    })
  }
}

export class D1PaymentTool implements PaymentTool {
  constructor(private readonly payments: PaymentRepository) {}

  findBySenderRef(
    senderRef: string,
  ): Promise<Result<Awaited<ReturnType<PaymentRepository['findBySenderRef']>>, ToolError>> {
    return guard(() => this.payments.findBySenderRef(senderRef))
  }

  markMatched(id: string): Promise<Result<'ok', ToolError>> {
    return guard(async () => {
      await this.payments.markMatched(id)
      return 'ok' as const
    })
  }
}

/** Mocked WhatsApp reply: the message is recorded in conversation history. */
export class D1ReplySender implements ReplySender {
  constructor(private readonly conversations: ConversationRepository) {}

  send(input: { waId: string; text: string; sentAt: string }): Promise<Result<'ok', ToolError>> {
    return guard(async () => {
      await this.conversations.append({
        waId: input.waId,
        direction: 'outbound',
        text: input.text,
        timestamp: input.sentAt,
      })
      return 'ok' as const
    })
  }
}
