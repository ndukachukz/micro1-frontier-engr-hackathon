import type {
  AgentOutput,
  CatalogItem,
  EvalRunSummary,
  Trajectory,
  TrajectoryStep,
} from '@chata/shared'
import {
  BASELINE_SYSTEM_PROMPT,
  buildBaselineUserPrompt,
  buildExtractionUserPrompt,
  EXTRACTION_SYSTEM_PROMPT,
} from '../agent/prompts'

/**
 * Human-readable evidence rendering for committed eval bundles. Pure string
 * builders — no I/O — so the exported markdown is unit-testable and the export
 * script stays a thin file-writer.
 */

export interface TrajectoryEvidenceContext {
  category: string
  passed: boolean
  falseConfirm: boolean
  /** `true` = the field DIFFERS from the expected output (see EvalDiffSchema). */
  diff: Record<string, boolean>
  expected: AgentOutput
  actual: AgentOutput
  reply: string | null
  /** The catalog the agent saw (extraction user prompt reconstruction). Optional for the baseline. */
  catalog?: readonly CatalogItem[]
}

export interface SummaryEvidenceOptions {
  generatedAt: string
  model: string
}

export function renderTrajectoryMarkdown(
  trajectory: Trajectory,
  context: TrajectoryEvidenceContext,
): string {
  const { agent } = trajectory
  const instructions = renderInstructions(trajectory, context.catalog)
  const verdict = context.falseConfirm
    ? '**FAIL — FALSE CONFIRM** (the run confirmed an order that should not have been confirmed)'
    : context.passed
      ? '**PASS**'
      : '**FAIL**'

  const sections: string[] = [
    `# ${trajectory.case_id ?? trajectory.id} — ${agent} trajectory`,
    '',
    `- **Category**: ${context.category}`,
    `- **Customer**: ${trajectory.customer.name} (\`${trajectory.customer.wa_id}\`)`,
    `- **Verdict**: ${verdict}`,
    '',
    '## What the customer sent',
    '',
    ...renderConversation(trajectory),
    '',
    '## What the agent was instructed',
    '',
    ...instructions,
    '',
    '## Run log (what the agent did, in order)',
    '',
    ...renderSteps(trajectory.steps),
    '',
    '## Outcome',
    '',
    '**Expected output**:',
    '',
    jsonBlock(context.expected),
    '',
    '**Actual output**:',
    '',
    jsonBlock(context.actual),
    '',
    ...renderDiff(context),
    ...renderReply(context.reply),
  ]

  return sections.join('\n')
}

