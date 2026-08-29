# ADR-0004 — Eval harness runs the agent core, not the workflow

**Status:** accepted

## Context
The eval harness must run 12 fixtures × 2 agents cheaply and deterministically during
iteration, while the "production" path is the durable workflow.

## Decision
- The eval service invokes the **same core functions** the workflow steps call, with
  in-memory fixture tools (no D1 mutation, no waits).
- The workflow path is exercised by integration tests (real `wrangler dev` via
  `unstable_dev`) and the live demo.

## Consequences
- Fast, deterministic eval cycles (no instance orchestration overhead).
- One risk: workflow-specific behavior isn't covered by eval — mitigated by the
  integration suite and the identical core code path.
