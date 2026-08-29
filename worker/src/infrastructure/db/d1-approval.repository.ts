import type { ApprovalRecord, ApprovalRepository } from '../../services/ports'

interface ApprovalRow {
  order_id: string
  status: ApprovalRecord['status']
  requested_at: string
  resolved_at: string | null
  note: string | null
}

export class D1ApprovalRepository implements ApprovalRepository {
  constructor(private readonly db: D1Database) {}

  async upsert(input: {
    orderId: string
    status: ApprovalRecord['status']
    requestedAt?: string
    resolvedAt?: string
    note?: string
  }): Promise<void> {
    const existing = await this.get(input.orderId)
    const requestedAt = input.requestedAt ?? existing?.requestedAt ?? new Date().toISOString()
    const resolvedAt = input.resolvedAt ?? existing?.resolvedAt ?? null
    const note = input.note ?? existing?.note ?? null

    await this.db
      .prepare(
        `INSERT INTO approvals (order_id, status, requested_at, resolved_at, note) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(order_id) DO UPDATE SET status = excluded.status, resolved_at = excluded.resolved_at, note = excluded.note`,
      )
      .bind(input.orderId, input.status, requestedAt, resolvedAt, note)
      .run()
  }

  async get(orderId: string): Promise<ApprovalRecord | null> {
    const row = await this.db
      .prepare(
        'SELECT order_id, status, requested_at, resolved_at, note FROM approvals WHERE order_id = ?',
      )
      .bind(orderId)
      .first<ApprovalRow>()
    if (!row) {
      return null
    }
    return {
      orderId: row.order_id,
      status: row.status,
      requestedAt: row.requested_at,
      resolvedAt: row.resolved_at,
      note: row.note,
    }
  }
}
