/**
 * Extracts a JSON object from an LLM response. Handles raw JSON, ```json code
 * fences, and prose wrapping the object. Throws when no JSON object is found.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)
  const candidate = fenced ? fenced[1] : trimmed
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1))
    }
    throw new Error('no JSON object found in response')
  }
}

/** Joins text content out of an Anthropic- or OpenAI-shaped response body. */
export function responseText(body: unknown): string {
  const data = body as {
    content?: Array<{ type?: string; text?: string }>
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>
  }
  if (Array.isArray(data.content)) {
    return data.content
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('')
  }
  const message = data.choices?.[0]?.message?.content
  if (typeof message === 'string') {
    return message
  }
  if (Array.isArray(message)) {
    return message.map((part) => part.text ?? '').join('')
  }
  return ''
}
