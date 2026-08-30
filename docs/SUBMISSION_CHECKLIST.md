# Submission checklist — final QA

Working document for the last gate before submitting: verify every deliverable and
rule explicitly, self-score against the rubric, and record anything consciously
accepted rather than fixed. Nothing new gets built here.

## Clean-room verification

- [x] Fresh clone on a clean environment (`git clone` to `/tmp`, judge-style
      setup: `bun install`, `bun --cwd worker migrate`, `bun --cwd worker seed`,
      `cp worker/.dev.vars.example worker/.dev.vars` + key, `bun dev`)
- [x] Worker serves `GET /health`, frontend serves on :3000
- [x] Eval runs end-to-end: run `EVAL-89116fce` completed — baseline 2/13
      (15.4%), agent 12/13 (92.3%), **agent false confirms 0**, `case_07`
      flagged with `payment_amount_mismatch` — inside the range documented in
      the README "Expected results" (the known flaky case is `case_05`)
- [x] `bun --cwd worker export:eval` reproduced the bundle shape (summary +
      26 trajectories) from the fresh clone

## Deliverables

- [x] **Deliverable 1 — solution code + labeled Improvement Changelog**:
      the iteration story (baseline → extraction+memory → verification-as-code →
      prompt hardening → eval-retry fix → final) is evidenced by committed
      artifacts — `docs/adr/`, the eval bundle (`docs/eval-evidence/`), and the
      README comparison table; the main failure mode (false confirm on case_07)
      is documented in `docs/eval-evidence/summary.md`.
- [x] **Deliverable 2 — reproduction guide**: README covers setup, exact
      commands (solution/baseline/eval/export), data required, expected output
      (committed reference run + honest nondeterminism note), versions
      (`engines` node ≥20, `.bun-version` 1.2.22, model `minimax-m3` via
      OpenCode Go), approximate runtime (~1 min/run, ~26 LLM calls) and cost
      (OpenCode Go subscription).
- [ ] **Deliverable 3 — video**: demo path rehearsed end-to-end against the
      committed code; recording script kept in the author's planning notes (out
      of the repo by intent); the ≤5:00 recording itself is pending the human
      narration/approval step.
- [x] **Deliverable 4 — representative trajectories**: committed under
      `docs/eval-evidence/trajectories/` — one per agent per fixture case (26
      files), each followable top-to-bottom (instructions → every tool call and
      response → decision incl. downgrade moments → reply).

## Rubric self-score

| Criterion | Self-score | Why |
|---|---|---|
| Problem & User Value (15) | **strong** | Concrete Lagos vendor profile (§1) anchored to the fixture catalog/payments; the unconfirmed-payment cost is specific and drives the design. |
| Measured Improvement (15) | **strong** | Baseline 2/13 (15.4%, 1 false confirm) vs agent 13/13 (100%, 0) on the committed run; changelog rows each carry evidence; the false-confirm elimination is unit-pinned, not anecdotal. |
| Reproducibility (15) | **strong** | No `latest` deps, `engines` + `.bun-version` committed, expected-output block with accepted variance, fresh-clone verification actually performed and recorded. |
| Solution quality / agent architecture | **strong** | LLM-proposes/code-verifies split with the downgrade guaranteed by code and tests; durable workflow with human-approval gate; audit trajectories include per-tool-call records; hexagonal layering kept honest (core is infra-free). |
| Hot take (5) | **strong** | Grown from an observed failure (baseline's confident false confirm), with a practical consequence (proposals vs decisions) and a roadmap implication. |
| Video (5) | **pending human** | Demo path rehearsed against the committed code; recording/narration/approval is the deliberate human step before submitting. Anything short of "recorded and ≤5:00" is not scoreable yet — fix before submitting. |

## Ground rules

- [x] **Pre/post-competition work distinguished** — git history: first commit is
      the marked pre-submission-work baseline; every submission change after it
      is a reviewable, attributable commit.
- [x] **Consequential actions sandboxed with human approval** — nothing touches
      a real store/bank/WhatsApp account; `confirm_order` creates a pending
      approval and waits (24h) for the vendor's explicit decision; stock
      deduction + payment marking run only after approval, against local D1.
- [x] **Data shareable/synthetic** — `fixtures.json` is fabricated end to end;
      `wa_id` values prefixed `234800000`; nothing real anywhere.
- [x] **Zero credentials or private info in the submission** — `worker/.dev.vars`
      gitignored; `.dev.vars.example` carries a placeholder; tracked content
      swept for key values (`sk-`, `OPENCODE_API_KEY=<value>`): only the
      example/placeholder text matches.
- [x] **Every result claim tied to a committed artifact** — README claims link
      to `docs/eval-evidence/` (summary + trajectories) or unit tests
      (`worker/test/unit/verification.test.ts`).
- [x] **Judges can run the project** — clean-room clone verified end-to-end
      (quickstart + eval + export), guided by the README alone.

## Consciously accepted

- Model nondeterminism means a judge's run may land at agent 12/13 (observed
  once, `case_05` flakiness) instead of 13/13 — accepted and documented in the
  README with the invariant that actually matters (0 false confirms) called out.
- The video deliverable remains open until the human records it — accepted as
  the deliberate human step, not as a gap to fix here.
