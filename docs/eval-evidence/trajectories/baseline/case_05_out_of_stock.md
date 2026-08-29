# case_05_out_of_stock — baseline trajectory

- **Category**: stock_check
- **Customer**: Chidi E. (`2348000000105`)
- **Verdict**: **FAIL**

## What the customer sent

**Inbound message**:

> I need 1 bag of garri today

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
"I need 1 bag of garri today"
```

## Run log (what the agent did, in order)

### 1. `single-call-parse` — LlmClient

- Started: 2026-08-29T13:56:09.596Z · Duration: 2464 ms

**Input**:

```json
{
  "message": {
    "type": "text",
    "timestamp": "2026-08-27T09:45:00Z",
    "text": "I need 1 bag of garri today"
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
        "sku": "garri",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "high"
  },
  "payment_status": "unconfirmed",
  "matched_payment_id": null,
  "flags": []
}
```


## Outcome

**Expected output**:

```json
{
  "action": "flag_for_review",
  "order": {
    "items": [
      {
        "sku": "GARRI_BAG",
        "quantity": 1
      }
    ],
    "total_ngn": 15000,
    "confidence": "high"
  },
  "payment_status": "n/a",
  "flags": [
    "item_out_of_stock"
  ]
}
```

**Actual output**:

```json
{
  "action": "await_payment",
  "order": {
    "items": [
      {
        "sku": "garri",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "high"
  },
  "payment_status": "unconfirmed",
  "matched_payment_id": null,
  "flags": []
}
```

**Fields that differed from expected**: action, order, payment_status, flags.

- Expected: `flag_for_review` / payment `n/a`
- Actual: `await_payment` / payment `unconfirmed`

No customer reply was produced for this run.
