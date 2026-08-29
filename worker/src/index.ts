import { createApp } from './app/create-app'
import type { AppBindings } from './types'

export { OrderWorkflow } from './infrastructure/workflow/order.workflow'

export default {
  fetch(request: Request, env: AppBindings, ctx: ExecutionContext): Response | Promise<Response> {
    return createApp(env).fetch(request, env, ctx)
  },
} satisfies ExportedHandler<AppBindings>
