import type { CatalogItem } from '@chata/shared'
import { CatalogItemSchema } from '@chata/shared'
import type { CatalogRepository } from '../../services/ports'

export class D1CatalogRepository implements CatalogRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<CatalogItem[]> {
    const { results } = await this.db
      .prepare('SELECT sku, name, price_ngn, stock FROM catalog_items ORDER BY sku')
      .all()
    return results.map((row) => CatalogItemSchema.parse(row))
  }

  async get(sku: string): Promise<CatalogItem | null> {
    const row = await this.db
      .prepare('SELECT sku, name, price_ngn, stock FROM catalog_items WHERE sku = ?')
      .bind(sku)
      .first()
    return row ? CatalogItemSchema.parse(row) : null
  }

  async deduct(sku: string, quantity: number): Promise<void> {
    await this.db
      .prepare('UPDATE catalog_items SET stock = stock - ? WHERE sku = ?')
      .bind(quantity, sku)
      .run()
  }
}
