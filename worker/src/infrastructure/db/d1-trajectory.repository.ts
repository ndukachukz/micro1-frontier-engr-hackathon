import type { Trajectory } from '@chata/shared'

import type { TrajectoryRepository } from '../../services/ports'

export class D1TrajectoryRepository implements TrajectoryRepository {
  constructor(private readonly db: D1Database) {}

  async save(trajectory: Trajectory): Promise<void> {
    await this.db
      .prepare(
        'INSERT OR REPLACE INTO trajectories (id, agent, case_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(
        trajectory.id,
        trajectory.agent,
        trajectory.case_id,
        JSON.stringify(trajectory),
        trajectory.created_at,
      )
      .run()
  }
}
