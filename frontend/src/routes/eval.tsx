import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { api } from '#/lib/api/client'
import { evalRunsQuery } from '#/lib/api/queries'

export const Route = createFileRoute('/eval')({ component: EvalPage })

function EvalPage() {
  const queryClient = useQueryClient()
  const [lastRun, setLastRun] = useState<string | null>(null)
  const runs = useQuery(evalRunsQuery())

  const runEval = useMutation({
    mutationFn: () => api.runEval({ agents: ['baseline', 'agent'] }),
    onSuccess: (summary) => {
      setLastRun(summary.id)
      void queryClient.invalidateQueries({ queryKey: ['eval'] })
    },
  })

  const baseline = lastRunSummary(runs.data?.runs ?? [], lastRun, 'baseline')
  const agent = lastRunSummary(runs.data?.runs ?? [], lastRun, 'agent')

  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Evaluation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Runs every fixture case through the baseline and the agent, scoring exact-match against
            expected output. Costs one LLM call per agent per case.
          </p>
        </div>
        <button
          type="button"
          onClick={() => runEval.mutate()}
          disabled={runEval.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {runEval.isPending ? 'Running eval…' : 'Run eval (baseline + agent)'}
        </button>
      </header>

      {runEval.error && (
        <p className="mb-4 text-sm text-rose-600">{(runEval.error as Error).message}</p>
      )}

      {runs.data && runs.data.runs.length > 0 && <MetricsTable runs={runs.data.runs} />}
      {runs.data && runs.data.runs.length === 0 && (
        <p className="text-sm text-slate-500">No eval runs yet — press the button above.</p>
      )}

      {baseline && agent && <ComparisonHighlight baseline={baseline} agent={agent} />}
    </main>
  )
}

type RunListItem = Awaited<ReturnType<typeof api.listEvalRuns>>['runs'][number]

function lastRunSummary(runs: RunListItem[], lastRunId: string | null, agent: string) {
  const pool = runs.filter(
    (run) => run.agents.includes(agent) && (lastRunId === null || run.id === lastRunId),
  )
  const latest = pool[0]
  return latest ? { run: latest, metrics: latest.metrics[agent] } : null
}

function MetricsTable({ runs }: { runs: RunListItem[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Run</th>
            <th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Accuracy</th>
            <th className="px-4 py-3">False confirms</th>
            <th className="px-4 py-3">Started</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {runs.slice(0, 10).flatMap((run) =>
            Object.entries(run.metrics).map(([agent, metrics]) => (
              <tr key={`${run.id}-${agent}`}>
                <td className="px-4 py-3 font-mono text-xs">{run.id}</td>
                <td className="px-4 py-3">{agent}</td>
                <td className="px-4 py-3">
                  {metrics.passed_cases}/{metrics.total_cases} (
                  {(metrics.accuracy * 100).toFixed(0)}%)
                </td>
                <td
                  className={`px-4 py-3 ${metrics.false_confirm_count > 0 ? 'font-semibold text-rose-600' : ''}`}
                >
                  {metrics.false_confirm_count}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(run.started_at).toLocaleString()}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </section>
  )
}

function ComparisonHighlight({
  baseline,
  agent,
}: {
  baseline: { run: RunListItem; metrics: RunListItem['metrics'][string] }
  agent: { run: RunListItem; metrics: RunListItem['metrics'][string] }
}) {
  if (baseline.run.id !== agent.run.id) return null
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-700">Latest run — {agent.run.id}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <MetricCard
          title="Baseline (single prompt, no tools)"
          accuracy={baseline.metrics.accuracy}
          falseConfirms={baseline.metrics.false_confirm_count}
        />
        <MetricCard
          title="Agent (tools + verification + memory)"
          accuracy={agent.metrics.accuracy}
          falseConfirms={agent.metrics.false_confirm_count}
          highlight
        />
      </div>
    </section>
  )
}

function MetricCard({
  title,
  accuracy,
  falseConfirms,
  highlight = false,
}: {
  title: string
  accuracy: number
  falseConfirms: number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${highlight ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
    >
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{(accuracy * 100).toFixed(0)}%</p>
      <p className={`mt-1 text-sm ${falseConfirms > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
        false confirms: {falseConfirms}
      </p>
    </div>
  )
}
