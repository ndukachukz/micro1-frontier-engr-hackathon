# Chata — Architecture

## The problem & the user

The user is a Lagos small-store vendor whose storefront is a WhatsApp number. Orders
arrive as DMs — text with typos and Pidgin, payment screenshots. She wants what a
backend gives a web store: real order records, customer history, analytics, and the
ability to hand a customer to a teammate. But her customers will not migrate to a
website; the DMs *are* the store. Chata's bet: don't migrate the customers — migrate
the data. Every inbound message becomes a structured order in the backend (the 13
fixture cases model exactly this traffic: happy paths, noisy input, ambiguous
requests, memory, order modifications, adversarial payment mismatches); payments are
verified against bank records by deterministic code; and stock only moves after her
explicit approval in the vendor console.

## System overview

```
┌──────────────┐   webhook fixtures    ┌─────────────────────────────────────────────┐
│ Scalar /docs │ ────────────────────▶ │  Cloudflare Worker (Hono + zod-openapi)     │
│ Vendor UI    │ ── approvals/payments │                                             │
│ (TanStack)   │ ────────────────────▶ │  routes ──▶ services ──▶ core (pure domain) │
└──────────────┘                       │                 │              ▲            │
                                       │                 ▼              │ ports      │
                                       │         Cloudflare Workflows ──┘            │
                                       │         (OrderWorkflow instances)           │
                                        │         D1 (state)   OpenCode Go (LLM+OCR)  │
                                        └─────────────────────────────────────────────┘
```

One inbound message = one durable **OrderWorkflow instance** (`{waId}-{messageId}`).
The HTTP layer is thin; the durable workflow owns the multi-step agent pipeline,
the waits, and the human-approval gate.

## Dependency rule (hexagonal-lite)

```
routes ──▶ services ──▶ core
   │            │           │
   └────────────┴──▶ infrastructure (implements ports)
```

- **`core/`** is pure TypeScript: no Hono, no Cloudflare imports. It contains the agent
  pipeline (OCR → extraction → verification → reply), the baseline, tool **ports** (`StockTool`,
  `PaymentTool`, `ReplySender`, `LlmClient`, `OcrClient`), and eval scoring. Unit-testable without infra.
- **`services/`** are use cases (intake, approval, payment, eval). They own the
  **persistence/workflow ports** (`OrderRepository`, `WorkflowStarter`,
  `WorkflowEventSender`, …).
- **`infrastructure/`** implements ports with Cloudflare/HTTP tech: D1 repositories, the D1-backed
  tools, the OpenCode Go LLM + OCR clients (plain `fetch`, no SDK), the `OrderWorkflow`
  entrypoint, and webhook mappers.
- **`app/create-app.ts`** is the composition root — the only place concrete adapters are
  wired to ports (DIP).
- **Errors**: `core` returns `Result<T, PipelineError>` for expected failures (LLM parse
  errors are retryable — workflow steps re-throw them to trigger step retries). Services
  throw typed `AppError`s; the route layer's error middleware maps them to problem responses.

## The agent pipeline

| Stage | Type | Purpose |
|---|---|---|
| `load-memory` | tool (D1) | conversation history per `wa_id` (enables "same as last time", cancellations) |
| `ocr-payment-screenshot` | **vision** (retry ×3, exponential) | when the message carries `attachment.image_url` (and no pre-extracted text), extract the screenshot text via the OpenCode Go vision model into `screenshot_ocr_text` |
| `extract-order` | **LLM** (retry ×3, exponential) | map message → catalog SKUs, quantities, confidence, intent; handles typos/Pidgin/gibberish |
| `verify-and-decide` | **deterministic code** | stock check via `StockTool`, payment match via `PaymentTool`, authoritative total recomputation, action decision |
| `persist-order-decision` | tool (D1) | order status/action/flags |
| `send-reply` | tool (mocked) | outbound WhatsApp reply (recorded in conversation history) |
| action branches | Workflows | approval wait / payment wait / terminal states |
| `save-trajectory` | tool (D1) | full step-by-step trajectory for audit + eval (including one record per stock/payment tool call made during verification) |

### Why verification is code, not the LLM

The costly failure mode is a **false confirm** — stock released against an underpayment
(fixtures `case_07`: order total ₦16,000 vs payment ₦10,000). The workflow structure makes
false confirms structurally impossible for the deterministic stages to miss: the LLM may
only *propose* an order; `runVerification` recomputes the total from catalog prices,
matches the payment reference against the payment records, and **always downgrades**
`confirm_order` → `flag_for_review` when amounts mismatch or stock is short. Unit tests
pin this behavior, including the case where the LLM's arithmetic is deliberately wrong.

### Human approval (ground rule: nothing is confirmed automatically)

`confirm_order` does not confirm anything. It creates a pending approval and calls
`step.waitForEvent('approval', { timeout: '24h' })` — the instance sleeps for free until
the vendor clicks **Approve/Reject** in the vendor console (or calls
`POST /orders/{id}/approval`). Only an approval runs the fulfillment step (stock deduction +
payment mark). A timeout auto-flags the order for review.

### Awaiting payment

`await_payment` waits on a `payment` event (24 h). When a payment arrives
(`POST /payments` — the bank-feed stand-in), the same instance resumes, re-checks the
payment amount against the order total, and routes to approval or flagging.

## Layer & naming conventions

| Artifact | Convention | Example |
|---|---|---|
| Files | `kebab-case` + role suffix | `order.repository.ts`, `.service.ts`, `.routes.ts`, `.tool.ts`, `.mapper.ts` |
| Ports | bare interfaces | `StockTool`, `OrderRepository`, `LlmClient`, `OcrClient` |
| Adapters | tech-prefixed/suffixed classes | `D1StockTool`, `OpenCodeGoLlmClient`, `CloudflareWorkflowStarter` |
| Zod schemas / types | `XxxSchema` / `Xxx` | `AgentOutputSchema`, `AgentOutput` |
| DB | `snake_case` tables + columns; mappers at repository boundary | `payment_records.sender_ref` |
| Workflow events | `^[a-zA-Z0-9_-]+$` | `approval`, `payment` |
| Money | integer naira everywhere | `total_ngn: 93500` |

## Shared contracts (`packages/shared`)

Every zod schema is defined once and used for: runtime validation (routes), OpenAPI 3.1
document generation (`@hono/zod-openapi`), the Scalar reference, TypeScript types on both
apps, and eval fixture validation. No codegen, no drift.

## Data (D1)

`catalog_items`, `payment_records`, `conversations`, `orders`, `approvals`,
`trajectories`, `eval_runs`. `fixtures.json` is the single source of truth: `bun --cwd worker seed`
resets catalog/payments to fixture state; the eval harness never mutates D1 state (it runs
against in-memory fixture tools), so runs are deterministic and repeatable.

## Trade-offs & known limits

- WhatsApp Business API is mocked (webhook-shaped fixtures); the reply sender records to
  `conversations` instead of sending.
- The OCR stage only runs for messages carrying `attachment.image_url` **without** pre-extracted
  text (pre-extracted text — cached vision output or a fixture stand-in — wins, keeping evals
  deterministic). Live OCR is exercised by replaying an image webhook without `screenshot_ocr_text`.
- The eval harness calls the agent core directly (fast iteration); the workflow is the
  production-shaped path, exercised by the live demo (webhook replay → order →
  payment/approval) rather than by automated tests — the integration suite covers the
  HTTP surface (health, OpenAPI/Scalar, catalog/payment reads, validation errors).
- Workflow trajectories are saved before the long waits, so post-approval state changes
  live in the `orders`/`approvals` tables rather than the trajectory log.
