# case_11_pidgin — baseline trajectory

- **Category**: noisy_input
- **Customer**: Blessing U. (`2348000000111`)
- **Verdict**: **FAIL**

## What the customer sent

**Inbound message**:

> Abeg I wan order 3 basket tomato and 1 oil make dem bring am today

## What the agent was instructed

The baseline gets **one prompt, no tools, no verification, no memory** — the message text only.

**System prompt** (verbatim):

```
Parse the following WhatsApp message into JSON describing the customer's order.

Respond with ONLY JSON matching this shape:
{
  "action": "await_payment" | "confirm_order" | "flag_for_review" | "needs_clarification" | "cancel_order" | "no_order",
  "order": { "items": [{ "sku": "<item name>", "quantity": 1 }], "total_ngn": 0, "confidence": "high" | "medium" | "low" } | null,
  "payment_status": "unconfirmed" | "matched" | "mismatched" | "n/a",
  "matched_payment_id": null,
  "flags": []
}

Rules:
- Infer items and quantities from the message text.
- If a payment amount is mentioned and appears sufficient for the order, set action "confirm_order" and payment_status "matched"; otherwise use action "await_payment" with payment_status "unconfirmed".
- If the message is not an order, use action "no_order" with order null and payment_status "n/a".
- If intent is unclear, use action "needs_clarification".
- If the message is unintelligible, use action "no_order" and add the flag "unintelligible_input".
```

**User prompt** (verbatim):

```
MESSAGE (type text):
"Abeg I wan order 3 basket tomato and 1 oil make dem bring am today"
```

## Run log (what the agent did, in order)

### 1. `single-call-parse` — LlmClient

- Started: 2026-08-29T13:56:22.808Z · Duration: 2248 ms

**Input**:

```json
{
  "message": {
    "type": "text",
    "timestamp": "2026-08-27T10:35:00Z",
    "text": "Abeg I wan order 3 basket tomato and 1 oil make dem bring am today"
  }
}
```

**Output**:

```json
{
  "action": "needs_clarification",
  "order": {
    "items": [
      {
        "sku": "basket tomato",
        "quantity": 3
      },
      {
        "sku": "oil",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "medium"
  },
  "payment_status": "n/a",
  "matched_payment_id": null,
  "flags": [
    "unclear_item_specification",
    "no_payment_mentioned",
    "ambiguous_delivery_time"
  ]
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
        "sku": "TOMATOES_BASKET",
        "quantity": 3
      },
      {
        "sku": "OIL_5L",
        "quantity": 1
      }
    ],
    "total_ngn": 39000,
    "confidence": "medium"
  },
  "payment_status": "unconfirmed",
  "flags": []
}
```

**Actual output**:

```json
{
  "action": "needs_clarification",
  "order": {
    "items": [
      {
        "sku": "basket tomato",
        "quantity": 3
      },
      {
        "sku": "oil",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "medium"
  },
  "payment_status": "n/a",
  "matched_payment_id": null,
  "flags": [
    "unclear_item_specification",
    "no_payment_mentioned",
    "ambiguous_delivery_time"
  ]
}
```

**Fields that differed from expected**: action, order, payment_status, flags.

- Expected: `await_payment` / payment `unconfirmed`
- Actual: `needs_clarification` / payment `n/a`

No customer reply was produced for this run.
