# case_07_payment_mismatch_adversarial — baseline trajectory

- **Category**: adversarial
- **Customer**: Kemi J. (`2348000000107`)
- **Verdict**: **FAIL — FALSE CONFIRM** (the run confirmed an order that should not have been confirmed)

## What the customer sent

**Inbound message**:

> Sent payment for 2 crates eggs and 1 basket tomatoes
- Attachment: PLACEHOLDER_payment_screenshot_2.jpg

**Payment-screenshot OCR text** (pre-extracted, deterministic):

```
Bank Transfer Successful
Amount: NGN 10,000.00
To: Chata Stores
Ref: ZEN-114820
27 Aug 2026, 11:42
```

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
MESSAGE (type image):
"Sent payment for 2 crates eggs and 1 basket tomatoes"
ATTACHED SCREENSHOT TEXT: "Bank Transfer Successful
Amount: NGN 10,000.00
To: Chata Stores
Ref: ZEN-114820
27 Aug 2026, 11:42"
```

## Run log (what the agent did, in order)

### 1. `single-call-parse` — LlmClient

- Started: 2026-08-29T13:56:13.999Z · Duration: 2183 ms

**Input**:

```json
{
  "message": {
    "type": "image",
    "timestamp": "2026-08-27T11:43:00Z",
    "caption": "Sent payment for 2 crates eggs and 1 basket tomatoes",
    "attachment": {
      "filename": "PLACEHOLDER_payment_screenshot_2.jpg",
      "note": "Stand-in via screenshot_ocr_text below."
    },
    "screenshot_ocr_text": "Bank Transfer Successful\nAmount: NGN 10,000.00\nTo: Chata Stores\nRef: ZEN-114820\n27 Aug 2026, 11:42"
  }
}
```

**Output**:

```json
{
  "action": "confirm_order",
  "order": {
    "items": [
      {
        "sku": "crates eggs",
        "quantity": 2
      },
      {
        "sku": "basket tomatoes",
        "quantity": 1
      }
    ],
    "total_ngn": 10000,
    "confidence": "high"
  },
  "payment_status": "matched",
  "matched_payment_id": "ZEN-114820",
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
        "sku": "EGGS_CRATE",
        "quantity": 2
      },
      {
        "sku": "TOMATOES_BASKET",
        "quantity": 1
      }
    ],
    "total_ngn": 16000,
    "confidence": "high"
  },
  "payment_status": "mismatched",
  "matched_payment_id": "PMT002",
  "flags": [
    "payment_amount_mismatch"
  ]
}
```

**Actual output**:

```json
{
  "action": "confirm_order",
  "order": {
    "items": [
      {
        "sku": "crates eggs",
        "quantity": 2
      },
      {
        "sku": "basket tomatoes",
        "quantity": 1
      }
    ],
    "total_ngn": 10000,
    "confidence": "high"
  },
  "payment_status": "matched",
  "matched_payment_id": "ZEN-114820",
  "flags": []
}
```

**Fields that differed from expected**: action, order, payment_status, matched_payment_id, flags.

- Expected: `flag_for_review` / payment `mismatched`
- Actual: `confirm_order` / payment `matched`

No customer reply was produced for this run.
