# ADR-0002 — Cloudflare Workflows for orchestration; verification as plain code

**Status:** accepted

## Context
The pipeline needs: retriable LLM calls, per-customer conversation memory, a
**human approval gate** before stock deduction/payment confirmation, an
**await-payment** state that can pause for hours, and an audit trail per run.

## Decision
- One `OrderWorkflow` class; each pipeline stage is a `step.do` (independent retry + caching).
- Human approval and payment arrival are `step.waitForEvent` gates (free sleep, resumable
  via `sendEvent` from the API layer).
- The decision stage (`runVerification`) is **deterministic TypeScript**, never the LLM:
  totals are recomputed from catalog prices, payments matched against records, and
  `confirm_order` is structurally downgraded to `flag_for_review` on any mismatch.

## Consequences
- False confirms (the costly failure mode) cannot be "talked into" by the model.
- Long waits cost nothing (sleeping instances don't consume CPU).
- Step returns double as the trajectory/audit log; the baseline remains a single call,
  making the eval comparison clean.
