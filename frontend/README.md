# Chata Frontend

Vendor console built with TanStack Router + TanStack Query + Tailwind 4.

- `/` — order inbox (live status of every processed message)
- `/orders/$orderId` — order detail with **Approve/Reject** (human-in-the-loop) and a
  **simulate payment** action for orders awaiting payment
- `/eval` — baseline vs agent benchmark dashboard

Requires the worker running on `http://localhost:8787` (proxied via `/api` in dev).

```bash
bun dev        # vite dev server on :3000
bun build      # production build
bun typecheck  # tsc --noEmit
```
