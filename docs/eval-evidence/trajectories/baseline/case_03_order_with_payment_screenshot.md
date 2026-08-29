# case_03_order_with_payment_screenshot — baseline trajectory

- **Category**: payment_match
- **Customer**: Adaeze O. (`2348000000103`)
- **Verdict**: **FAIL**

## What the customer sent

**Inbound message**:

> Order: 1 bucket beans, 1 oil (5L). Payment attached ✅
- Attachment: PLACEHOLDER_payment_screenshot_1.jpg

**Payment-screenshot OCR text** (pre-extracted, deterministic):

```
Bank Transfer Successful
Amount: NGN 20,000.00
To: Chata Stores
Ref: GTB-887421
27 Aug 2026, 10:16
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
"Order: 1 bucket beans, 1 oil (5L). Payment attached ✅"
ATTACHED SCREENSHOT TEXT: "Bank Transfer Successful
Amount: NGN 20,000.00
To: Chata Stores
Ref: GTB-887421
27 Aug 2026, 10:16"
```

## Run log (what the agent did, in order)

### 1. `single-call-parse` — LlmClient

- Started: 2026-08-29T13:56:05.119Z · Duration: 2432 ms

**Input**:

```json
{
  "message": {
    "type": "image",
    "timestamp": "2026-08-27T10:17:00Z",
    "caption": "Order: 1 bucket beans, 1 oil (5L). Payment attached ✅",
    "attachment": {
      "filename": "PLACEHOLDER_payment_screenshot_1.jpg",
      "note": "Replace with a real synthetic screenshot before wiring up vision. Until then, use screenshot_ocr_text below as a stand-in for the vision extraction."
    },
    "screenshot_ocr_text": "Bank Transfer Successful\nAmount: NGN 20,000.00\nTo: Chata Stores\nRef: GTB-887421\n27 Aug 2026, 10:16"
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
        "sku": "bucket beans",
        "quantity": 1
      },
      {
        "sku": "oil (5L)",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "medium"
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
  "action": "confirm_order",
  "order": {
    "items": [
      {
        "sku": "BEANS_BUCKET",
        "quantity": 1
      },
      {
        "sku": "OIL_5L",
        "quantity": 1
      }
    ],
    "total_ngn": 20000,
    "confidence": "high"
  },
  "payment_status": "matched",
  "matched_payment_id": "PMT001",
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
        "sku": "bucket beans",
        "quantity": 1
      },
      {
        "sku": "oil (5L)",
        "quantity": 1
      }
    ],
    "total_ngn": 0,
    "confidence": "medium"
  },
  "payment_status": "unconfirmed",
  "matched_payment_id": null,
  "flags": []
}
```

**Fields that differed from expected**: action, order, payment_status, matched_payment_id.

- Expected: `confirm_order` / payment `matched`
- Actual: `await_payment` / payment `unconfirmed`

No customer reply was produced for this run.
