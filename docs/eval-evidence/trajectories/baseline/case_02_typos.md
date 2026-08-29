# case_02_typos — baseline trajectory

- **Category**: noisy_input
- **Customer**: Bola O. (`2348000000102`)
- **Verdict**: **FAIL**

## What the customer sent

**Inbound message**:

> 2 bags of rise pls, and 1 crat eggs, thanx

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
"2 bags of rise pls, and 1 crat eggs, thanx"
```

## Run log (what the agent did, in order)

### 1. `single-call-parse` — LlmClient

- Started: 2026-08-29T13:56:03.045Z · Duration: 2072 ms

**Input**:

```json
{
  "message": {
    "type": "text",
    "timestamp": "2026-08-27T09:20:00Z",
    "text": "2 bags of rise pls, and 1 crat eggs, thanx"
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
        "sku": "rice",
        "quantity": 2
      },
      {
        "sku": "crate eggs",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "medium"
  },
  "payment_status": "unconfirmed",
  "matched_payment_id": null,
  "flags": [
    "ambiguous_pricing"
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
  "action": "needs_clarification",
  "order": {
    "items": [
      {
        "sku": "rice",
        "quantity": 2
      },
      {
        "sku": "crate eggs",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "medium"
  },
  "payment_status": "unconfirmed",
  "matched_payment_id": null,
  "flags": [
    "ambiguous_pricing"
  ]
}
```

**Fields that differed from expected**: action, order, flags.

- Expected: `await_payment` / payment `unconfirmed`
- Actual: `needs_clarification` / payment `unconfirmed`

No customer reply was produced for this run.
