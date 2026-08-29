import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { EvalRunSummarySchema } from '@chata/shared'
import { renderSummaryMarkdown, renderTrajectoryMarkdown } from '../src/core/eval/evidence'
import { loadFixtures } from '../src/lib/fixtures'

/**
 * Export an eval run from local D1 into a committed, human-readable evidence
 * bundle: docs/eval-evidence/summary.md plus one trajectory file per agent per
 * case. Judges read these files directly; nothing here needs a running worker —
 * just the local D1 state the eval wrote to.
 *
 * Usage:
 *   bun --cwd worker export:eval                 # export the latest run
 *   bun --cwd worker export:eval EVAL-65111d52   # export a specific run
 */

// Scripts run with cwd = worker/ (see other scripts in this directory).
const WORKER_DIR = process.cwd()
const OUTPUT_DIR = resolve(WORKER_DIR, '..', 'docs', 'eval-evidence')

interface D1StatementResult {
  results: Array<Record<string, unknown>>
  success: boolean
}

async function main(): Promise<void> {
  const runId = process.argv[2]
  if (runId !== undefined && !/^EVAL-[a-z0-9]+$/i.test(runId)) {
    throw new Error(
      `Run id looks wrong: "${runId}" (expected an EVAL-xxxx id — see GET /eval/runs)`,
    )
  }
  const payload = fetchLatestRunPayload(runId)
  const summary = EvalRunSummarySchema.parse(JSON.parse(payload))
  if (runId !== undefined && summary.id.toLowerCase() !== runId.toLowerCase()) {
    throw new Error(`Run ${runId} not found (latest run is ${summary.id})`)
  }
  const { store_catalog: catalog } = loadFixtures()

  const written: string[] = []

  for (const result of summary.cases) {
    if (!result.trajectory) {
      throw new Error(
        `Eval run ${summary.id} case ${result.case_id} (${result.agent}) has no persisted trajectory — re-run the eval on this version.`,
      )
    }
    const trajectoryMarkdown = renderTrajectoryMarkdown(result.trajectory, {
      category: result.category,
      passed: result.passed,
      falseConfirm: result.false_confirm,
      diff: result.diff,
      expected: result.expected,
      actual: result.actual,
      reply: result.reply ?? null,
      catalog,
    })
    const trajectoryPath = join(OUTPUT_DIR, 'trajectories', result.agent, `${result.case_id}.md`)
    await writeFileAs(trajectoryPath, trajectoryMarkdown)
    written.push(relativeToRepo(trajectoryPath))
  }

  const summaryMarkdown = renderSummaryMarkdown(summary, {
    generatedAt: new Date().toISOString(),
    model: modelLabel(),
  })
  const summaryPath = join(OUTPUT_DIR, 'summary.md')
  await writeFileAs(summaryPath, summaryMarkdown)
  written.push(relativeToRepo(summaryPath))

  console.log(`Exported eval run ${summary.id} -> docs/eval-evidence/`)
  console.log(`  ${written.length} files written (summary + ${written.length - 1} trajectories)`)
  console.log('  Commit docs/eval-evidence/ to share the evidence.')
}

function fetchLatestRunPayload(runId?: string): string {
  const filter = runId ? `WHERE id = '${runId.replace(/'/g, "''")}'` : ''
  const query = `SELECT payload_json FROM eval_runs ${filter} ORDER BY started_at DESC LIMIT 1`
  const proc = spawnSync(
    'bunx',
    ['wrangler', 'd1', 'execute', 'chata', '--local', '--json', '--command', query],
    { cwd: WORKER_DIR, encoding: 'utf8' },
  )

  if (proc.status !== 0) {
    console.error(proc.stderr)
    throw new Error(
      'wrangler d1 execute failed — is the local D1 state initialized? Run `bun --cwd worker migrate` first.',
    )
  }

  const statements = parseStatements(proc.stdout ?? '')
  const row = statements[0]?.results?.[0]
  if (!row || typeof row.payload_json !== 'string') {
    throw new Error(
      runId
        ? `Run ${runId} not found in local D1. List runs with GET /eval/runs.`
        : 'No eval run found in local D1. Run the eval first: start the worker (bun dev) and POST /eval/run — see README "Reproduction guide".',
    )
  }
  return row.payload_json
}

function parseStatements(stdout: string): D1StatementResult[] {
  try {
    const parsed: unknown = JSON.parse(stdout)
    if (Array.isArray(parsed)) return parsed as D1StatementResult[]
    if (parsed && typeof parsed === 'object' && 'results' in parsed) {
      return [parsed as D1StatementResult]
    }
  } catch {
    // wrangler may print progress lines before the JSON document — retry on the JSON substring.
  }
  const start = stdout.indexOf('[')
  const end = stdout.lastIndexOf(']')
  if (start >= 0 && end > start) {
    return JSON.parse(stdout.slice(start, end + 1)) as D1StatementResult[]
  }
  throw new Error(`Could not parse wrangler output:\n${stdout.slice(0, 400)}`)
}

function modelLabel(): string {
  return process.env.OPENCODE_MODEL ?? wranglerVar('OPENCODE_MODEL') ?? 'minimax-m3'
}

/** Reads a flat string var from worker/wrangler.jsonc (config is comment-free). */
function wranglerVar(name: string): string | null {
  const config = readFileSync(resolve(WORKER_DIR, 'wrangler.jsonc'), 'utf8')
  const match = new RegExp(`"${name}"\\s*:\\s*"([^"]+)"`).exec(config)
  return match?.[1] ?? null
}

async function writeFileAs(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

function relativeToRepo(path: string): string {
  return relative(resolve(WORKER_DIR, '..'), path)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
