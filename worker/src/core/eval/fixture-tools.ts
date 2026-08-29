import type { CatalogItem, FixturesFile, PaymentRecord } from '@chata/shared'
import type { Result } from '../../lib/result'
import { ok } from '../../lib/result'
import type { PaymentTool, StockTool, ToolError } from '../tools/tool.types'

/**
 * In-memory tool implementations built from fixture data. Used by the eval
 * harness (deterministic, no D1 mutation) and by unit tests.
 */
export function createFixtureTools(fixtures: FixturesFile): {
  stock: StockTool
  payments: PaymentTool
} {
  const catalog = new Map(fixtures.store_catalog.map((item) => [item.sku, { ...item }]))
  const payments = fixtures.payment_records.map((payment) => ({ ...payment }))

  return {
    stock: {
      async find(sku: string): Promise<Result<CatalogItem | null, ToolError>> {
        return ok(catalog.get(sku) ?? null)
      },
      async deduct(sku: string, quantity: number): Promise<Result<'ok', ToolError>> {
        const item = catalog.get(sku)
        if (item) {
          item.stock -= quantity
        }
        return ok('ok' as const)
      },
    },
    payments: {
      async findBySenderRef(senderRef: string): Promise<Result<PaymentRecord | null, ToolError>> {
        const found =
          payments.find((p) => p.sender_ref.toUpperCase() === senderRef && !p.matched) ?? null
        return ok(found)
      },
      async markMatched(id: string): Promise<Result<'ok', ToolError>> {
        const payment = payments.find((p) => p.id === id)
        if (payment) {
          payment.matched = true
        }
        return ok('ok' as const)
      },
    },
  }
}
