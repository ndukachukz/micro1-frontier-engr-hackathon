import type { OrderDto } from '@chata/shared'

import type { OrderPatch, OrderRepository } from '../../services/ports'

interface OrderRow {
  id: string
  customer_wa_id: string
  customer_name: string
  items_json: string
  total_ngn: number
  status: OrderDto['status']
  action: string | null
  payment_status: OrderDto['payment_status']
  matched_payment_id: string | null
  flags_json: string
  instance_id: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id, customer_wa_id, customer_name, items_json, total_ngn, status, action, payment_status, matched_payment_id, flags_json, instance_id, created_at, updated_at'

const toDto = (row: OrderRow): OrderDto => ({
  id: row.id,
  customer_wa_id: row.customer_wa_id,
  customer_name: row.customer_name,
  items: JSON.parse(row.items_json) as OrderDto['items'],
  total_ngn: row.total_ngn,
  status: row.status,
  action: (row.action as OrderDto['action']) ?? null,
  payment_status: row.payment_status,
  matched_payment_id: row.matched_payment_id,
  flags: JSON.parse(row.flags_json) as string[],
  instance_id: row.instance_id,
  created_at: row.created_at,
  updated_at: row.updated_at,
})

export class D1OrderRepository implements OrderRepository {
  constructor(private readonly db: D1Database) {}

  async create(order: OrderDto): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO orders (id, customer_wa_id, customer_name, items_json, total_ngn, status, action, payment_status, matched_payment_id, flags_json, instance_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        order.id,
        order.customer_wa_id,
        order.customer_name,
        JSON.stringify(order.items),
        order.total_ngn,
        order.status,
        order.action,
        order.payment_status,
        order.matched_payment_id,
        JSON.stringify(order.flags),
        order.instance_id,
        order.created_at,
        order.updated_at,
      )
      .run()
  }

  async get(id: string): Promise<OrderDto | null> {
    const row = await this.db
      .prepare(`SELECT ${COLUMNS} FROM orders WHERE id = ?`)
      .bind(id)
      .first<OrderRow>()
    return row ? toDto(row) : null
  }

  async list(): Promise<OrderDto[]> {
    const { results } = await this.db
      .prepare(`SELECT ${COLUMNS} FROM orders ORDER BY created_at DESC`)
      .all<OrderRow>()
    return results.map(toDto)
  }

  async update(id: string, patch: OrderPatch): Promise<void> {
    const sets: string[] = []
    const values: unknown[] = []

    if (patch.items) {
      sets.push('items_json = ?')
      values.push(JSON.stringify(patch.items))
    }
    if (patch.total_ngn !== undefined) {
      sets.push('total_ngn = ?')
      values.push(patch.total_ngn)
    }
    if (patch.status) {
      sets.push('status = ?')
      values.push(patch.status)
    }
    if (patch.action !== undefined) {
      sets.push('action = ?')
      values.push(patch.action)
    }
    if (patch.payment_status) {
      sets.push('payment_status = ?')
      values.push(patch.payment_status)
    }
    if (patch.matched_payment_id !== undefined) {
      sets.push('matched_payment_id = ?')
      values.push(patch.matched_payment_id)
    }
    if (patch.flags) {
      sets.push('flags_json = ?')
      values.push(JSON.stringify(patch.flags))
    }
    if (patch.instance_id !== undefined) {
      sets.push('instance_id = ?')
      values.push(patch.instance_id)
    }

    sets.push('updated_at = ?')
    values.push(new Date().toISOString(), id)

    await this.db
      .prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()
  }

  async latestAwaitingPaymentFor(waId: string): Promise<OrderDto | null> {
    const row = await this.db
      .prepare(
        `SELECT ${COLUMNS} FROM orders WHERE customer_wa_id = ? AND status = 'awaiting_payment' ORDER BY updated_at DESC LIMIT 1`,
      )
      .bind(waId)
      .first<OrderRow>()
    return row ? toDto(row) : null
  }
}
