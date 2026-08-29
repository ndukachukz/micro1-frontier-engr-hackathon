import { formatNgn } from '@chata/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { StatusBadge } from '#/components/status-badge'
import { api } from '#/lib/api/client'
import { catalogQuery, orderQuery } from '#/lib/api/queries'

export const Route = createFileRoute('/orders/$orderId')({ component: OrderDetailPage })

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data: order, isLoading, error } = useQuery(orderQuery(orderId))
  const { data: catalog } = useQuery(catalogQuery())

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  const approval = useMutation({
    mutationFn: (approved: boolean) => api.resolveApproval(orderId, approved),
    onSuccess: invalidate,
  })

  const simulatePayment = useMutation({
    mutationFn: () =>
      api.simulatePayment({
        customer_wa_id: order?.customer_wa_id ?? '',
        amount_ngn: order?.total_ngn ?? 0,
        sender_ref: `SIM-${Date.now()}`,
      }),
    onSuccess: invalidate,
  })

  if (isLoading) {
    return <main className="mx-auto max-w-3xl p-8 text-sm text-slate-500">Loading order…</main>
  }
  if (error || !order) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-rose-600">{(error as Error)?.message ?? 'Order not found'}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to inbox
        </Link>
      </main>
    )
  }

  const catalogNames = new Map((catalog?.items ?? []).map((item) => [item.sku, item.name]))

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        ← Back to inbox
      </Link>

      <header className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{order.customer_name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {order.id} · {order.customer_wa_id} · updated{' '}
            {new Date(order.updated_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">Items</h2>
        {order.items.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No items extracted yet — the agent pipeline is still running.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.sku} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {item.quantity}× {catalogNames.get(item.sku) ?? item.sku}
                </span>
                <span className="text-slate-500">{item.sku}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-medium">
          <span>Total</span>
          <span>{formatNgn(order.total_ngn)}</span>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-slate-500">Payment status</p>
          <p className="mt-1 font-medium">{order.payment_status}</p>
          {order.matched_payment_id && (
            <p className="mt-1 text-xs text-slate-500">Matched: {order.matched_payment_id}</p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-slate-500">Agent action</p>
          <p className="mt-1 font-medium">{order.action ?? 'pending'}</p>
        </div>
      </section>

      {order.flags.length > 0 && (
        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Flags</p>
          <ul className="mt-2 list-inside list-disc text-sm text-amber-800">
            {order.flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </section>
      )}

      {order.status === 'awaiting_approval' && (
        <section className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">Human approval required</p>
          <p className="mt-1 text-sm text-blue-700">
            Stock is only deducted and the payment marked matched after your decision.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => approval.mutate(true)}
              disabled={approval.isPending}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve order
            </button>
            <button
              type="button"
              onClick={() => approval.mutate(false)}
              disabled={approval.isPending}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </section>
      )}

      {order.status === 'awaiting_payment' && order.total_ngn > 0 && (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Simulate incoming payment</p>
          <p className="mt-1 text-sm text-amber-700">
            Records a bank transfer of {formatNgn(order.total_ngn)} from this customer and resumes
            the waiting workflow.
          </p>
          <button
            type="button"
            onClick={() => simulatePayment.mutate()}
            disabled={simulatePayment.isPending}
            className="mt-3 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Simulate payment of {formatNgn(order.total_ngn)}
          </button>
        </section>
      )}
    </main>
  )
}
