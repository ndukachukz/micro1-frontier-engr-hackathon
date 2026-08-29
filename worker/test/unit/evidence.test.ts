import type { AgentOutput, CatalogItem, EvalDiff, EvalRunSummary, Trajectory } from '@chata/shared'
import { describe, expect, it } from 'vitest'
import {
  renderSummaryMarkdown,
  renderTrajectoryMarkdown,
  type TrajectoryEvidenceContext,
} from '../../src/core/eval/evidence'

const catalog: CatalogItem[] = [
  { sku: 'BEANS_BUCKET', name: 'Beans (paint bucket)', price_ngn: 8000, stock: 15 },
  { sku: 'EGGS_CRATE', name: 'Eggs (crate of 30)', price_ngn: 3500, stock: 20 },
]

const message = {
  type: 'image' as const,
  timestamp: '2026-08-27T11:43:00Z',
  caption: 'I don send 10k for the 2 buckets of beans, sir',
  screenshot_ocr_text:
    'Bank Transfer Successful\nAmount: NGN 10,000.00\nTo: Chata Stores\nRef: ZEN-114820\n27 Aug 2026, 11:42',
}

const extractionProposal = {
  action: 'await_payment',
  order: {
    items: [{ sku: 'BEANS_BUCKET', quantity: 2 }],
    total_ngn: 16000,
    confidence: 'high',
  },
  flags: [],
}

const flagDecision: AgentOutput = {
  action: 'flag_for_review',
  order: {
    items: [{ sku: 'BEANS_BUCKET', quantity: 2 }],
    total_ngn: 16000,
    confidence: 'high',
  },
  payment_status: 'mismatched',
  matched_payment_id: 'PMT002',
  flags: ['payment_amount_mismatch'],
}

const falseConfirmDecision: AgentOutput = {
  action: 'confirm_order',
  order: {
    items: [{ sku: 'BEANS_BUCKET', quantity: 2 }],
    total_ngn: 16000,
    confidence: 'high',
  },
  payment_status: 'matched',
  matched_payment_id: null,
  flags: [],
}

const agentCase07: Trajectory = {
  id: 'case_07_payment_mismatch_adversarial-agent',
  agent: 'agent',
  case_id: 'case_07_payment_mismatch_adversarial',
  customer: { wa_id: '2348000000107', name: 'Adaeze O.' },
  message,
  conversation_history: [],
  output: flagDecision,
  steps: [
    {
      step: 'extract-order',
      tool: 'LlmClient',
      input: { message, history_turns: 0 },
      output: extractionProposal,
      started_at: '2026-08-29T12:00:00.000Z',
      duration_ms: 1204,
    },
    {
      step: 'verify:stock-lookup',
      tool: 'StockTool',
      input: { sku: 'BEANS_BUCKET', quantity: 2 },
      output: { found: true, sku: 'BEANS_BUCKET', price_ngn: 8000, stock: 15, available: true },
      started_at: '2026-08-29T12:00:01.200Z',
      duration_ms: 0,
    },
    {
      step: 'verify:payment-lookup',
      tool: 'PaymentTool',
      input: { sender_ref: 'ZEN-114820' },
      output: { found: true, id: 'PMT002', amount_ngn: 10000, sender_ref: 'ZEN-114820' },
      started_at: '2026-08-29T12:00:01.201Z',
      duration_ms: 0,
    },
    {
      step: 'verify-and-decide',
      tool: 'StockTool+PaymentTool',
      input: { extraction: extractionProposal },
      output: flagDecision,
      started_at: '2026-08-29T12:00:01.202Z',
      duration_ms: 1,
    },
  ],
  created_at: '2026-08-29T12:00:01.500Z',
}

const baselineCase07: Trajectory = {
  id: 'case_07_payment_mismatch_adversarial-baseline',
  agent: 'baseline',
  case_id: 'case_07_payment_mismatch_adversarial',
  customer: { wa_id: '2348000000107', name: 'Adaeze O.' },
  message,
  conversation_history: [],
  output: falseConfirmDecision,
  steps: [
    {
      step: 'single-call-parse',
      tool: 'LlmClient',
      input: { message },
      output: falseConfirmDecision,
      started_at: '2026-08-29T12:00:00.000Z',
      duration_ms: 980,
    },
  ],
  created_at: '2026-08-29T12:00:01.000Z',
}

