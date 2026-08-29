import type { OrderStatus } from '@chata/shared'

const STATUS_STYLES: Record<OrderStatus, string> = {
  processing: 'bg-slate-100 text-slate-700',
  awaiting_payment: 'bg-amber-100 text-amber-800',
  awaiting_approval: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-600',
  flagged: 'bg-rose-100 text-rose-800',
  needs_clarification: 'bg-violet-100 text-violet-800',
  closed_no_order: 'bg-slate-100 text-slate-500',
}

const LABELS: Record<OrderStatus, string> = {
  processing: 'Processing',
  awaiting_payment: 'Awaiting payment',
  awaiting_approval: 'Awaiting approval',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  flagged: 'Flagged for review',
  needs_clarification: 'Needs clarification',
  closed_no_order: 'No order',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  )
}