export function renderSummaryMarkdown(
  summary: EvalRunSummary,
  options: SummaryEvidenceOptions,
): string {
  const agents = summary.agents
  const headline = agents
    .map((agent) => {
      const metrics = summary.metrics[agent]
      if (!metrics) return null
      return `| ${agent} | ${pct(metrics.accuracy)} | ${metrics.passed_cases}/${metrics.total_cases} | ${metrics.false_confirm_count} |`
    })
    .filter(Boolean)

  const caseRows = summary.cases.map((result) => {
    const diffFields = Object.entries(result.diff)
      .filter(([, differs]) => differs)
      .map(([field]) => field)
    const verdict = result.passed
      ? 'pass'
      : `${caseVerdict(result)}${diffFields.length > 0 ? ` (differed: ${diffFields.join(', ')})` : ''}`
    return `| ${result.case_id} | ${result.category} | ${verdict} |`
  })

  const perCase = groupByAgent(summary.cases)
  const caseTable =
    agents.length > 1 ? renderSideBySideCaseTable(perCase, agents) : caseRows.join('\n')

  const categories = collectCategories(summary)
  const categoryRows = categories.map((category) => {
    const cells = agents.map((agent) => {
      const stats = summary.metrics[agent]?.by_category[category]
      return stats ? `${stats.passed}/${stats.total}` : '—'
    })
    return `| ${category} | ${cells.join(' | ')} |`
  })

  const trajectoryLinks = summary.cases.map((result) => {
    return `- [${result.agent} / ${result.case_id}](trajectories/${result.agent}/${result.case_id}.md)`
  })

  const case07 = summary.cases.filter((result) => result.case_id.startsWith('case_07'))
  const case07Line = case07
    .map((result) =>
      result.false_confirm
        ? `${result.agent}: false confirm (stock would be released against an underpaid order)`
        : result.passed
          ? `${result.agent}: flagged for review — the costly failure was prevented`
          : `${result.agent}: fail`,
    )
    .join('; ')

  return [
    `# Eval run ${summary.id} — evidence summary`,
    '',
    `- **Generated**: ${options.generatedAt}`,
    `- **Agents**: ${agents.join(', ')}`,
    `- **Model**: ${options.model} via OpenCode Go`,
    `- **Run window**: ${summary.started_at} → ${summary.finished_at ?? 'n/a'}`,
    '',
    '## How to reproduce',
    '',
    '```bash',
    'bun install',
    'bun --cwd worker migrate',
    'bun --cwd worker seed',
    'cp worker/.dev.vars.example worker/.dev.vars   # add OPENCODE_API_KEY',
    'bun dev',
    'curl -X POST http://localhost:8787/eval/run \\',
    "  -H 'content-type: application/json' \\",
    `  -d '{"agents": ["baseline", "agent"]}'`,
    '```',
    '',
    'Then re-export this bundle:',
    '',
    '```bash',
    'bun --cwd worker export:eval',
    '```',
    '',
    'Numbers may vary slightly across runs because the LLM is nondeterministic; see the README "expected output" section for the committed reference numbers and the acceptable range.',
    '',
    '## Headline',
    '',
    '| Agent | Accuracy | Passed | False confirms |',
    '|---|---|---|---|',
    ...headline,
    '',
    `**False confirms — the metric that matters most.** case_07 (adversarial underpayment): ${case07Line}.`,
    '',
    '## Per-category',
    '',
    `| Category | ${agents.join(' | ')} |`,
    '|---|---|---|',
    ...categoryRows,
    '',
    '## Per-case',
    '',
    ...(agents.length > 1
      ? [`| Case | Category | ${agents.map(label).join(' | ')} |`, '|---|---|---|---|', caseTable]
      : ['| Case | Category | Outcome |', '|---|---|---|', caseTable]),
    '',
    '## Full trajectories',
    '',
    ...trajectoryLinks,
    '',
  ].join('\n')
}

function renderInstructions(trajectory: Trajectory, catalog?: readonly CatalogItem[]): string[] {
  if (trajectory.agent === 'baseline') {
    return [
      'The baseline gets **one prompt, no tools, no verification, no memory** — the message text only.',
      '',
      '**System prompt** (verbatim):',
      '',
      '```',
      BASELINE_SYSTEM_PROMPT,
      '```',
      '',
      '**User prompt** (verbatim):',
      '',
      '```',
      buildBaselineUserPrompt(trajectory.message),
      '```',
    ]
  }

  if (!catalog) {
    return ['**System prompt** (verbatim):', '', '```', EXTRACTION_SYSTEM_PROMPT, '```']
  }

  return [
    'The agent pipeline: extraction (LLM proposal) → deterministic verification (stock + payment tool calls in code) → decision. The LLM proposes; code disposes.',
    '',
    '**System prompt** (verbatim):',
    '',
    '```',
    EXTRACTION_SYSTEM_PROMPT,
    '```',
    '',
    '**User prompt** (verbatim — catalog + conversation history + message):',
    '',
    '```',
    buildExtractionUserPrompt({
      catalog,
      conversationHistory: trajectory.conversation_history,
      message: trajectory.message,
    }),
    '```',
  ]
}

