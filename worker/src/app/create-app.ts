import { ProblemSchema } from '@chata/shared'
import { OpenAPIHono } from '@hono/zod-openapi'
import { registerCatalogRoutes } from '../routes/catalog.routes'
import { registerEvalRoutes } from '../routes/eval.routes'
import { registerHealthRoutes } from '../routes/health.routes'
import { registerOrderRoutes } from '../routes/orders.routes'
import { registerPaymentRoutes } from '../routes/payments.routes'
import { registerWebhookRoutes } from '../routes/webhook.routes'
import type { AppServices } from '../services/container'
import { createServices } from '../services/container'
import type { AppEnv } from '../types'
import { errorHandler } from './middleware/error-handler'
import { mountOpenApi } from './openapi'

/**
 * Composition root: builds the Hono app with middleware, OpenAPI/Scalar docs,
 * and all route modules. One instance per request; wiring is cheap.
 */
export function createApp(env: AppEnv['Bindings']): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const problem = ProblemSchema.parse({
          status: 400,
          title: 'Validation failed',
          detail: JSON.stringify(result.error.issues),
        })
        return c.json(problem, 400)
      }
    },
  })

  app.onError(errorHandler)
  app.notFound((c) => c.json({ status: 404, title: 'Not Found' }, 404))

  mountOpenApi(app)

  const services: AppServices = createServices(env)
  registerHealthRoutes(app)
  registerWebhookRoutes(app, services)
  registerOrderRoutes(app, services)
  registerPaymentRoutes(app, services)
  registerCatalogRoutes(app, services)
  registerEvalRoutes(app, services)

  return app
}
