import type { ChataRepositories } from '../infrastructure/db/composition'
import {
  CloudflareWorkflowEventSender,
  CloudflareWorkflowStarter,
  createLlmClient,
  createOcrClient,
  createRepositories,
} from '../infrastructure/db/composition'
import type { AppBindings } from '../types'
import { ApprovalService } from './approval.service'
import { EvalService } from './eval.service'
import { OrderIntakeService } from './order-intake.service'
import { PaymentService } from './payment.service'

/**
 * Composition root for the application services. Built once per request from
 * the Cloudflare bindings (cheap object wiring; the bindings themselves are
 * request-scoped stubs).
 */
export interface AppServices {
  repositories: ChataRepositories
  intake: OrderIntakeService
  approvals: ApprovalService
  payments: PaymentService
  eval: EvalService
}

export function createServices(env: AppBindings): AppServices {
  const repositories = createRepositories(env.DB)
  const workflowEvents = new CloudflareWorkflowEventSender(env.ORDER_WORKFLOW)

  return {
    repositories,
    intake: new OrderIntakeService({
      orders: repositories.orders,
      conversations: repositories.conversations,
      workflowStarter: new CloudflareWorkflowStarter(env.ORDER_WORKFLOW),
    }),
    approvals: new ApprovalService({
      orders: repositories.orders,
      approvals: repositories.approvals,
      events: workflowEvents,
    }),
    payments: new PaymentService({
      payments: repositories.payments,
      orders: repositories.orders,
      events: workflowEvents,
    }),
    eval: new EvalService({
      // Lazy: the LLM/OCR clients are plain objects; the API key is only
      // validated when a request is actually made. Eval is the only path
      // that needs them.
      llmFactory: () => createLlmClient(env),
      ocrFactory: () => createOcrClient(env),
      trajectories: repositories.trajectories,
      evalRuns: repositories.evalRuns,
    }),
  }
}
