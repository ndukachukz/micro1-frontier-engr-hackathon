/** Typed application error mapped to an RFC-style problem response by the error-handler middleware. */
export class AppError extends Error {
  readonly status: number
  readonly title: string
  readonly detail?: string

  constructor(status: number, title: string, detail?: string) {
    super(detail ?? title)
    this.name = 'AppError'
    this.status = status
    this.title = title
    this.detail = detail
  }
}

export const badRequest = (detail: string) => new AppError(400, 'Bad Request', detail)
export const notFound = (detail: string) => new AppError(404, 'Not Found', detail)
export const conflict = (detail: string) => new AppError(409, 'Conflict', detail)
export const upstreamError = (detail: string) => new AppError(502, 'Upstream Error', detail)
