/** Env bindings for the Chata worker. Mirrors wrangler.jsonc; `Workflow` is the global runtime class. */
export interface AppBindings {
  DB: D1Database
  ORDER_WORKFLOW: Workflow
  OPENCODE_API_KEY: string
  OPENCODE_BASE_URL?: string
  OPENCODE_MODEL?: string
  OPENCODE_VISION_MODEL?: string
}

export interface AppEnv {
  Bindings: AppBindings
  Variables: Record<string, never>
}
