# Evaluation

Methodology and results for the Chata order-intake agent. Update after every run —
don't reconstruct from memory.

## Method

- **Fixtures**: `fixtures.json` — 13 synthetic cases across 9 categories
  (happy path, noisy input, payment match, ambiguous, stock check, not-an-order,
  adversarial, memory, order modification, edge case).
- **Primary metric**: exact-match of `action` + structured `order` (items as a set,
  authoritative total, confidence, reconstruction flag) + `payment_status` +
  `matched_payment_id` + `flags` (as a set).
- **Metric that matters most**: **false-confirm rate** on the mismatched-payment case
  (`case_07`). A false "confirmed" means stock goes out against an underpayment.
- **Comparison**: baseline (single prompt, no tools/verification/memory) vs agent
  (extraction + deterministic verification + memory).
- **Reproduce**: `POST /eval/run {"agents": ["baseline", "agent"]}` (see README).

## Results

| Run id | Date | Agent | Accuracy | False confirms | Notes |
|---|---|---|---|---|---|
| _pending_ | | baseline | | | |
| _pending_ | | agent | | | |

### Per-category (latest run)

| Category | Baseline | Agent |
|---|---|---|
| happy_path | | |
| noisy_input | | |
| payment_match | | |
| ambiguous | | |
| stock_check | | |
| not_an_order | | |
| adversarial (`case_07`) | | |
| memory | | |
| order_modification | | |
| edge_case | | |

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
