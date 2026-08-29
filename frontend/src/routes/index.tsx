import { formatNgn } from '@chata/shared'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { StatusBadge } from '#/components/status-badge'
import { ordersQuery } from '#/lib/api/queries'

export const Route = createFileRoute('/')({ component: InboxPage })

function InboxPage() {
  const { data, isLoading, error } = useQuery(ordersQuery())

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Order inbox</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every inbound WhatsApp message becomes an order processed by the agent pipeline.
        </p>
      </header>

      {isLoading && <p className="text-sm text-slate-500">Loading orders…</p>}
      {error && <p className="text-sm text-rose-600">{(error as Error).message}</p>}

      {data && data.orders.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No orders yet. Replay a fixture message against{' '}
          <code className="rounded bg-slate-100 px-1">POST /webhook/whatsapp</code> (see the Scalar
          docs on the worker at <code className="rounded bg-slate-100 px-1">/docs</code>).
        </div>
      )}

      {data && data.orders.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {data.orders.map((order) => (
            <li key={order.id}>
              <Link
                to="/orders/$orderId"
                params={{ orderId: order.id }}
                className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-xs text-slate-500">
                    {order.id} · {order.items.length} item{order.items.length === 1 ? '' : 's'} ·{' '}
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatNgn(order.total_ngn)}</span>
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
