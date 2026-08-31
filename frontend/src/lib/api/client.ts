import type {
  CatalogItem,
  EvalReplayResponse,
  EvalRunListItem,
  EvalRunSummary,
  OrderDto,
  PaymentRecord,
} from '@chata/shared'

const BASE = import.meta.env?.VITE_API_URL

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      title?: string
      detail?: string
    } | null

    throw new ApiError(
      response.status,
      problem?.detail ?? problem?.title ?? `Request failed (${response.status})`,
    )
  }

  return response.json() as Promise<T>
}

export interface EvalAgentName {
  name: 'baseline' | 'agent'
}

export const api = {
  listOrders: () => request<{ orders: OrderDto[] }>('/orders'),

  getOrder: (id: string) => request<OrderDto>(`/orders/${encodeURIComponent(id)}`),

  resolveApproval: (id: string, approved: boolean, note?: string) =>
    request<{ order_id: string; approval_status: string }>(
      `/orders/${encodeURIComponent(id)}/approval`,
      {
        method: 'POST',
        body: JSON.stringify({ approved, note }),
      },
    ),

  listCatalog: () => request<{ items: CatalogItem[] }>('/catalog'),

  listPayments: () => request<{ payments: PaymentRecord[] }>('/payments'),

  simulatePayment: (body: { customer_wa_id: string; amount_ngn: number; sender_ref: string }) =>
    request<{ payment: PaymentRecord; resumed_instance_id: string | null }>('/payments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  runEval: (body: { agents: Array<'baseline' | 'agent'>; case_ids?: string[] }) =>
    request<EvalRunSummary>('/eval/run', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  replayCase: (caseId: string, agent: 'baseline' | 'agent') =>
    request<EvalReplayResponse>(`/eval/fixtures/${encodeURIComponent(caseId)}/replay`, {
      method: 'POST',
      body: JSON.stringify({ agent }),
    }),
  listEvalRuns: () => request<{ runs: EvalRunListItem[] }>('/eval/runs'),
}
