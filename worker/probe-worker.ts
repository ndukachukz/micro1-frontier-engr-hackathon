export default {
  async fetch(): Promise<Response> {
    const info: Record<string, unknown> = {}
    try {
      const wf = await import('cloudflare:workflows')
      info.workflowsModule = Object.keys(wf)
    } catch (e) {
      info.workflowsModule = `error: ${e instanceof Error ? e.message : String(e)}`
    }
    try {
      const cw = await import('cloudflare:workers')
      info.workersModule = Object.keys(cw)
    } catch (e) {
      info.workersModule = `error: ${e instanceof Error ? e.message : String(e)}`
    }
    const g = globalThis as Record<string, unknown>
    info.globals = {
      WorkflowEntrypoint: typeof g.WorkflowEntrypoint,
      WorkflowStep: typeof g.WorkflowStep,
      DurableObject: typeof g.DurableObject,
      WorkerEntrypoint: typeof g.WorkerEntrypoint,
    }
    return Response.json(info)
  },
}
