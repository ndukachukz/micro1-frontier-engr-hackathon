import { queryOptions } from '@tanstack/react-query'

import { api } from './client'

export const ordersQuery = () =>
  queryOptions({ queryKey: ['orders'], queryFn: api.listOrders, refetchInterval: 5000 })

export const orderQuery = (id: string) =>
  queryOptions({ queryKey: ['orders', id], queryFn: () => api.getOrder(id), refetchInterval: 5000 })

export const catalogQuery = () => queryOptions({ queryKey: ['catalog'], queryFn: api.listCatalog })

export const paymentsQuery = () =>
  queryOptions({ queryKey: ['payments'], queryFn: api.listPayments, refetchInterval: 5000 })

export const evalRunsQuery = () =>
  queryOptions({ queryKey: ['eval', 'runs'], queryFn: api.listEvalRuns })
