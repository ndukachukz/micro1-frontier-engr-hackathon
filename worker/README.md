# Chata Worker

Hono + `@hono/zod-openapi` API with interactive Scalar docs, a Cloudflare **Workflow** per
inbound message, D1 state, and the agent/baseline/eval cores.

## Layout

```
src/
├── index.ts                  # entry: default fetch handler + OrderWorkflow export
├── app/                      # create-app composition root, OpenAPI/Scalar mount, middleware
├── routes/                   # HTTP adapters (zod-openapi), one module per resource
├── services/                 # use cases + persistence/workflow ports + composition container
├── core/                     # pure domain: agent pipeline, baseline, tool ports, eval scoring
├── infrastructure/           # adapters: D1 repositories/tools, OpenCode Go LLM/OCR clients, OrderWorkflow
├── lib/                      # result, errors, money, fixture loading
└── types.ts                  # AppBindings (mirrors wrangler.jsonc)
migrations/                   # D1 schema
scripts/                      # seed + fixture codegen
test/                         # unit (core) + integration (real wrangler dev via unstable_dev)
```

See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for the dependency rule and
naming conventions.

## Commands

```bash
bun dev        # generate fixtures module + wrangler dev (API on :8787, docs at /docs)
bun test       # unit + integration tests
bun typecheck  # tsc --noEmit
bun migrate    # apply D1 migrations locally
bun seed       # reset catalog + payments from ../fixtures.json
bun deploy     # wrangler deploy
```

## Secrets

`OPENCODE_API_KEY` is only required for baseline/agent/eval endpoints. Local: put it in
`.dev.vars` (see `.dev.vars.example`). Deploy: `wrangler secret put OPENCODE_API_KEY`.
