# Chata — Agentic Order Intake & Payment Confirmation

Hackathon submission for the **micro1 Agentic Workflows Hackathon**. Chata reads inbound
WhatsApp messages from small-store customers, extracts structured orders, verifies them
against stock and bank-payment records, and only releases stock after an explicit human
approval — with every decision auditable and benchmarked against a baseline.

> Problem framing, scoring-rubric mapping, and the improvement changelog live in
> [`PROJECT_PLAN.md`](./PROJECT_PLAN.md). Architecture details live in
> [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## What existed before vs. what's new

| | Status |
|---|---|
| React + TanStack Router frontend | **New** — scaffolded for this submission (TanStack Query added) |
| TypeScript + Hono on Cloudflare Workers backend | **New** — scaffolded for this submission |
| Agent pipeline (parsing, tool use, verification, memory) | **New** |
| Baseline + eval harness + fixtures + trajectories | **New** |

There was no pre-existing code: both apps were created inside this repository for the
hackathon.

## Repository layout

```
├── PROJECT_PLAN.md           # problem framing, changelog, rubric mapping
├── fixtures.json             # synthetic fixtures (catalog, payments, 13 test cases) — single source of truth
├── docs/                     # architecture, ADRs, evaluation
├── packages/shared/          # zod domain + API contracts used by worker AND frontend
├── worker/                   # Hono + @hono/zod-openapi + Scalar + Cloudflare Workflows + D1
└── frontend/                 # TanStack Router + TanStack Query + Tailwind (vendor console)
```

## Quickstart

Prerequisites: [Bun](https://bun.sh), Node 20+, a Cloudflare account for deploy (local dev works without).

```bash
bun install

# 1. Local D1 schema + fixture seed
bun --cwd worker migrate
bun --cwd worker seed

# 2. Configure the OpenCode key (only needed for baseline/agent/eval runs)
cp worker/.dev.vars.example worker/.dev.vars   # then edit: OPENCODE_API_KEY=oc-...

# 3. Run the worker (API + Scalar docs at http://localhost:8787/docs)
bun dev

# 4. Run the vendor console (http://localhost:3000)
bun dev:web
```

## Reproduction guide (baseline / agent / eval)

```bash
# all 13 fixtures through baseline + agent (~26 LLM calls, model: minimax-m3 via OpenCode Go)
curl -X POST http://localhost:8787/eval/run \
  -H 'content-type: application/json' \
  -d '{"agents": ["baseline", "agent"]}'

# single case, full trajectory (the adversarial payment-mismatch case)
curl -X POST http://localhost:8787/eval/fixtures/case_07_payment_mismatch_adversarial/replay \
  -H 'content-type: application/json' \
  -d '{"agent": "agent"}'
```

- **Expected output**: JSON `EvalRunSummary` — per-agent `accuracy`, `false_confirm_count`,
  per-category breakdown, and per-case diffs. Metrics persist in D1 (`GET /eval/runs`).
- **Model**: `minimax-m3` served through **OpenCode Go** (`https://opencode.ai/zen/go/v1/messages`,
  plain fetch — no SDK). Override with the `OPENCODE_MODEL` var in `worker/wrangler.jsonc`; the
  vision/OCR model defaults to `deepseek-v4-flash-vision-exp` (`OPENCODE_VISION_MODEL`).
- **Runtime**: ~10–60 s per eval run (one extraction call per agent per case; the verification
  stage is plain code and adds no LLM cost). Covered by the OpenCode Go subscription
  ($10/month; ≈26 calls per full run).
- **OCR**: payment-screenshot vision runs only for messages carrying `attachment.image_url`
  without pre-extracted `screenshot_ocr_text` — fixture cases stay deterministic
  (`case_13_screenshot_image_url` documents the path; replay a webhook with the OCR text
  removed to exercise the live vision call).
- Every run writes trajectories to D1 (`trajectories` table), and
  `bun --cwd worker export:eval` renders the latest run into a committed,
  human-readable evidence bundle: [`docs/eval-evidence/summary.md`](./docs/eval-evidence/summary.md)
  plus one followable trajectory per agent per case under `docs/eval-evidence/trajectories/`
  (agent instructions → every tool call and response → decision → reply). The vendor
  console's **Evaluation** page shows the run metrics.

## API documentation & simulation (Scalar)

The worker generates an OpenAPI 3.1 document from the same zod schemas that validate
requests (`packages/shared`) and serves an interactive Scalar reference at
**http://localhost:8787/docs** — use it as the simulation console:

1. `POST /webhook/whatsapp` — replay an inbound message (webhook-shaped fixtures)
2. `GET /orders` / `GET /orders/{id}` — watch the workflow progress
3. `POST /payments` — simulate a bank payment landing (resumes a waiting workflow)
4. `POST /orders/{id}/approval` — act as the vendor (human-in-the-loop step)
5. `POST /eval/run` — benchmark baseline vs agent

## Testing

```bash
bun test            # worker: unit (core pipeline, no infra) + integration (routes, D1, workflows via wrangler dev)
bun run lint        # Biome
bun run typecheck   # tsc across shared + worker + frontend
```

## Synthetic data only

All names, phone numbers, and payment references in `fixtures.json` are fabricated
(`wa_id` values are prefixed `2348000000` to make this obvious). Nothing in this repo
touches a real store, bank, or WhatsApp account.
