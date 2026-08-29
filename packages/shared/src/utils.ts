/** Formats integer naira amounts for customer-facing text, e.g. 93500 → "NGN 93,500". */
export function formatNgn(amountNgn: number): string {
  return `₦ ${amountNgn.toLocaleString('en-US')}`
}

/** Builds a human-readable item list, e.g. "2x Rice (50kg bag), 1x Eggs (crate of 30)". */
export function formatItems(
  items: ReadonlyArray<{ sku: string; quantity: number }>,
  catalog: ReadonlyMap<string, string>,
): string {
  return items.map((item) => `${item.quantity}x ${catalog.get(item.sku) ?? item.sku}`).join(', ')
}
