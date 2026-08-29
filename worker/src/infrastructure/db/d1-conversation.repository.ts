import type { ConversationTurn } from '@chata/shared'
import { ConversationTurnSchema } from '@chata/shared'
import type { ConversationRepository } from '../../services/ports'

interface ConversationRow {
  timestamp: string
  direction: 'inbound' | 'outbound'
  text: string
}

export class D1ConversationRepository implements ConversationRepository {
  constructor(private readonly db: D1Database) {}

  async history(waId: string): Promise<ConversationTurn[]> {
    const { results } = await this.db
      .prepare(
        'SELECT timestamp, direction, text FROM conversations WHERE wa_id = ? ORDER BY timestamp',
      )
      .bind(waId)
      .all<ConversationRow>()
    return results.map((row) => ConversationTurnSchema.parse(row))
  }

  async append(input: {
    waId: string
    direction: 'inbound' | 'outbound'
    text: string
    timestamp: string
  }): Promise<void> {
    await this.db
      .prepare(
        'INSERT OR IGNORE INTO conversations (wa_id, timestamp, direction, text) VALUES (?, ?, ?, ?)',
      )
      .bind(input.waId, input.timestamp, input.direction, input.text)
      .run()
  }
}
