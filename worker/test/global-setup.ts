import { execSync } from 'node:child_process'

import { type Unstable_DevWorker, unstable_dev } from 'wrangler'

let worker: Unstable_DevWorker

export async function setup(ctx: { provide: (key: string, value: string) => void }): Promise<void> {
  // Apply schema + fixture seed to the local D1 state, then boot the real worker.
  execSync('bunx wrangler d1 migrations apply chata --local', { stdio: 'inherit' })
  execSync('bun scripts/seed.ts', { stdio: 'inherit' })
  execSync('bunx wrangler d1 execute chata --local --file=.seed/seed.sql', { stdio: 'inherit' })

  worker = await unstable_dev('src/index.ts', {
    experimental: { disableExperimentalWarning: true },
  })
  ctx.provide('workerUrl', `http://127.0.0.1:${worker.port}`)
}

export async function teardown(): Promise<void> {
  await worker?.stop()
}
