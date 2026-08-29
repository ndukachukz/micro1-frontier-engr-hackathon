import type {
  ApprovalStatus,
  CatalogItem,
  ConversationTurn,
  Customer,
  EvalRunListItem,
  EvalRunSummary,
  InboundMessage,
  OrderDto,
  PaymentRecord,
  Trajectory,
} from '@chata/shared'

/**
 * Persistence ports owned by the service layer. Infrastructure provides D1
 * implementations; eval/tests provide in-memory ones.
 */

export interface CatalogRepository {
  list(): Promise<CatalogItem[]>
  get(sku: string): Promise<CatalogItem | null>
  deduct(sku: string, quantity: number): Promise<void>
}

export interface PaymentRepository {
  list(): Promise<PaymentRecord[]>
  get(id: string): Promise<PaymentRecord | null>
  findBySenderRef(senderRef: string): Promise<PaymentRecord | null>
  create(input: {
    id: string
    amountNgn: number
    senderRef: string
    timestamp: string
  }): Promise<PaymentRecord>
  markMatched(id: string): Promise<void>
}

export interface ConversationRepository {
  history(waId: string): Promise<ConversationTurn[]>
  append(input: {
    waId: string
    direction: 'inbound' | 'outbound'
    text: string
    timestamp: string
  }): Promise<void>
}

export type OrderPatch = Partial<
  Pick<
    OrderDto,
    | 'items'
    | 'total_ngn'
    | 'status'
    | 'action'
    | 'payment_status'
    | 'matched_payment_id'
    | 'flags'
    | 'instance_id'
  >
>

export interface OrderRepository {
  create(order: OrderDto): Promise<void>
  get(id: string): Promise<OrderDto | null>
  list(): Promise<OrderDto[]>
  update(id: string, patch: OrderPatch): Promise<void>
  latestAwaitingPaymentFor(waId: string): Promise<OrderDto | null>
}

export interface ApprovalRecord {
  orderId: string
  status: ApprovalStatus
  requestedAt: string
  resolvedAt: string | null
  note: string | null
}

export interface ApprovalRepository {
  upsert(input: {
    orderId: string
    status: ApprovalStatus
    requestedAt?: string
    resolvedAt?: string
    note?: string
  }): Promise<void>
  get(orderId: string): Promise<ApprovalRecord | null>
}

export interface TrajectoryRepository {
  save(trajectory: Trajectory): Promise<void>
}

export interface EvalRunRepository {
  save(run: EvalRunSummary): Promise<void>
  list(): Promise<EvalRunListItem[]>
}

/** Starts a durable order-intake workflow instance. */
export interface WorkflowStarter {
  start(instanceId: string, params: OrderWorkflowParams): Promise<void>
}

/** Delivers events to waiting workflow instances (approvals, simulated payments). */
export interface WorkflowEventSender {
  sendApproval(instanceId: string, approved: boolean): Promise<void>
  sendPayment(instanceId: string, paymentId: string): Promise<void>
}

/** Parameters handed to a new order-intake workflow instance. */
export interface OrderWorkflowParams {
  order_id: string
  customer: Customer
  message: InboundMessage
  message_id: string
}
