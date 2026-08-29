# Eval run EVAL-65111d52 — evidence summary

- **Generated**: 2026-08-29T14:00:32.756Z
- **Agents**: baseline, agent
- **Model**: minimax-m3 via OpenCode Go
- **Run window**: 2026-08-29T13:55:59.551Z → 2026-08-29T13:56:55.066Z

## How to reproduce

```bash
bun install
bun --cwd worker migrate
bun --cwd worker seed
cp worker/.dev.vars.example worker/.dev.vars   # add OPENCODE_API_KEY
bun dev
curl -X POST http://localhost:8787/eval/run \
  -H 'content-type: application/json' \
  -d '{"agents": ["baseline", "agent"]}'
```

Then re-export this bundle:

```bash
bun --cwd worker export:eval
```

Numbers may vary slightly across runs because the LLM is nondeterministic; see the README "expected output" section for the committed reference numbers and the acceptable range.

## Headline

| Agent | Accuracy | Passed | False confirms |
|---|---|---|---|
| baseline | 15.4% | 2/13 | 1 |
| agent | 100.0% | 13/13 | 0 |

**False confirms — the metric that matters most.** case_07 (adversarial underpayment): baseline: false confirm (stock would be released against an underpaid order); agent: flagged for review — the costly failure was prevented.

## Per-category

| Category | baseline | agent |
|---|---|---|
| happy_path | 0/2 | 2/2 |
| noisy_input | 0/2 | 2/2 |
| payment_match | 0/2 | 2/2 |
| ambiguous | 0/1 | 1/1 |
| stock_check | 0/1 | 1/1 |
| not_an_order | 1/1 | 1/1 |
| adversarial | 0/1 | 1/1 |
| memory | 0/1 | 1/1 |
| order_modification | 0/1 | 1/1 |
| edge_case | 1/1 | 1/1 |

## Per-case

| Case | Category | Baseline | Agent |
|---|---|---|---|
| case_01_clean_order | happy_path | **FAIL** | pass |
| case_02_typos | noisy_input | **FAIL** | pass |
| case_03_order_with_payment_screenshot | payment_match | **FAIL** | pass |
| case_04_ambiguous_order | ambiguous | **FAIL** | pass |
| case_05_out_of_stock | stock_check | **FAIL** | pass |
| case_06_non_order_question | not_an_order | pass | pass |
| case_07_payment_mismatch_adversarial | adversarial | **FAIL — FALSE CONFIRM** | pass |
| case_08_repeat_order_memory | memory | **FAIL** | pass |
| case_09_multi_item_order | happy_path | **FAIL** | pass |
| case_10_cancellation | order_modification | **FAIL** | pass |
| case_11_pidgin | noisy_input | **FAIL** | pass |
| case_12_gibberish | edge_case | pass | pass |
| case_13_screenshot_image_url | payment_match | **FAIL** | pass |

## Full trajectories

- [baseline / case_01_clean_order](trajectories/baseline/case_01_clean_order.md)
- [baseline / case_02_typos](trajectories/baseline/case_02_typos.md)
- [baseline / case_03_order_with_payment_screenshot](trajectories/baseline/case_03_order_with_payment_screenshot.md)
- [baseline / case_04_ambiguous_order](trajectories/baseline/case_04_ambiguous_order.md)
- [baseline / case_05_out_of_stock](trajectories/baseline/case_05_out_of_stock.md)
- [baseline / case_06_non_order_question](trajectories/baseline/case_06_non_order_question.md)
- [baseline / case_07_payment_mismatch_adversarial](trajectories/baseline/case_07_payment_mismatch_adversarial.md)
- [baseline / case_08_repeat_order_memory](trajectories/baseline/case_08_repeat_order_memory.md)
- [baseline / case_09_multi_item_order](trajectories/baseline/case_09_multi_item_order.md)
- [baseline / case_10_cancellation](trajectories/baseline/case_10_cancellation.md)
- [baseline / case_11_pidgin](trajectories/baseline/case_11_pidgin.md)
- [baseline / case_12_gibberish](trajectories/baseline/case_12_gibberish.md)
- [baseline / case_13_screenshot_image_url](trajectories/baseline/case_13_screenshot_image_url.md)
- [agent / case_01_clean_order](trajectories/agent/case_01_clean_order.md)
- [agent / case_02_typos](trajectories/agent/case_02_typos.md)
- [agent / case_03_order_with_payment_screenshot](trajectories/agent/case_03_order_with_payment_screenshot.md)
- [agent / case_04_ambiguous_order](trajectories/agent/case_04_ambiguous_order.md)
- [agent / case_05_out_of_stock](trajectories/agent/case_05_out_of_stock.md)
- [agent / case_06_non_order_question](trajectories/agent/case_06_non_order_question.md)
- [agent / case_07_payment_mismatch_adversarial](trajectories/agent/case_07_payment_mismatch_adversarial.md)
- [agent / case_08_repeat_order_memory](trajectories/agent/case_08_repeat_order_memory.md)
- [agent / case_09_multi_item_order](trajectories/agent/case_09_multi_item_order.md)
- [agent / case_10_cancellation](trajectories/agent/case_10_cancellation.md)
- [agent / case_11_pidgin](trajectories/agent/case_11_pidgin.md)
- [agent / case_12_gibberish](trajectories/agent/case_12_gibberish.md)
- [agent / case_13_screenshot_image_url](trajectories/agent/case_13_screenshot_image_url.md)
