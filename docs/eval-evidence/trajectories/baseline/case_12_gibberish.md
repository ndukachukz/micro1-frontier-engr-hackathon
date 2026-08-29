# case_12_gibberish — baseline trajectory

- **Category**: edge_case
- **Customer**: Unknown (`2348000000112`)
- **Verdict**: **PASS**

## What the customer sent

**Inbound message**:

> 😂😂 kjkjk asdkj?? 🙌

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
"😂😂 kjkjk asdkj?? 🙌"
```

## Run log (what the agent did, in order)

### 1. `single-call-parse` — LlmClient

- Started: 2026-08-29T13:56:25.058Z · Duration: 1819 ms

**Input**:

```json
{
  "message": {
    "type": "text",
    "timestamp": "2026-08-27T12:00:00Z",
    "text": "😂😂 kjkjk asdkj?? 🙌"
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
  "flags": [
    "unintelligible_input"
  ]
}
```


## Outcome

**Expected output**:

```json
{
  "action": "no_order",
  "order": null,
  "payment_status": "n/a",
  "flags": [
    "unintelligible_input"
  ]
}
```

**Actual output**:

```json
{
  "action": "no_order",
  "order": null,
  "payment_status": "n/a",
  "matched_payment_id": null,
  "flags": [
    "unintelligible_input"
  ]
}
```

Every scored field matched the expected output.

No customer reply was produced for this run.
