# Evaluation

Methodology and results for the Chata order-intake agent. Update after every run —
don't reconstruct from memory.

## Method

- **Fixtures**: `fixtures.json` — 13 synthetic cases across 10 categories
  (happy path, noisy input, payment match, ambiguous, stock check, not-an-order,
  adversarial, memory, order modification, edge case).
- **Primary metric**: exact-match of `action` + structured `order` (items as a set,
  authoritative total, confidence, reconstruction flag) + `payment_status` +
  `matched_payment_id` + `flags` (as a set).
- **Metric that matters most**: **false-confirm rate** on the mismatched-payment case
  (`case_07`). A false "confirmed" means stock goes out against an underpayment.
- **Comparison**: baseline (single prompt, no tools/verification/memory) vs agent
  (extraction + deterministic verification + memory).
- **Reproduce**: `POST /eval/run {"agents": ["baseline", "agent"]}` (see README),
  then `bun --cwd worker export:eval` to render the run into the committed
  [evidence bundle](./eval-evidence/summary.md).

## Results

Committed run **`EVAL-65111d52`** — full numbers and every trajectory in the
[evidence bundle](./eval-evidence/summary.md):

| Agent | Accuracy | False confirms | Notes |
|---|---|---|---|
| baseline | 2/13 — 15.4% | 1 | `case_07`: `confirm_order`/`matched` on a ₦10,000 transfer against a ₦16,000 order |
| agent | 13/13 — 100.0% | 0 | `case_07` downgraded to `flag_for_review` + `payment_amount_mismatch` by the deterministic verification stage |

Model nondeterminism (documented in the README "Expected results"): the agent scored
10/13 → 11/13 before the final extraction-prompt hardening, 13/13 on the four runs
after it, and 12/13 on a fresh-clone verification run (known flaky case: `case_05`,
where the model occasionally refuses to extract an order it believes might be out of
stock); the baseline's `case_07` failure has shown up as either a false confirm or a
wrong `await_payment`. The agent's zero-false-confirm property held in **every**
observed run — it is enforced by code, not by the model.

### Per-category (committed run `EVAL-65111d52`)

| Category | Baseline | Agent |
|---|---|---|
| happy_path | 0/2 | 2/2 |
| noisy_input | 0/2 | 2/2 |
| payment_match | 0/2 | 2/2 |
| ambiguous | 0/1 | 1/1 |
| stock_check | 0/1 | 1/1 |
| not_an_order | 1/1 | 1/1 |
| adversarial (`case_07`) | 0/1 | 1/1 |
| memory | 0/1 | 1/1 |
| order_modification | 0/1 | 1/1 |
| edge_case | 1/1 | 1/1 |

## What the pipeline guarantees by construction

- `case_07` (payment mismatch): the deterministic verification stage flags the order —
  a false confirm is impossible unless the LLM hallucinates a matching payment reference
  *and* amount that also exists in the payment records (unit-tested in
  `worker/test/unit/verification.test.ts`).
- `case_05` (out of stock): stock tool output, not model belief, decides.
- Totals are recomputed from catalog prices, so LLM arithmetic errors are corrected
  before scoring and before any customer-facing reply.

## Human time & cost

| Metric | Baseline | Agent |
|---|---|---|
| Human time per task | vendor reads every message, checks stock ledger + bank app manually | vendor only approves flagged/paid orders |
| Cost per task | 1 LLM call | 1 LLM call + 2 mocked tool reads + 1 D1 write (negligible) |
