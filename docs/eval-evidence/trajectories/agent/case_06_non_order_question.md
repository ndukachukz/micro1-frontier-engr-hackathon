# case_06_non_order_question — agent trajectory

- **Category**: not_an_order
- **Customer**: Tunde S. (`2348000000106`)
- **Verdict**: **PASS**

## What the customer sent

**Inbound message**:

> What time do you close today?

## What the agent was instructed

The agent pipeline: extraction (LLM proposal) → deterministic verification (stock + payment tool calls in code) → decision. The LLM proposes; code disposes.

**System prompt** (verbatim):

```
You are Chata, the order-intake assistant for Chata Stores, a grocery vendor in Lagos, Nigeria.

You read one inbound WhatsApp message and produce a strict JSON decision.

Rules:
1. Map every item the customer mentions to exactly one SKU from the catalog (handle typos, abbreviations, and Nigerian Pidgin). Use quantity >= 1 for each item.
2. Compute total_ngn yourself: sum(price_ngn * quantity) using catalog prices only. Never invent prices.
3. If the message is a genuine order -> action "await_payment". A message that both orders items and reports/mentions a payment is still a genuine order — extract the order.
4. If the message mentions an item but no quantity (e.g. "Do you have rice?") -> action "needs_clarification", order null, flags ["no_quantity_specified", "ambiguous_intent"]. Never guess quantities.
5. If the message is not about ordering (greetings, questions about the shop) -> action "no_order", order null, flags [].
6. If the message is unintelligible (gibberish, only emojis) -> action "no_order", order null, flags ["unintelligible_input"]. Never guess.
7. If the message cancels a previous order, use the conversation history to rebuild the affected order: action "cancel_order", include the order with reconstructed_from_history: true.
8. If the customer says "same as last time" (or similar) and the history contains their previous order, rebuild it: action "await_payment" with reconstructed_from_history: true.
9. Set confidence "medium" whenever you set reconstructed_from_history true (rebuilt orders, including cancellations) or when you had to genuinely guess an item, a quantity, or the intent. Any Nigerian Pidgin message (e.g. "Abeg I wan order...") is interpreted phrasing — use "medium". Typos, misspellings, and abbreviations in otherwise standard English that map unambiguously to a catalog item are NOT guessing — use "high" for them. Never use "low" when you produced a concrete order.
10. Stock availability, payments, and replies are handled by other parts of the system — do NOT reason about them. Never withhold or soften an order because stock might be unavailable or payment might fail: always extract the items requested and let the system verify stock and payments. Do NOT add payment-related or stock-related flags.

Respond with ONLY JSON matching this shape:
{
  "action": "await_payment" | "needs_clarification" | "cancel_order" | "no_order",
  "order": {
    "items": [{ "sku": "<catalog sku>", "quantity": 1 }],
    "total_ngn": 0,
    "confidence": "high" | "medium" | "low",
    "reconstructed_from_history": true
  } | null,
  "flags": ["..."]
}
```

**User prompt** (verbatim — catalog + conversation history + message):

```
CATALOG: [{"sku":"RICE_BAG","name":"Rice (50kg bag)","price_ngn":45000,"stock":12},{"sku":"EGGS_CRATE","name":"Eggs (crate of 30)","price_ngn":3500,"stock":20},{"sku":"BEANS_BUCKET","name":"Beans (paint bucket)","price_ngn":8000,"stock":15},{"sku":"GARRI_BAG","name":"Garri (25kg bag)","price_ngn":15000,"stock":0},{"sku":"OIL_5L","name":"Vegetable oil (5L)","price_ngn":12000,"stock":25},{"sku":"TOMATOES_BASKET","name":"Tomatoes (basket)","price_ngn":9000,"stock":8},{"sku":"SEMO_5KG","name":"Semovita (5kg)","price_ngn":6500,"stock":10},{"sku":"GAS_12KG","name":"Cooking gas refill (12.5kg)","price_ngn":13500,"stock":0}]
CONVERSATION HISTORY:
(none)
NEW MESSAGE (2026-08-27T09:50:00Z, type text):
"What time do you close today?"
```

## Run log (what the agent did, in order)

### 1. `extract-order` — LlmClient

- Started: 2026-08-29T13:56:39.703Z · Duration: 1328 ms

**Input**:

```json
{
  "message": {
    "type": "text",
    "timestamp": "2026-08-27T09:50:00Z",
    "text": "What time do you close today?"
  },
  "history_turns": 0
}
```

**Output**:

```json
{
  "action": "no_order",
  "order": null,
  "flags": []
}
```

### 2. `verify-and-decide` — StockTool+PaymentTool

- Started: 2026-08-29T13:56:41.031Z · Duration: 0 ms

**Input**:

```json
{
  "extraction": {
    "action": "no_order",
    "order": null,
    "flags": []
  }
}
```

**Output**:

```json
{
  "action": "no_order",
  "order": null,
  "payment_status": "n/a",
  "matched_payment_id": null,
  "flags": []
}
```


## Outcome

**Expected output**:

```json
{
  "action": "no_order",
  "order": null,
  "payment_status": "n/a",
  "flags": []
}
```

**Actual output**:

```json
{
  "action": "no_order",
  "order": null,
  "payment_status": "n/a",
  "matched_payment_id": null,
  "flags": []
}
```

Every scored field matched the expected output.

No customer reply was produced for this run.
