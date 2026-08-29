import { afterEach, describe, expect, it, vi } from 'vitest'

import { z } from 'zod'
import { OpenCodeGoLlmClient } from '../../src/infrastructure/llm/opencode-go-llm.client'
import { OpenCodeGoOcrClient } from '../../src/infrastructure/llm/opencode-go-ocr.client'
import type { Result } from '../../src/lib/result'
import { ok } from '../../src/lib/result'

const PayloadSchema = z.object({ answer: z.string() })

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Fetch double that captures requests and replies with canned responses. */
function stubFetch(responder: (url: string, init: RequestInit) => Response): {
  calls: Array<{ url: string; init: RequestInit }>
} {
  const calls: Array<{ url: string; init: RequestInit }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return responder(String(url), init ?? {})
    }),
  )
  return { calls }
}

describe('OpenCodeGoLlmClient', () => {
  it('posts to the Anthropic-compatible /messages endpoint and validates the JSON payload', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse(200, {
        content: [{ type: 'text', text: '{"answer": "hello"}' }],
      }),
    )
    const client = new OpenCodeGoLlmClient({ apiKey: 'oc-test', model: 'minimax-m3' })

    const result = await client.completeJson({
      system: 'sys',
      user: 'usr',
      schema: PayloadSchema,
      schemaName: 'Payload',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ answer: 'hello' })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://opencode.ai/zen/go/v1/messages')
    const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>
    expect(body).toMatchObject({ model: 'minimax-m3', max_tokens: 2048, system: 'sys' })
    expect(calls[0].init.headers).toMatchObject({
      authorization: 'Bearer oc-test',
      'x-api-key': 'oc-test',
    })
  })

  it('extracts JSON from fenced responses', async () => {
    stubFetch(() =>
      jsonResponse(200, {
        content: [{ type: 'text', text: 'Here you go:\n```json\n{"answer": "fenced"}\n```' }],
      }),
    )
    const client = new OpenCodeGoLlmClient({ apiKey: 'oc-test' })

    const result = await client.completeJson({
      system: 's',
      user: 'u',
      schema: PayloadSchema,
      schemaName: 'Payload',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ answer: 'fenced' })
  })

  it('returns a retryable error on upstream failures', async () => {
    stubFetch(() => jsonResponse(503, { error: 'overloaded' }))
    const client = new OpenCodeGoLlmClient({ apiKey: 'oc-test' })

    const result = await client.completeJson({
      system: 's',
      user: 'u',
      schema: PayloadSchema,
      schemaName: 'Payload',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.retryable).toBe(true)
    expect(result.error.message).toContain('503')
  })

  it('reports a schema violation as a retryable error', async () => {
    stubFetch(() => jsonResponse(200, { content: [{ type: 'text', text: '{"wrong": 1}' }] }))
    const client = new OpenCodeGoLlmClient({ apiKey: 'oc-test' })

    const result = await client.completeJson({
      system: 's',
      user: 'u',
      schema: PayloadSchema,
      schemaName: 'Payload',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.retryable).toBe(true)
    expect(result.error.message).toContain('violated schema')
  })

  it('fails fast without a network call when the API key is missing', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, { content: [] }))
    const client = new OpenCodeGoLlmClient({ apiKey: '' })

    const result = await client.completeJson({
      system: 's',
      user: 'u',
      schema: PayloadSchema,
      schemaName: 'Payload',
    })

    expect(result.ok).toBe(false)
    expect(calls).toEqual([])
  })
})

describe('OpenCodeGoOcrClient', () => {
  it('posts the image to /chat/completions and returns the extracted text', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse(200, {
        choices: [{ message: { content: 'Bank Transfer Successful\nRef: ZEN-114820' } }],
      }),
    )
    const client = new OpenCodeGoOcrClient({ apiKey: 'oc-test' })

    const result = await client.extractText({ imageUrl: 'data:image/png;base64,abc' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toBe('Bank Transfer Successful\nRef: ZEN-114820')
    expect(calls[0].url).toBe('https://opencode.ai/zen/go/v1/chat/completions')
    const body = JSON.parse(String(calls[0].init.body)) as {
      model: string
      messages: Array<{ content: Array<Record<string, unknown>> }>
    }
    expect(body.model).toBe('deepseek-v4-flash-vision-exp')
    expect(body.messages[0].content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,abc' },
    })
  })

  it('returns a retryable error on upstream failures', async () => {
    stubFetch(() => jsonResponse(429, { error: 'rate limited' }))
    const client = new OpenCodeGoOcrClient({ apiKey: 'oc-test' })

    const result = await client.extractText({ imageUrl: 'x' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.retryable).toBe(true)
    expect(result.error.message).toContain('429')
  })

  it('fails without a network call when the API key is missing', async () => {
    const { calls } = stubFetch(() => jsonResponse(200, { choices: [] }))
    const client = new OpenCodeGoOcrClient({ apiKey: '' })

    const result = await client.extractText({ imageUrl: 'x' })

    expect(result.ok).toBe(false)
    expect(calls).toEqual([])
  })
})

describe('OpenCode Go client construction', () => {
  it('accepts a custom base URL without a trailing-slash double path', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }] }),
    )
    const client = new OpenCodeGoOcrClient({
      apiKey: 'oc-test',
      baseUrl: 'https://proxy.example/v1/',
    })

    const result = await client.extractText({ imageUrl: 'x' })

    expect(result).toEqual(ok('ok') satisfies Result<string, never>)
    expect(calls[0].url).toBe('https://proxy.example/v1/chat/completions')
  })
})