function renderConversation(trajectory: Trajectory): string[] {
  const lines: string[] = []
  if (trajectory.conversation_history.length > 0) {
    lines.push('**Conversation history** (memory the agent was given):', '')
    for (const turn of trajectory.conversation_history) {
      lines.push(`- \`${turn.timestamp}\` **${turn.direction}**: ${turn.text}`)
    }
    lines.push('')
  }
  lines.push('**Inbound message**:', '')
  lines.push(`> ${quote(trajectory.message.caption ?? trajectory.message.text ?? '(no text)')}`)
  if (trajectory.message.attachment) {
    lines.push(
      `- Attachment: ${trajectory.message.attachment.filename}${trajectory.message.attachment.image_url ? ' (image attached)' : ''}`,
    )
  }
  if (trajectory.message.screenshot_ocr_text) {
    lines.push('', '**Payment-screenshot OCR text** (pre-extracted, deterministic):', '')
    lines.push('```', trajectory.message.screenshot_ocr_text, '```')
  }
  return lines
}

function renderSteps(steps: readonly TrajectoryStep[]): string[] {
  const lines: string[] = []
  steps.forEach((step, index) => {
    lines.push(
      `### ${index + 1}. \`${step.step}\` — ${step.tool ?? 'pipeline'}`,
      '',
      `- Started: ${step.started_at} · Duration: ${step.duration_ms} ms`,
    )
    if (step.error) {
      lines.push(`- **Error**: ${step.error}`)
    }
    lines.push('')
    if (step.input !== undefined) {
      lines.push('**Input**:', '', jsonBlock(step.input), '')
    }
    if (step.output !== undefined) {
      lines.push('**Output**:', '', jsonBlock(step.output), '')
    }
  })
  return lines
}

function renderDiff(context: TrajectoryEvidenceContext): string[] {
  const mismatched = Object.entries(context.diff)
    .filter(([, differs]) => differs)
    .map(([field]) => field)
  if (mismatched.length === 0) {
    return ['Every scored field matched the expected output.', '']
  }
  return [
    `**Fields that differed from expected**: ${mismatched.join(', ')}.`,
    '',
    `- Expected: \`${context.expected.action}\` / payment \`${context.expected.payment_status}\``,
    `- Actual: \`${context.actual.action}\` / payment \`${context.actual.payment_status}\``,
    '',
  ]
}

function renderReply(reply: string | null): string[] {
  if (!reply) {
    return ['No customer reply was produced for this run.', '']
  }
  return ['**Reply sent to the customer**:', '', `> ${quote(reply)}`, '']
}

function jsonBlock(value: unknown): string {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function quote(text: string): string {
  return text.replaceAll('\n', ' ')
}

function label(agent: string): string {
  return agent === 'agent' ? 'Agent' : agent === 'baseline' ? 'Baseline' : agent
}

function groupByAgent(cases: EvalRunSummary['cases']): Map<string, EvalRunSummary['cases']> {
  const grouped = new Map<string, EvalRunSummary['cases']>()
  for (const result of cases) {
    const existing = grouped.get(result.agent) ?? []
    existing.push(result)
    grouped.set(result.agent, existing)
  }
  return grouped
}

function renderSideBySideCaseTable(
  perCase: Map<string, EvalRunSummary['cases']>,
  agents: readonly string[],
): string {
  const caseIds: string[] = []
  const categories = new Map<string, string>()
  const primaryAgent = agents[0] ?? ''
  for (const result of perCase.get(primaryAgent) ?? []) {
    caseIds.push(result.case_id)
    categories.set(result.case_id, result.category)
  }

  const verdictFor = (agent: string, caseId: string): string => {
    const result = (perCase.get(agent) ?? []).find((candidate) => candidate.case_id === caseId)
    return result ? caseVerdict(result) : '—'
  }

  return caseIds
    .map((caseId) => {
      const cells = agents.map((agent) => verdictFor(agent, caseId))
      return `| ${caseId} | ${categories.get(caseId) ?? ''} | ${cells.join(' | ')} |`
    })
    .join('\n')
}

function caseVerdict(result: { passed: boolean; false_confirm: boolean }): string {
  if (result.false_confirm) return '**FAIL — FALSE CONFIRM**'
  return result.passed ? 'pass' : '**FAIL**'
}

function collectCategories(summary: EvalRunSummary): string[] {
  const categories = new Set<string>()
  for (const metrics of Object.values(summary.metrics)) {
    for (const category of Object.keys(metrics.by_category)) {
      categories.add(category)
    }
  }
  return [...categories]
}
