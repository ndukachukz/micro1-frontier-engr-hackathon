import { describe, expect, inject, it } from 'vitest'

const workerUrl = inject('workerUrl' as never) as string

const get = (path: string) => fetch(`${workerUrl}${path}`)
const post = (path: string, body: unknown) =>
  fetch(`${workerUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('System', () => {
  it('GET /health returns ok', async () => {
    const response = await get('/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('serves the OpenAPI document and Scalar reference', async () => {
    const spec = await get('/openapi.json')
    expect(spec.status).toBe(200)
    const document = (await spec.json()) as {
      info: { title: string }
      paths: Record<string, unknown>
    }
    expect(document.info.title).toBe('Chata API')
    expect(document.paths['/webhook/whatsapp']).toBeDefined()
    expect(document.paths['/orders/{id}/approval']).toBeDefined()
    expect(document.paths['/eval/run']).toBeDefined()

    const docs = await get('/docs')
    expect(docs.status).toBe(200)
    expect(await docs.text()).toContain('scalar')
  })
})

describe('Catalog & payments (seeded fixtures)', () => {
  it('GET /catalog returns the fixture catalog', async () => {
    const response = await get('/catalog')
    expect(response.status).toBe(200)
    const { items } = (await response.json()) as { items: Array<{ sku: string; stock: number }> }
    expect(items).toHaveLength(8)
    const garri = items.find((item) => item.sku === 'GARRI_BAG')
    expect(garri?.stock).toBe(0)
  })

  it('GET /payments returns the fixture payment records', async () => {
    const response = await get('/payments')
    expect(response.status).toBe(200)
    const { payments } = (await response.json()) as { payments: Array<{ id: string }> }
    expect(payments.map((payment) => payment.id)).toEqual(['PMT001', 'PMT002'])
  })
})

describe('Orders', () => {
  it('GET /orders/:id 404s with a problem response for unknown ids', async () => {
    const response = await get('/orders/ORD-unknown')
    expect(response.status).toBe(404)
    const problem = (await response.json()) as { status: number; title: string }
    expect(problem.title).toBe('Not Found')
  })
})

describe('Validation', () => {
  it('rejects a text webhook message without text (400 problem)', async () => {
    const response = await post('/webhook/whatsapp', {
      customer: { wa_id: '2348000000101', name: 'Ngozi A.' },
      message: { type: 'text', timestamp: '2026-08-27T09:12:00Z' },
    })
    expect(response.status).toBe(400)
    const problem = (await response.json()) as { status: number; title: string }
    expect(problem.title).toBe('Validation failed')
  })

  it('rejects a webhook message with an unsupported type (400 problem)', async () => {
    const response = await post('/webhook/whatsapp', {
      customer: { wa_id: 'x', name: 'x' },
      message: { type: 'voice', timestamp: 't' },
    })
    expect(response.status).toBe(400)
  })

  it('rejects an approval body without `approved` (400 problem)', async () => {
    const response = await post('/orders/ORD-x/approval', {})
    expect(response.status).toBe(400)
  })

  it('404s an approval for an unknown order', async () => {
    const response = await post('/orders/ORD-unknown/approval', { approved: true })
    expect(response.status).toBe(404)
  })

  it('rejects a payment without a sender_ref (400 problem)', async () => {
    const response = await post('/payments', { customer_wa_id: '2348000000101', amount_ngn: 100 })
    expect(response.status).toBe(400)
  })
})
