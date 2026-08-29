# ADR-0003 — Result type in the core, typed exceptions at the edges

**Status:** accepted

## Context
The core pipeline has expected, retryable failures (LLM schema violations, transient
network errors) that workflow steps must retry; the HTTP layer needs consistent
error responses; abusing exceptions for control flow hurts clarity.

## Decision
- `core` returns `Result<T, PipelineError>` (`lib/result.ts`); `PipelineError.retryable`
  marks retryable failures. Workflow steps unwrap and re-throw, which triggers step retries.
- Services throw typed `AppError`s; the route error middleware maps them to problem
  responses with correct status codes.

## Consequences
- No silent swallow of tool/LLM failures; retries are explicit.
- Route handlers stay free of try/catch noise (DRY error mapping in one middleware).
