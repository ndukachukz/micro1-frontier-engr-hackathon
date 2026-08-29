# case_01_clean_order — baseline trajectory

- **Category**: happy_path
- **Customer**: Ngozi A. (`2348000000101`)
- **Verdict**: **FAIL**

## What the customer sent

**Inbound message**:

> Hi, I'd like 2 bags of rice and 1 crate of eggs please

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
"Hi, I'd like 2 bags of rice and 1 crate of eggs please"
```

## Run log (what the agent did, in order)

### 1. `single-call-parse` — LlmClient

- Started: 2026-08-29T13:55:59.551Z · Duration: 3491 ms

**Input**:

```json
{
  "message": {
    "type": "text",
    "timestamp": "2026-08-27T09:12:00Z",
    "text": "Hi, I'd like 2 bags of rice and 1 crate of eggs please"
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
        "sku": "bag of rice",
        "quantity": 2
      },
      {
        "sku": "crate of eggs",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "low"
  },
  "payment_status": "n/a",
  "matched_payment_id": null,
  "flags": [
    "no_prices_provided",
    "specific_skus_not_confirmed"
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
        "sku": "bag of rice",
        "quantity": 2
      },
      {
        "sku": "crate of eggs",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "low"
  },
  "payment_status": "n/a",
  "matched_payment_id": null,
  "flags": [
    "no_prices_provided",
    "specific_skus_not_confirmed"
  ]
}
```

**Fields that differed from expected**: action, order, payment_status, flags.

- Expected: `await_payment` / payment `unconfirmed`
- Actual: `needs_clarification` / payment `n/a`

No customer reply was produced for this run.
