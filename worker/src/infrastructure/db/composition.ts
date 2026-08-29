import type {
  ApprovalRepository,
  CatalogRepository,
  ConversationRepository,
  EvalRunRepository,
  OrderRepository,
  PaymentRepository,
  TrajectoryRepository,
  WorkflowEventSender,
  WorkflowStarter,
} from '../../services/ports'
import type { AppBindings } from '../../types'
import { OpenCodeGoLlmClient } from '../llm/opencode-go-llm.client'
import { OpenCodeGoOcrClient } from '../llm/opencode-go-ocr.client'
import { D1PaymentTool, D1ReplySender, D1StockTool } from '../tools/d1-tools'
import { D1ApprovalRepository } from './d1-approval.repository'
import { D1CatalogRepository } from './d1-catalog.repository'
import { D1ConversationRepository } from './d1-conversation.repository'
import { D1EvalRunRepository } from './d1-eval-run.repository'
import { D1OrderRepository } from './d1-order.repository'
import { D1PaymentRepository } from './d1-payment.repository'
import { D1TrajectoryRepository } from './d1-trajectory.repository'

/** All D1-backed repositories, composed from a single binding. */
export interface ChataRepositories {
  catalog: CatalogRepository
  payments: PaymentRepository
  conversations: ConversationRepository
  orders: OrderRepository
  approvals: ApprovalRepository
  trajectories: TrajectoryRepository
  evalRuns: EvalRunRepository
}

export function createRepositories(db: D1Database): ChataRepositories {
  return {
    catalog: new D1CatalogRepository(db),
    payments: new D1PaymentRepository(db),
    conversations: new D1ConversationRepository(db),
    orders: new D1OrderRepository(db),
    approvals: new D1ApprovalRepository(db),
    trajectories: new D1TrajectoryRepository(db),
    evalRuns: new D1EvalRunRepository(db),
  }
}

/** D1-backed implementations of the agent tool ports. */
export function createD1Tools(repositories: ChataRepositories): {
  stock: D1StockTool
  payments: D1PaymentTool
  replies: D1ReplySender
} {
  return {
    stock: new D1StockTool(repositories.catalog),
    payments: new D1PaymentTool(repositories.payments),
    replies: new D1ReplySender(repositories.conversations),
  }
}

export function createLlmClient(env: AppBindings): OpenCodeGoLlmClient {
  return new OpenCodeGoLlmClient({
    apiKey: env.OPENCODE_API_KEY,
    model: env.OPENCODE_MODEL,
    baseUrl: env.OPENCODE_BASE_URL,
  })
}

export function createOcrClient(env: AppBindings): OpenCodeGoOcrClient {
  return new OpenCodeGoOcrClient({
    apiKey: env.OPENCODE_API_KEY,
    model: env.OPENCODE_VISION_MODEL,
    baseUrl: env.OPENCODE_BASE_URL,
  })
}

export class CloudflareWorkflowStarter implements WorkflowStarter {
  // `Workflow` is the global runtime class from the generated Cloudflare types.
  constructor(private readonly workflow: Workflow) {}

  async start(
    instanceId: string,
    params: import('../../services/ports').OrderWorkflowParams,
  ): Promise<void> {
    await this.workflow.create({ id: instanceId, params })
  }
}

export class CloudflareWorkflowEventSender implements WorkflowEventSender {
  constructor(private readonly workflow: Workflow) {}

  async sendApproval(instanceId: string, approved: boolean): Promise<void> {
    const instance = await this.workflow.get(instanceId)
    await instance.sendEvent({ type: 'approval', payload: { approved } })
  }

  async sendPayment(instanceId: string, paymentId: string): Promise<void> {
    const instance = await this.workflow.get(instanceId)
    await instance.sendEvent({ type: 'payment', payload: { payment_id: paymentId } })
  }
}
