import type { PaymentRecord } from '@chata/shared'
import { PaymentRecordSchema } from '@chata/shared'
import type { PaymentRepository } from '../../services/ports'

const COLUMNS = 'id, amount_ngn, sender_ref, timestamp, matched'

interface PaymentRow {
  id: string
  amount_ngn: number
  sender_ref: string
  timestamp: string
  matched: number
}

const toRecord = (row: PaymentRow): PaymentRecord =>
  PaymentRecordSchema.parse({
    id: row.id,
    amount_ngn: row.amount_ngn,
    sender_ref: row.sender_ref,
    timestamp: row.timestamp,
    matched: row.matched === 1,
  })

export class D1PaymentRepository implements PaymentRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<PaymentRecord[]> {
    const { results } = await this.db
      .prepare(`SELECT ${COLUMNS} FROM payment_records ORDER BY timestamp`)
      .all<PaymentRow>()
    return results.map(toRecord)
  }

  async get(id: string): Promise<PaymentRecord | null> {
    const row = await this.db
      .prepare(`SELECT ${COLUMNS} FROM payment_records WHERE id = ?`)
      .bind(id)
      .first<PaymentRow>()
    return row ? toRecord(row) : null
  }

  async findBySenderRef(senderRef: string): Promise<PaymentRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT ${COLUMNS} FROM payment_records WHERE sender_ref = ? AND matched = 0 ORDER BY timestamp DESC LIMIT 1`,
      )
      .bind(senderRef)
      .first<PaymentRow>()
    return row ? toRecord(row) : null
  }

  async create(input: {
    id: string
    amountNgn: number
    senderRef: string
    timestamp: string
  }): Promise<PaymentRecord> {
    await this.db
      .prepare(
        'INSERT INTO payment_records (id, amount_ngn, sender_ref, timestamp, matched) VALUES (?, ?, ?, ?, 0)',
      )
      .bind(input.id, input.amountNgn, input.senderRef, input.timestamp)
      .run()
    return {
      id: input.id,
      amount_ngn: input.amountNgn,
      sender_ref: input.senderRef,
      timestamp: input.timestamp,
      matched: false,
    }
  }

  async markMatched(id: string): Promise<void> {
    await this.db.prepare('UPDATE payment_records SET matched = 1 WHERE id = ?').bind(id).run()
  }
}
