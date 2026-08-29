import type { EvalRunListItem, EvalRunSummary } from '@chata/shared'

import type { EvalRunRepository } from '../../services/ports'

interface EvalRunRow {
  id: string
  agents_json: string
  started_at: string
  finished_at: string | null
  payload_json: string
}

export class D1EvalRunRepository implements EvalRunRepository {
  constructor(private readonly db: D1Database) {}

  async save(run: EvalRunSummary): Promise<void> {
    await this.db
      .prepare(
        'INSERT OR REPLACE INTO eval_runs (id, agents_json, started_at, finished_at, payload_json) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(
        run.id,
        JSON.stringify(run.agents),
        run.started_at,
        run.finished_at,
        JSON.stringify(run),
      )
      .run()
  }

  async list(): Promise<EvalRunListItem[]> {
    const { results } = await this.db
      .prepare(
        'SELECT id, agents_json, started_at, finished_at, payload_json FROM eval_runs ORDER BY started_at DESC',
      )
      .all<EvalRunRow>()
    return results.map((row) => {
      const payload = JSON.parse(row.payload_json) as EvalRunSummary
      return {
        id: row.id,
        agents: JSON.parse(row.agents_json) as string[],
        started_at: row.started_at,
        finished_at: row.finished_at,
        metrics: payload.metrics,
      }
    })
  }
}