// EvalDiff semantics: `true` = the field DIFFERS from the expected output.
const matchingDiff: EvalDiff = {
  action: false,
  order: false,
  payment_status: false,
  matched_payment_id: false,
  flags: false,
}

const failingDiff: EvalDiff = {
  action: true,
  order: false,
  payment_status: true,
  matched_payment_id: true,
  flags: true,
}

describe('renderTrajectoryMarkdown', () => {
  it('renders the agent case_07 story top-to-bottom: instructions, tool calls, downgrade decision', () => {
    const context: TrajectoryEvidenceContext = {
      category: 'adversarial',
      passed: true,
      falseConfirm: false,
      diff: matchingDiff,
      expected: flagDecision,
      actual: flagDecision,
      reply:
        'Hold on — the transfer (₦10,000) is short of the ₦16,000 total. I have flagged this for review.',
      catalog,
    }

    const markdown = renderTrajectoryMarkdown(agentCase07, context)

    expect(markdown).toContain('# case_07_payment_mismatch_adversarial')
    expect(markdown).toContain('adversarial')
    expect(markdown).toContain('PASS')
    expect(markdown).toContain('I don send 10k for the 2 buckets of beans, sir')
    expect(markdown).toContain('Ref: ZEN-114820')
    expect(markdown).toContain('You are Chata')
    expect(markdown).toContain('extract-order')
    expect(markdown).toContain('BEANS_BUCKET')
    expect(markdown).toContain('ZEN-114820')
    expect(markdown).toContain('PMT002')
    expect(markdown).toContain('10000')
    expect(markdown).toContain('payment_amount_mismatch')
    expect(markdown).toContain('flag_for_review')
    expect(markdown).toContain('Hold on')
  })

  it('renders steps in chronological order with the tool calls before the decision', () => {
    const context: TrajectoryEvidenceContext = {
      category: 'adversarial',
      passed: true,
      falseConfirm: false,
      diff: matchingDiff,
      expected: flagDecision,
      actual: flagDecision,
      reply: null,
      catalog,
    }

    const markdown = renderTrajectoryMarkdown(agentCase07, context)

    const extractAt = markdown.indexOf('extract-order')
    const stockAt = markdown.indexOf('verify:stock-lookup')
    const paymentAt = markdown.indexOf('verify:payment-lookup')
    const decideAt = markdown.indexOf('verify-and-decide')
    expect(extractAt).toBeGreaterThanOrEqual(0)
    expect(stockAt).toBeGreaterThan(extractAt)
    expect(paymentAt).toBeGreaterThan(stockAt)
    expect(decideAt).toBeGreaterThan(paymentAt)
  })

  it('marks a baseline false confirm prominently', () => {
    const context: TrajectoryEvidenceContext = {
      category: 'adversarial',
      passed: false,
      falseConfirm: true,
      diff: failingDiff,
      expected: flagDecision,
      actual: falseConfirmDecision,
      reply: null,
      catalog,
    }

    const markdown = renderTrajectoryMarkdown(baselineCase07, context)

    expect(markdown).toContain('FALSE CONFIRM')
    expect(markdown).toContain('FAIL')
    expect(markdown).toContain('single-call-parse')
    expect(markdown).toContain('confirm_order')
    expect(markdown).toContain('Parse the following WhatsApp message')
  })

  it('shows expected vs actual and the fields that differed', () => {
    const context: TrajectoryEvidenceContext = {
      category: 'adversarial',
      passed: false,
      falseConfirm: true,
      diff: failingDiff,
      expected: flagDecision,
      actual: falseConfirmDecision,
      reply: null,
      catalog,
    }

    const markdown = renderTrajectoryMarkdown(baselineCase07, context)

    expect(markdown).toContain('Expected output')
    expect(markdown).toContain('Actual output')
    expect(markdown).toContain('action')
    expect(markdown).toContain('payment_status')
  })

  it('renders the agent instructions verbatim including the catalog given to the agent', () => {
    const context: TrajectoryEvidenceContext = {
      category: 'adversarial',
      passed: true,
      falseConfirm: false,
      diff: matchingDiff,
      expected: flagDecision,
      actual: flagDecision,
      reply: null,
      catalog,
    }

    const markdown = renderTrajectoryMarkdown(agentCase07, context)

    expect(markdown).toContain('BEANS_BUCKET')
    expect(markdown).toContain('8000')
    expect(markdown).toContain('You are Chata')
  })
})

