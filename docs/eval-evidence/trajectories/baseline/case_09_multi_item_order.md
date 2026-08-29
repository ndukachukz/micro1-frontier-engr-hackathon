# case_09_multi_item_order — baseline trajectory

- **Category**: happy_path
- **Customer**: Ifeoma R. (`2348000000109`)
- **Verdict**: **FAIL**

## What the customer sent

**Inbound message**:

> 3 bags rice, 2 crates eggs, 1 bucket beans, and 2 semovita please

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
"3 bags rice, 2 crates eggs, 1 bucket beans, and 2 semovita please"
```

## Run log (what the agent did, in order)

### 1. `single-call-parse` — LlmClient

- Started: 2026-08-29T13:56:17.813Z · Duration: 3464 ms

**Input**:

```json
{
  "message": {
    "type": "text",
    "timestamp": "2026-08-27T10:02:00Z",
    "text": "3 bags rice, 2 crates eggs, 1 bucket beans, and 2 semovita please"
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
        "quantity": 3
      },
      {
        "sku": "eggs",
        "quantity": 2
      },
      {
        "sku": "beans",
        "quantity": 1
      },
      {
        "sku": "semovita",
        "quantity": 2
      }
    ],
    "total_ngn": 0,
    "confidence": "medium"
  },
  "payment_status": "n/a",
  "matched_payment_id": null,
  "flags": [
    "no_payment_mentioned",
    "missing_prices"
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
        "quantity": 3
      },
      {
        "sku": "EGGS_CRATE",
        "quantity": 2
      },
      {
        "sku": "BEANS_BUCKET",
        "quantity": 1
      },
      {
        "sku": "SEMO_5KG",
        "quantity": 2
      }
    ],
    "total_ngn": 163000,
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
        "quantity": 3
      },
      {
        "sku": "eggs",
        "quantity": 2
      },
      {
        "sku": "beans",
        "quantity": 1
      },
      {
        "sku": "semovita",
        "quantity": 2
      }
    ],
    "total_ngn": 0,
    "confidence": "medium"
  },
  "payment_status": "n/a",
  "matched_payment_id": null,
  "flags": [
    "no_payment_mentioned",
    "missing_prices"
  ]
}
```

**Fields that differed from expected**: action, order, payment_status, flags.

- Expected: `await_payment` / payment `unconfirmed`
- Actual: `needs_clarification` / payment `n/a`

No customer reply was produced for this run.
