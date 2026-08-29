import type { Context } from 'hono'
import { AppError } from '../../lib/errors'
import type { AppEnv } from '../../types'

/** Maps typed AppErrors to problem responses; everything else becomes a 500. */
export function errorHandler(error: Error, c: Context<AppEnv>) {
  if (error instanceof AppError) {
    return c.json(
      { status: error.status, title: error.title, detail: error.detail },
      error.status as 400,
    )
  }
  console.error('[unhandled]', error)
  return c.json({ status: 500, title: 'Internal Server Error' }, 500)
}
