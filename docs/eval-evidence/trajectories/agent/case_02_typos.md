# case_02_typos — agent trajectory

- **Category**: noisy_input
- **Customer**: Bola O. (`2348000000102`)
- **Verdict**: **PASS**

## What the customer sent

**Inbound message**:

> 2 bags of rise pls, and 1 crat eggs, thanx

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
NEW MESSAGE (2026-08-27T09:20:00Z, type text):
"2 bags of rise pls, and 1 crat eggs, thanx"
```

## Run log (what the agent did, in order)

### 1. `extract-order` — LlmClient

- Started: 2026-08-29T13:56:31.203Z · Duration: 2554 ms

**Input**:

```json
{
  "message": {
    "type": "text",
    "timestamp": "2026-08-27T09:20:00Z",
    "text": "2 bags of rise pls, and 1 crat eggs, thanx"
  },
  "history_turns": 0
}
```

**Output**:

```json
{
  "action": "await_payment",
  "order": {
    "items": [
      {
        "sku": "RICE_BAG",
        "quantity": 2
      },
      {
        "sku": "EGGS_CRATE",
        "quantity": 1
      }
    ],
    "total_ngn": 93500,
    "confidence": "high",
    "reconstructed_from_history": false
  },
  "flags": []
}
```

### 2. `verify:stock-lookup` — StockTool

- Started: 2026-08-29T13:56:33.758Z · Duration: 0 ms

**Input**:

```json
{
  "sku": "RICE_BAG",
  "quantity": 2
}
```

**Output**:

```json
{
  "found": true,
  "sku": "RICE_BAG",
  "price_ngn": 45000,
  "stock": 12,
  "available": true
}
```

### 3. `verify:stock-lookup` — StockTool

- Started: 2026-08-29T13:56:33.758Z · Duration: 0 ms

**Input**:

```json
{
  "sku": "EGGS_CRATE",
  "quantity": 1
}
```

**Output**:

```json
{
  "found": true,
  "sku": "EGGS_CRATE",
  "price_ngn": 3500,
  "stock": 20,
  "available": true
}
```

### 4. `verify-and-decide` — StockTool+PaymentTool

- Started: 2026-08-29T13:56:33.757Z · Duration: 1 ms

**Input**:

```json
{
  "extraction": {
    "action": "await_payment",
    "order": {
      "items": [
        {
          "sku": "RICE_BAG",
          "quantity": 2
        },
        {
          "sku": "EGGS_CRATE",
          "quantity": 1
        }
      ],
      "total_ngn": 93500,
      "confidence": "high",
      "reconstructed_from_history": false
    },
    "flags": []
  }
}
```

**Output**:

```json
{
  "action": "await_payment",
  "order": {
    "items": [
      {
        "sku": "RICE_BAG",
        "quantity": 2
      },
      {
        "sku": "EGGS_CRATE",
        "quantity": 1
      }
    ],
    "total_ngn": 93500,
    "confidence": "high",
    "reconstructed_from_history": false
  },
  "payment_status": "unconfirmed",
  "matched_payment_id": null,
  "flags": []
}
```

### 5. `send-reply` — ReplySender

- Started: 2026-08-29T13:56:33.758Z · Duration: 0 ms

**Input**:

```json
{
  "waId": "2348000000102",
  "text": "Got it! 2x Rice (50kg bag), 1x Eggs (crate of 30) — total ₦ 93,500. We'll confirm once payment is received."
}
```

**Output**:

```json
{
  "delivered": false
}
```


## Outcome

**Expected output**:

```json
{
  "action": "await_payment",
  "order": {
    "items": [
      {
        "sku": "RICE_BAG",
        "quantity": 2
      },
      {
        "sku": "EGGS_CRATE",
        "quantity": 1
      }
    ],
    "total_ngn": 93500,
    "confidence": "high"
  },
  "payment_status": "unconfirmed",
  "flags": []
}
```

**Actual output**:

```json
{
  "action": "await_payment",
  "order": {
    "items": [
      {
        "sku": "RICE_BAG",
        "quantity": 2
      },
      {
        "sku": "EGGS_CRATE",
        "quantity": 1
      }
    ],
    "total_ngn": 93500,
    "confidence": "high",
    "reconstructed_from_history": false
  },
  "payment_status": "unconfirmed",
  "matched_payment_id": null,
  "flags": []
}
```

Every scored field matched the expected output.

**Reply sent to the customer**:

> Got it! 2x Rice (50kg bag), 1x Eggs (crate of 30) — total ₦ 93,500. We'll confirm once payment is received.
