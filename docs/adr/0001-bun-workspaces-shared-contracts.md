# ADR-0001 — Bun workspaces with a shared zod contracts package

**Status:** accepted

## Context
Two apps (worker, frontend) need the same domain and API contracts: request validation,
OpenAPI generation, TypeScript types, and fixture validation.

## Decision
Single-source all zod schemas in `packages/shared` (`@chata/shared`), consumed as raw TS
source by both apps through bun workspaces. No generated client, no duplicated types.

## Consequences
- Zero drift: a schema change breaks typecheck on every consumer immediately.
- No codegen step to maintain (KISS).
- Both apps must agree on one zod version (pinned identically: zod 4.5.x).