describe('renderSummaryMarkdown', () => {
  const summary: EvalRunSummary = {
    id: 'EVAL-ab12cd34',
    agents: ['baseline', 'agent'],
    started_at: '2026-08-29T12:00:00.000Z',
    finished_at: '2026-08-29T12:01:30.000Z',
    metrics: {
      baseline: {
        total_cases: 2,
        passed_cases: 1,
        accuracy: 0.5,
        false_confirm_count: 1,
        by_category: { adversarial: { total: 1, passed: 0 }, happy_path: { total: 1, passed: 1 } },
      },
      agent: {
        total_cases: 2,
        passed_cases: 2,
        accuracy: 1,
        false_confirm_count: 0,
        by_category: { adversarial: { total: 1, passed: 1 }, happy_path: { total: 1, passed: 1 } },
      },
    },
    cases: [
      {
        case_id: 'case_01_clean_order',
        category: 'happy_path',
        agent: 'baseline',
        passed: true,
        false_confirm: false,
        expected: flagDecision,
        actual: flagDecision,
        diff: matchingDiff,
        reply: null,
        trajectory: baselineCase07,
      },
      {
        case_id: 'case_07_payment_mismatch_adversarial',
        category: 'adversarial',
        agent: 'baseline',
        passed: false,
        false_confirm: true,
        expected: flagDecision,
        actual: falseConfirmDecision,
        diff: failingDiff,
        reply: null,
        trajectory: baselineCase07,
      },
      {
        case_id: 'case_01_clean_order',
        category: 'happy_path',
        agent: 'agent',
        passed: true,
        false_confirm: false,
        expected: flagDecision,
        actual: flagDecision,
        diff: matchingDiff,
        reply: 'ok',
        trajectory: agentCase07,
      },
      {
        case_id: 'case_07_payment_mismatch_adversarial',
        category: 'adversarial',
        agent: 'agent',
        passed: true,
        false_confirm: false,
        expected: flagDecision,
        actual: flagDecision,
        diff: matchingDiff,
        reply: 'ok',
        trajectory: agentCase07,
      },
    ],
  }

  it('renders headline numbers per agent', () => {
    const markdown = renderSummaryMarkdown(summary, {
      generatedAt: '2026-08-29T12:02:00.000Z',
      model: 'minimax-m3',
    })

    expect(markdown).toContain('EVAL-ab12cd34')
    expect(markdown).toContain('50.0%')
    expect(markdown).toContain('100.0%')
    expect(markdown).toContain('1/2')
    expect(markdown).toContain('2/2')
    expect(markdown).toContain('minimax-m3')
  })

  it('renders per-category and per-case tables with pass/fail and false-confirm markers', () => {
    const markdown = renderSummaryMarkdown(summary, {
      generatedAt: '2026-08-29T12:02:00.000Z',
      model: 'minimax-m3',
    })

    expect(markdown).toContain('happy_path')
    expect(markdown).toContain('adversarial')
    expect(markdown).toContain('case_07_payment_mismatch_adversarial')
    expect(markdown).toContain('FALSE CONFIRM')
    expect(markdown).toContain('pass')
  })

  it('links to the trajectory files for every agent and case', () => {
    const markdown = renderSummaryMarkdown(summary, {
      generatedAt: '2026-08-29T12:02:00.000Z',
      model: 'minimax-m3',
    })

    expect(markdown).toContain('trajectories/baseline/case_07_payment_mismatch_adversarial.md')
    expect(markdown).toContain('trajectories/agent/case_07_payment_mismatch_adversarial.md')
  })

  it('renders the false-confirm story for case_07 specifically', () => {
    const markdown = renderSummaryMarkdown(summary, {
      generatedAt: '2026-08-29T12:02:00.000Z',
      model: 'minimax-m3',
    })

    expect(markdown).toContain('case_07')
    expect(markdown).toContain('false confirm')
  })
})
