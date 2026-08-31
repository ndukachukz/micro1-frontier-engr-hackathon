# Chata — keep selling in WhatsApp DMs, with a real backend behind it

Hackathon submission for the **micro1 Agentic Workflows Hackathon**.

## The problem: the migration trap

A social-first store decides to get serious: it builds a website and a backend for
real order records, customer history, and analytics. Then nothing changes — because
customers don't come. They keep DMing. The business ends up running two systems: a
backend with almost nothing in it, and a WhatsApp inbox that is the actual storefront
but produces no data. Staff copy-paste every order from chat into the backend —
double entry — or orders live only in the thread: no record, no analytics, no way to
hand a customer to a teammate, payment proofs buried in screenshots.

Chata's answer: don't migrate the customers — migrate the data. Keep selling where
customers already are. Chata reads each inbound WhatsApp message, structures it
against the catalog into a validated order, writes it to the backend as a first-class
record, and answers the customer automatically — every order event (confirmed /
flagged / awaiting payment) gets an auditable reply. The vendor works from a console,
not from a chat thread.

Money stays safe in the same motion: Chata verifies every payment against bank
records and releases stock only after the vendor's explicit approval. A false confirm
— stock released against an underpayment — is made structurally impossible by the
verification stage, not merely discouraged by the model.

> Architecture details live in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md);
> evaluation methodology and the committed evidence bundle live in
> [`docs/EVALUATION.md`](./docs/EVALUATION.md) and
> [`docs/eval-evidence/`](./docs/eval-evidence/summary.md).

## What existed before vs. what's new

|                                                          | Status                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| React + TanStack Router frontend                         | **New** — scaffolded for this submission (TanStack Query added) |
| TypeScript + Hono on Cloudflare Workers backend          | **New** — scaffolded for this submission                        |
| Agent pipeline (parsing, tool use, verification, memory) | **New**                                                         |
| Baseline + eval harness + fixtures + trajectories        | **New**                                                         |

There was no pre-existing code: both apps were created inside this repository for the
hackathon.

## Repository layout

```
├── fixtures.json             # synthetic fixtures (catalog, payments, 13 test cases) — single source of truth
├── docs/                     # architecture, ADRs, evaluation
├── packages/shared/          # zod domain + API contracts used by worker AND frontend
├── worker/                   # Hono + @hono/zod-openapi + Scalar + Cloudflare Workflows + D1
└── frontend/                 # TanStack Router + TanStack Query + Tailwind (vendor console)
```

## Quickstart

Prerequisites: [Bun](https://bun.sh) **1.2+** (pinned to `1.2.22` in `.bun-version`) and Node **20+** (`engines` in `package.json`). A Cloudflare account is only needed for deploy (local dev works without).

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
  per-category breakdown, and per-case diffs. Metrics persist in D1 (`GET /eval/runs`);
  `bun --cwd worker export:eval` renders the latest run into `docs/eval-evidence/`.
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

### Expected results (committed reference run)

Committed run **`EVAL-65111d52`** — full evidence in
[`docs/eval-evidence/summary.md`](./docs/eval-evidence/summary.md), every trajectory
under `docs/eval-evidence/trajectories/<agent>/<case>.md`:

| Agent    | Accuracy           | False confirms | What to look at                                                                                                                                                                                   |
| -------- | ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| baseline | 2/13 — **15.4%**   | **1**          | [`case_07` baseline trajectory](./docs/eval-evidence/trajectories/baseline/case_07_payment_mismatch_adversarial.md): `confirm_order`/`matched` on a ₦10,000 transfer against a ₦16,000 order      |
| agent    | 13/13 — **100.0%** | **0**          | [`case_07` agent trajectory](./docs/eval-evidence/trajectories/agent/case_07_payment_mismatch_adversarial.md): the deterministic verification downgrades the underpaid order to `flag_for_review` |

**Model nondeterminism**: expect your numbers to differ somewhat. Observed across
development runs: the agent landed at 10/13 → 11/13 before the final prompt hardening,
**13/13 on the four runs that followed it**, and 12/13 on a fresh-clone verification run
(the known flaky case is `case_05`, where the model occasionally refuses to extract an
order it believes might be out of stock); the baseline's `case_07` failure has appeared
both as a false confirm (`confirm_order`/`matched`) and as a wrong
`await_payment`. What should hold in every run: **agent false-confirm count = 0** —
that property is enforced by the deterministic verification stage (unit-tested in
`worker/test/unit/verification.test.ts`) — and the agent outscoring the baseline by a
wide margin. Transient upstream JSON errors are retried ×3 by the harness (mirroring
the workflow's production retry behavior), so a run should not abort; if one still
fails, re-run before investigating.

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
bun run test        # worker: unit + integration (vitest; integration boots wrangler dev)
bun run lint        # Biome
bun run typecheck   # tsc across shared + worker + frontend
```

## Deployment

Deploys the API to Cloudflare Workers and the vendor console to Cloudflare Pages
(direct upload from `frontend/dist`, configured in `frontend/wrangler.jsonc`):

```bash
# One-time setup: creates the Pages project (wrangler login first, or set CLOUDFLARE_API_TOKEN)
bun --cwd frontend wrangler pages project create chata --production-branch main

bun run deploy     # worker + frontend in one go
bun run deploy:worker  # API only  (generates fixtures, then `wrangler deploy --minify`)
bun run deploy:web     # UI only   (`vite build`, then `wrangler pages deploy`)
```

- Worker → `https://chata-worker.<your-subdomain>.workers.dev`; Pages → `https://chata.pages.dev`
  (preview deploys get their own URLs per branch/commit).
- Deploys made from a non-`main` git branch go to a Pages preview URL; `main` goes to
  production. The API base URL the console calls is baked at build time from
  `frontend/.env.production` (`VITE_API_URL`) — update it if the worker URL changes.
- CI usage: pass `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` and run the same
  `deploy:web` / `deploy:worker` scripts non-interactively.

## Synthetic data only

All names, phone numbers, and payment references in `fixtures.json` are fabricated
(`wa_id` values are prefixed `234800000` to make this obvious). Nothing in this repo
touches a real store, bank, or WhatsApp account.
