import type { AgentOutput, EvalDiff } from '@chata/shared'

/**
 * Scoring helpers for the eval harness. Comparison is exact after normalization:
 * action, order (items as a set, total, confidence, reconstruction flag),
 * payment_status, matched_payment_id, and the flags set must all match.
 */

export function normalizeOutput(output: AgentOutput): AgentOutput {
  return {
    action: output.action,
    order: normalizeOrder(output.order),
    payment_status: output.payment_status,
    matched_payment_id: output.matched_payment_id ?? null,
    flags: [...new Set(output.flags)].sort(),
  }
}

function normalizeOrder(order: AgentOutput['order']): AgentOutput['order'] {
  if (!order) {
    return null
  }
  return {
    ...order,
    // `reconstructed_from_history` is only meaningful when true — a model that
    // emits `false` explicitly must not fail an otherwise-exact match.
    reconstructed_from_history: order.reconstructed_from_history || undefined,
    items: [...order.items].sort((a, b) => a.sku.localeCompare(b.sku)),
  }
}

export function scoreCase(
  expected: AgentOutput,
  actual: AgentOutput,
): { passed: boolean; diff: EvalDiff; falseConfirm: boolean } {
  const lhs = normalizeOutput(expected)
  const rhs = normalizeOutput(actual)

  const sameOrder = JSON.stringify(lhs.order) === JSON.stringify(rhs.order)
  const diff: EvalDiff = {
    action: lhs.action !== rhs.action,
    order: !sameOrder,
    payment_status: lhs.payment_status !== rhs.payment_status,
    matched_payment_id: lhs.matched_payment_id !== rhs.matched_payment_id,
    flags: JSON.stringify(lhs.flags) !== JSON.stringify(rhs.flags),
  }

  const falseConfirm = rhs.action === 'confirm_order' && lhs.action !== 'confirm_order'

  return {
    passed:
      !diff.action &&
      !diff.order &&
      !diff.payment_status &&
      !diff.matched_payment_id &&
      !diff.flags,
    diff,
    falseConfirm,
  }
}
